// Jestora sunucu v0.1 — sıfır bağımlılık (Node 22+). Çalıştır: node server.js
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +process.env.PORT || 3000;
const DEV = process.env.JEST_DEV === '1';                 // geliştirme: SMS ve yaş belirteci taklit
const SECRET = process.env.JEST_SECRET || 'dev-secret-degistir';
const ADMIN_KEY = process.env.JEST_ADMIN_KEY || 'admin-dev';
const COMMISSION = +process.env.JEST_COMMISSION || 8;     // TL, onaylanan her jest için mekândan
// Kapalı pilot: JEST_KAPALI=1 ve JEST_KODLAR=KOD1,KOD2 ile yalnızca kodu olan kayıt olur. Kayıtlı üye girişi etkilenmez.
const CODES = (process.env.JEST_KODLAR || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
// Pilot kipi (JEST_PILOT=1): SMS yok. JEST_KODLAR içindeki her kod bir kişiye verilir (6-8 hane, rakam); ilk kullanan numaraya bağlanır, giriş kodu olarak da o kullanılır.
const PILOT = process.env.JEST_PILOT === '1';
const CLOSED = process.env.JEST_KAPALI === '1' || PILOT || (DEV && CODES.length > 0);
const pilotFails = new Map();
function pinHash(p) { const salt = crypto.randomBytes(8).toString('hex'); return salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex'); }
function pinOk(p, h) { const [salt, x] = h.split(':'); const y = crypto.scryptSync(p, salt, 32).toString('hex'); return x.length === y.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(y)); }
function titleTR(s) { return s.split(' ').map(w => w ? w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr') : w).join(' '); }   // adlar "Ad Soyad" biçimine
const db = new DatabaseSync(process.env.JEST_DB || path.join(__dirname, 'jest.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, phone TEXT UNIQUE, name TEXT, username TEXT UNIQUE, created INTEGER);
CREATE TABLE IF NOT EXISTS codes(phone TEXT PRIMARY KEY, code TEXT, exp INTEGER, tries INTEGER DEFAULT 0, sent INTEGER);
CREATE TABLE IF NOT EXISTS invite_pending(id INTEGER PRIMARY KEY, invite_id INTEGER, host_id INTEGER, phone TEXT, token TEXT UNIQUE, used INTEGER DEFAULT 0, created INTEGER);
CREATE TABLE IF NOT EXISTS pilot_codes(code TEXT PRIMARY KEY, phone TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created INTEGER);
CREATE TABLE IF NOT EXISTS venues(id INTEGER PRIMARY KEY, name TEXT, district TEXT, normal INTEGER, jest INTEGER, key TEXT);
CREATE TABLE IF NOT EXISTS invites(id INTEGER PRIMARY KEY, host_id INTEGER, venue_id INTEGER, at INTEGER, status TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS guests(invite_id INTEGER, user_id INTEGER, status TEXT, proposal_at INTEGER, PRIMARY KEY(invite_id,user_id));
CREATE TABLE IF NOT EXISTS scans(invite_id INTEGER, user_id INTEGER, at INTEGER, PRIMARY KEY(invite_id,user_id));
CREATE TABLE IF NOT EXISTS commissions(invite_id INTEGER PRIMARY KEY, venue_id INTEGER, amount INTEGER, month TEXT, created INTEGER);
`);
try { db.exec('ALTER TABLE users ADD COLUMN pin TEXT'); } catch (e) {}
// v12: hedef jesti, üye olmayan yer (konum bul), buluşma fotoğrafı
for (const c of ["kind TEXT DEFAULT 'meet'", 'goal TEXT', 'dir TEXT', 'goal_status TEXT', 'goal_note TEXT', 'place_name TEXT', 'place_url TEXT', 'place_lat REAL', 'place_lng REAL']) { try { db.exec('ALTER TABLE invites ADD COLUMN ' + c); } catch (e) {} }
db.exec('CREATE TABLE IF NOT EXISTS photos(invite_id INTEGER, user_id INTEGER, at INTEGER, lat REAL, lng REAL, data TEXT, PRIMARY KEY(invite_id,user_id))');
const PHOTO_DAYS = +process.env.JEST_FOTO_GUN || 7;   // buluşma fotoğrafları davet saatinden bu kadar gün sonra silinir
if (!db.prepare('SELECT COUNT(*) c FROM venues').get().c) {
  const ins = db.prepare('INSERT INTO venues(name,district,normal,jest,key) VALUES(?,?,?,?,?)');
  [['Moda Kahve','Kadıköy',100,80],['Karaköy Çay Evi','Beyoğlu',90,72],['Bostancı Fırın','Kadıköy',70,56]]
    .forEach(v => ins.run(v[0], v[1], v[2], v[3], process.env.JEST_DEV === '1' ? 'venue-' + v[0].split(' ')[0].toLowerCase() : crypto.randomBytes(12).toString('hex')));
}

const now = () => Date.now();
const hmac = s => crypto.createHmac('sha256', SECRET).update(s).digest('hex').slice(0, 24);
const normPhone = p => { p = String(p || '').replace(/[^\d+]/g, ''); if (/^0\d{10}$/.test(p)) p = '+9' + p; else if (/^5\d{9}$/.test(p)) p = '+90' + p; else if (/^90\d{10}$/.test(p)) p = '+' + p; return /^\+\d{10,14}$/.test(p) ? p : null; };
const err = (code, msg) => Object.assign(new Error(msg), { code });
const ok = (res, o, c = 200) => { res.writeHead(c, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(o)); };

const SESSION_MS = 30 * 86400000;                          // oturum 30 gün geçerli
function auth(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const u = t && db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.created>?').get(t, now() - SESSION_MS);
  if (!u) throw err(401, 'Giriş gerekli');
  return u;
}
function venueAuth(req) {
  const v = db.prepare('SELECT * FROM venues WHERE key=?').get(req.headers['x-venue-key'] || '');
  if (!v) throw err(401, 'Mekan anahtarı geçersiz');
  return v;
}
const asciiU = t => t.toLocaleLowerCase('tr').replace(/[ğıöüşçâîû]/g, c => ({ ğ: 'g', ı: 'i', ö: 'o', ü: 'u', ş: 's', ç: 'c', â: 'a', î: 'i', û: 'u' }[c])).replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').slice(0, 26) || 'kullanici';
function newUsername(name) {
  let b = asciiU(name), u = b;
  while (db.prepare('SELECT 1 FROM users WHERE username=?').get(u)) u = b + Math.floor(10 + Math.random() * 90);
  return u;
}
const pubUser = u => ({ id: u.id, name: u.name, username: u.username });

const goalOk = i => i.kind !== 'goal' || i.goal_status === 'approved';
const photoCount = id => db.prepare('SELECT COUNT(*) c FROM photos WHERE invite_id=?').get(id).c;
function venueOf(i) {   // üye mekân ya da kullanıcının seçtiği (üye olmayan) yer
  if (i.venue_id > 0) { const v = db.prepare('SELECT * FROM venues WHERE id=?').get(i.venue_id); return { id: v.id, name: v.name, district: v.district, normal: v.normal, jest: v.jest, custom: false }; }
  return { id: 0, name: i.place_name || 'Seçilen yer', district: '', normal: 0, jest: 0, custom: true, url: i.place_url || '', lat: i.place_lat, lng: i.place_lng };
}
function inviteView(i, me) {
  const v = venueOf(i);
  const host = db.prepare('SELECT id,name,username FROM users WHERE id=?').get(i.host_id);
  const guests = db.prepare('SELECT g.user_id id,u.name,g.status,g.proposal_at FROM guests g JOIN users u ON u.id=g.user_id WHERE g.invite_id=?').all(i.id);
  const scans = db.prepare('SELECT user_id FROM scans WHERE invite_id=?').all(i.id).map(s => s.user_id);
  const invited = i.host_id === me.id ? db.prepare('SELECT phone,token FROM invite_pending WHERE invite_id=? AND used=0').all(i.id) : [];
  const achieverId = i.kind === 'goal' ? (i.dir === 'me' ? i.host_id : (guests[0] ? guests[0].id : null)) : null;
  const photos = db.prepare('SELECT user_id FROM photos WHERE invite_id=?').all(i.id).map(x => x.user_id);
  return { id: i.id, status: i.status, at: i.at, invited, host, venue: v, guests, scanned: scans,
    kind: i.kind || 'meet', goal: i.goal || '', dir: i.dir || '', goalStatus: i.goal_status || '', goalNote: i.goal_note || '', achieverId, goalOk: goalOk(i),
    photos, photoReady: photos.length > 0,
    role: me.id === i.host_id ? 'host' : 'guest' };
}
function myInvite(id, me) {
  const i = db.prepare('SELECT * FROM invites WHERE id=?').get(id);
  if (!i) throw err(404, 'Davet yok');
  if (i.host_id !== me.id && !db.prepare('SELECT 1 FROM guests WHERE invite_id=? AND user_id=?').get(id, me.id)) throw err(403, 'Bu davet senin değil');
  return i;
}

const hits = new Map();
function limited(ip, key, max) { const k = ip + key, t = now(), a = (hits.get(k) || []).filter(x => t - x < 60000); a.push(t); hits.set(k, a); if (hits.size > 5000) hits.clear(); return a.length > max; }
const routes = [];
const R = (m, p, f) => routes.push([m, new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), f]);

// ---- giriş: SMS kodu + 18 yaş belirteci ----
R('POST', '/api/code', async ({ body }) => {
  const phone = normPhone(body.phone); if (!phone) throw err(400, 'Telefon numarası geçersiz');
  if (PILOT) return { ok: true, pilot: true };
  const c = db.prepare('SELECT * FROM codes WHERE phone=?').get(phone);
  if (c && now() - c.sent < 30000) throw err(429, 'Kodu biraz sonra tekrar iste');
  const code = DEV ? '123456' : String(crypto.randomInt(100000, 1000000));
  db.prepare('INSERT OR REPLACE INTO codes(phone,code,exp,tries,sent) VALUES(?,?,?,0,?)').run(phone, code, now() + 300000, now());
  await sendSms(phone, `Jestora kodun: ${code}`);
  return DEV ? { ok: true, devCode: code } : { ok: true };
});
async function sendSms(phone, text) {            // Gerçek sağlayıcı seçilince yalnızca burası değişir.
  if (process.env.JEST_SMS_URL) await fetch(process.env.JEST_SMS_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (process.env.JEST_SMS_KEY || '') }, body: JSON.stringify({ to: phone, text }) });
  else console.log('[SMS]', phone, text);
}
const YAS_BEYAN = process.env.JEST_YAS_BEYAN === '1';   // Kapalı pilotta kurucunun tanıdığı yetişkinler için beyan; hukuki görüşe tabidir
async function ageVerified(token) {              // Gerçek: e-Devlet yaş belirteci doğrulaması (Başkanlık rehberi çıkınca)
  if (YAS_BEYAN && token === 'BEYAN') return true;
  if (DEV) return token === 'DEV-AGE-OK';
  return false;
}
R('POST', '/api/verify', async ({ body }) => {
  const phone = normPhone(body.phone); if (!phone) throw err(400, 'Telefon numarası geçersiz');
  let pilotPin = null;
  if (PILOT) {   // SMS yok: kayıtta ortak pilot kodu + kişinin seçtiği PIN; girişte telefon + PIN
    const f = (pilotFails.get(phone) || []).filter(x => now() - x < 600000);
    if (f.length >= 5) throw err(429, 'Çok fazla deneme. 10 dakika sonra tekrar dene.');
    pilotPin = String(body.code || '').trim();
    if (!/^\d{6,8}$/.test(pilotPin)) throw err(400, 'PIN 6 ile 8 rakamdan oluşmalı');
    const eu = db.prepare('SELECT * FROM users WHERE phone=?').get(phone);
    if (eu && eu.pin) {
      if (!pinOk(pilotPin, eu.pin)) { f.push(now()); pilotFails.set(phone, f); throw err(400, 'PIN yanlış'); }
    } else if (eu) {
      db.prepare('UPDATE users SET pin=? WHERE id=?').run(pinHash(pilotPin), eu.id);   // eski deneme hesabı: ilk girişte PIN belirlenir
    }
  } else {
  const c = db.prepare('SELECT * FROM codes WHERE phone=?').get(phone);
  if (!c || c.exp < now()) throw err(400, 'Kod süresi doldu');
  if (c.tries >= 5) throw err(429, 'Çok fazla deneme');
  if (c.code !== String(body.code)) { db.prepare('UPDATE codes SET tries=tries+1 WHERE phone=?').run(phone); throw err(400, 'Kod yanlış'); }
  }
  let linkRow = null;
  if (body.linkToken) {
    linkRow = db.prepare('SELECT * FROM invite_pending WHERE token=? AND used=0').get(String(body.linkToken));
    if (!linkRow) throw err(400, 'Davet linki geçersiz ya da daha önce kullanılmış');
    if (linkRow.phone !== phone) throw err(400, 'Bu davet başka bir telefon numarası için yazılmış');
  }
  let u = db.prepare('SELECT * FROM users WHERE phone=?').get(phone);
  if (!u) {
    const name = titleTR(String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 40)); if (name.length < 2) throw err(400, 'Adını yaz');
    if (CLOSED && !linkRow && !CODES.includes(String(body.inviteCode || '').trim().toUpperCase()) && !CODES.includes(String(body.inviteCode || '').trim())) throw err(403, 'Kapalı pilot: geçerli davet kodu gerekli');
    if (body.terms !== true) throw err(400, 'Metinleri onaylaman gerekir');
    if (!(await ageVerified(body.ageToken))) throw err(403, '18 yaş doğrulaması gerekli');
    const r = db.prepare('INSERT INTO users(phone,name,username,created,pin) VALUES(?,?,?,?,?)').run(phone, name, newUsername(name), now(), pilotPin ? pinHash(pilotPin) : null);
    u = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
    // bu numaraya yazılmış bekleyen tüm davetler (başka linklerle gönderilenler dahil) üye olunca kişinin önüne düşer, numara silinir
    db.prepare('SELECT * FROM invite_pending WHERE phone=? AND used=0').all(phone).forEach(pr => {
      if (pr.host_id !== u.id && !db.prepare('SELECT 1 FROM guests WHERE invite_id=? AND user_id=?').get(pr.invite_id, u.id)) db.prepare('INSERT INTO guests(invite_id,user_id,status) VALUES(?,?,?)').run(pr.invite_id, u.id, 'pending');
      db.prepare('DELETE FROM invite_pending WHERE id=?').run(pr.id);
    });
  }
  if (linkRow) {   // davet linkiyle gelen: davet kişinin önüne düşer
    if (!db.prepare('SELECT 1 FROM guests WHERE invite_id=? AND user_id=?').get(linkRow.invite_id, u.id)) db.prepare('INSERT INTO guests(invite_id,user_id,status) VALUES(?,?,?)').run(linkRow.invite_id, u.id, 'pending');
    db.prepare('DELETE FROM invite_pending WHERE id=?').run(linkRow.id);   // numara kullanılınca silinir
  }
  if (!PILOT) db.prepare('DELETE FROM codes WHERE phone=?').run(phone);
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions(token,user_id,created) VALUES(?,?,?)').run(token, u.id, now());
  return { token, user: pubUser(u) };
});
R('GET', '/api/config', () => ({ dev: DEV, closed: CLOSED, ageSelf: YAS_BEYAN, pilot: PILOT }));
R('GET', '/api/link/:token', ({ p }) => {   // davet linkine tıklayan, kayıt olmadan önce davetin özetini görür
  const r = db.prepare('SELECT * FROM invite_pending WHERE token=? AND used=0').get(p.token);
  if (!r) throw err(404, 'Davet linki geçersiz ya da daha önce kullanılmış');
  const i = db.prepare('SELECT * FROM invites WHERE id=?').get(r.invite_id);
  if (!i || i.status !== 'open') throw err(404, 'Bu davet artık geçerli değil');
  const v = venueOf(i), h = db.prepare('SELECT name FROM users WHERE id=?').get(i.host_id);
  return { host: h.name, venue: v.name, district: v.district, at: i.at, phoneEnd: r.phone.slice(-4), kind: i.kind || 'meet', goal: i.goal || '' };
});
R('GET', '/api/me', ({ req }) => ({ user: pubUser(auth(req)) }));
R('POST', '/api/logout', ({ req }) => { auth(req); db.prepare('DELETE FROM sessions WHERE token=?').run(req.headers.authorization.replace('Bearer ', '')); return { ok: true }; });

// Mağaza kuralı: uygulama içinden hesap silme (Apple 5.1.1(v), Google Play)
R('POST', '/api/me/delete', ({ req, body }) => {
  const me = auth(req);
  if (body.confirm !== 'SIL') throw err(400, 'Onay için SIL yaz');
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(me.id);
  db.prepare('DELETE FROM scans WHERE user_id=?').run(me.id);
  db.prepare('DELETE FROM photos WHERE user_id=?').run(me.id);
  db.prepare("UPDATE guests SET status='declined' WHERE user_id=? AND status IN ('pending','proposed')").run(me.id);
  db.prepare("UPDATE invites SET status='cancelled' WHERE host_id=? AND status='open'").run(me.id);
  db.prepare("UPDATE users SET phone='silindi-'||id, name='Silinmiş kullanıcı', username='silindi-'||id WHERE id=?").run(me.id);
  return { ok: true };
});

// ---- mekânlar ----
R('GET', '/api/venues', () => ({ venues: db.prepare('SELECT id,name,district,normal,jest FROM venues').all() }));

// ---- davetler ----
const LINK_LIMIT = +process.env.JEST_LINK_LIMIT || 5;   // pilotta üye başına, henüz üye olmayan en fazla kaç kişi davet edilebilir
const normTxt = t => String(t).toLocaleLowerCase('tr').replace(/[^\p{L}]/gu, '');
const BANNED = ['bahis', 'iddia', 'kumar', 'ceza', 'kaybet', 'borç', 'borc'];
const badText = t => BANNED.find(w => normTxt(t).includes(normTxt(w)));
function readPlace(body) {   // üye olmayan yer: ad (zorunlu), harita bağlantısı ve koordinat (isteğe bağlı)
  const pl = body.place || {}, name = String(pl.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (name.length < 2) throw err(400, 'Yerin adını yaz');
  if (badText(name)) throw err(400, 'Yer adında Jestora kurallarına aykırı bir ifade var');
  let url = String(pl.url || '').trim().slice(0, 400); if (url && !/^https?:\/\//i.test(url)) url = '';
  const lat = Number(pl.lat), lng = Number(pl.lng), okll = pl.lat != null && pl.lng != null && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return { name, url, lat: okll ? lat : null, lng: okll ? lng : null };
}
R('POST', '/api/invites', ({ req, body }) => {
  const me = auth(req);
  const custom = !(+body.venueId > 0);
  const v = custom ? null : db.prepare('SELECT * FROM venues WHERE id=?').get(+body.venueId);
  if (!custom && !v) throw err(400, 'Mekan seç');
  const pl = custom ? readPlace(body) : null;
  const kind = body.kind === 'goal' ? 'goal' : 'meet';
  let goal = '', dir = '';
  if (kind === 'goal') {
    goal = String(body.goal || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (goal.length < 3) throw err(400, 'Hedefi yaz (en az 3 harf)');
    if (badText(goal)) throw err(400, 'Hedefte Jestora kurallarına aykırı bir ifade var (bahis, ceza, borç yok)');
    dir = body.dir === 'you' ? 'you' : 'me';
  }
  const at = +body.at; if (!at || at < now() + 600000) throw err(400, 'Zaman geçmişte olamaz');
  const phones = [...new Set((body.guests || []).map(normPhone).filter(Boolean))].filter(p => p !== me.phone).slice(0, 5);
  if (!phones.length) throw err(400, 'En az bir kişi davet et');
  if (kind === 'goal' && phones.length !== 1) throw err(400, 'Hedef jesti tek kişiyle yapılır');
  const members = [], outsiders = [];
  phones.forEach(p => { const u = db.prepare('SELECT * FROM users WHERE phone=?').get(p); if (u) members.push(u); else outsiders.push(p); });
  // Aynı kişilere, aynı yer ve saatte daha önce davet atıldıysa yenisini açma, var olanı göster.
  for (const ex of db.prepare("SELECT * FROM invites WHERE host_id=? AND IFNULL(venue_id,0)=? AND at=? AND status='open' AND IFNULL(kind,'meet')=? AND IFNULL(goal,'')=? AND IFNULL(place_name,'')=?").all(me.id, custom ? 0 : v.id, at, kind, goal, custom ? pl.name : '')) {
    const gIds = new Set(db.prepare('SELECT user_id FROM guests WHERE invite_id=?').all(ex.id).map(x => x.user_id));
    const pPh = new Set(db.prepare('SELECT phone FROM invite_pending WHERE invite_id=? AND used=0').all(ex.id).map(x => x.phone));
    if (members.every(u => gIds.has(u.id)) && outsiders.every(p => pPh.has(p))) return inviteView(ex, me);
  }
  if (outsiders.length) {
    const open = db.prepare("SELECT COUNT(*) c FROM invite_pending WHERE host_id=?").get(me.id).c;
    if (open + outsiders.length > LINK_LIMIT) throw err(400, 'Pilotta en fazla ' + LINK_LIMIT + ' yeni kişi davet edebilirsin.');
  }
  const r = db.prepare('INSERT INTO invites(host_id,venue_id,at,status,created,kind,goal,dir,goal_status,place_name,place_url,place_lat,place_lng) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(me.id, custom ? 0 : v.id, at, 'open', now(), kind, goal || null, dir || null, kind === 'goal' ? 'active' : null, custom ? pl.name : null, custom ? pl.url : null, custom ? pl.lat : null, custom ? pl.lng : null);
  members.forEach(u => db.prepare('INSERT INTO guests(invite_id,user_id,status) VALUES(?,?,?)').run(r.lastInsertRowid, u.id, 'pending'));
  outsiders.forEach(p => db.prepare('INSERT INTO invite_pending(invite_id,host_id,phone,token,created) VALUES(?,?,?,?,?)').run(r.lastInsertRowid, me.id, p, crypto.randomBytes(12).toString('hex'), now()));
  return inviteView(db.prepare('SELECT * FROM invites WHERE id=?').get(r.lastInsertRowid), me);
});
R('GET', '/api/invites', ({ req }) => {
  const me = auth(req);
  const rows = db.prepare('SELECT DISTINCT i.* FROM invites i LEFT JOIN guests g ON g.invite_id=i.id WHERE i.host_id=? OR g.user_id=? ORDER BY i.at DESC').all(me.id, me.id);
  return { invites: rows.map(i => inviteView(i, me)) };
});
R('GET', '/api/invites/:id', ({ req, p }) => { const me = auth(req); return inviteView(myInvite(+p.id, me), me); });
R('POST', '/api/invites/:id/respond', ({ req, p, body }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.host_id === me.id) {                       // sahip, misafirin önerdiği saati kabul eder
    if (body.action !== 'accept-proposal') throw err(400, 'Geçersiz işlem');
    const g = db.prepare('SELECT * FROM guests WHERE invite_id=? AND user_id=? AND status=?').get(i.id, +body.guestId, 'proposed');
    if (!g) throw err(400, 'Öneri yok');
    db.prepare('UPDATE invites SET at=? WHERE id=?').run(g.proposal_at, i.id);
    db.prepare("UPDATE guests SET status='pending',proposal_at=NULL WHERE invite_id=?").run(i.id);
  } else {
    if (i.status !== 'open') throw err(400, 'Bu davet artık açık değil');
    if (body.action === 'accept') db.prepare("UPDATE guests SET status='accepted',proposal_at=NULL WHERE invite_id=? AND user_id=?").run(i.id, me.id);
    else if (body.action === 'decline') db.prepare("UPDATE guests SET status='declined' WHERE invite_id=? AND user_id=?").run(i.id, me.id);
    else if (body.action === 'propose') { const at = +body.at; if (!at || at < now() + 600000) throw err(400, 'Zaman geçmişte olamaz'); db.prepare("UPDATE guests SET status='proposed',proposal_at=? WHERE invite_id=? AND user_id=?").run(at, i.id, me.id); }
    else throw err(400, 'Geçersiz işlem');
  }
  return inviteView(i, me);
});
R('POST', '/api/invites/:id/edit', ({ req, p, body }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.host_id !== me.id) throw err(403, 'Yalnızca davet sahibi düzenler');
  if (i.status !== 'open') throw err(400, 'Bu davet düzenlenemez');
  const at = body.at ? +body.at : i.at;
  if (at < now() + 600000) throw err(400, 'Zaman geçmişte olamaz');
  if (body.place) {   // üye olmayan yere geç
    const pl = readPlace(body);
    db.prepare('UPDATE invites SET at=?, venue_id=0, place_name=?, place_url=?, place_lat=?, place_lng=? WHERE id=?').run(at, pl.name, pl.url, pl.lat, pl.lng, i.id);
  } else {
    const vid = body.venueId ? +body.venueId : i.venue_id;
    if (vid > 0 && !db.prepare('SELECT 1 FROM venues WHERE id=?').get(vid)) throw err(400, 'Mekan seç');
    db.prepare('UPDATE invites SET at=?, venue_id=? WHERE id=?').run(at, vid, i.id);
  }
  db.prepare("UPDATE guests SET status='pending', proposal_at=NULL WHERE invite_id=?").run(i.id);   // herkes yeniden yanıtlar
  db.prepare('DELETE FROM scans WHERE invite_id=?').run(i.id);
  db.prepare('DELETE FROM photos WHERE invite_id=?').run(i.id);   // yer ya da saat değişti: fotoğraf adımı baştan
  return inviteView(db.prepare('SELECT * FROM invites WHERE id=?').get(i.id), me);
});
R('POST', '/api/invites/:id/cancel', ({ req, p }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.host_id !== me.id) throw err(403, 'Yalnızca davet sahibi geri çeker');
  if (i.status !== 'open') throw err(400, 'Geri çekilemez');
  db.prepare("UPDATE invites SET status='cancelled' WHERE id=?").run(i.id);
  db.prepare('DELETE FROM invite_pending WHERE invite_id=?').run(i.id);
  db.prepare('DELETE FROM photos WHERE invite_id=?').run(i.id);
  return inviteView(db.prepare('SELECT * FROM invites WHERE id=?').get(i.id), me);
});

// ---- hedef jesti: hedef sahibi "yaptım" der, destekleyen onaylar; onaydan sonra buluşma adımları açılır ----
R('POST', '/api/invites/:id/goal', ({ req, p, body }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.kind !== 'goal') throw err(400, 'Bu bir hedef jesti değil');
  if (i.status !== 'open') throw err(400, 'Bu davet artık açık değil');
  const g = db.prepare("SELECT * FROM guests WHERE invite_id=? AND status='accepted'").get(i.id);
  if (!g) throw err(400, 'Önce davet kabul edilmeli');
  const achiever = i.dir === 'me' ? i.host_id : g.user_id, backer = i.dir === 'me' ? g.user_id : i.host_id;
  const act = body.action;
  if (act === 'claim') {
    if (me.id !== achiever) throw err(403, 'Hedefi yalnızca hedef sahibi bildirir');
    if (i.goal_status !== 'active') throw err(400, 'Hedef zaten bildirildi');
    const note = String(body.note || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (note && badText(note)) throw err(400, 'Notta Jestora kurallarına aykırı bir ifade var');
    db.prepare("UPDATE invites SET goal_status='claimed', goal_note=? WHERE id=?").run(note || null, i.id);
  } else if (act === 'approve') {
    if (me.id !== backer) throw err(403, 'Hedefi yalnızca destekleyen onaylar');
    if (i.goal_status !== 'claimed') throw err(400, 'Onaylanacak bir bildirim yok');
    db.prepare("UPDATE invites SET goal_status='approved' WHERE id=?").run(i.id);
  } else if (act === 'reopen') {
    if (me.id !== backer) throw err(403, 'Yalnızca destekleyen geri çevirir');
    if (i.goal_status !== 'claimed') throw err(400, 'Geri çevrilecek bildirim yok');
    db.prepare("UPDATE invites SET goal_status='active', goal_note=NULL WHERE id=?").run(i.id);
  } else throw err(400, 'Geçersiz işlem');
  return inviteView(db.prepare('SELECT * FROM invites WHERE id=?').get(i.id), me);
});

// ---- buluşma fotoğrafı: QR (ya da üye olmayan yerde "Buluştuk") ancak fotoğraf yüklenince açılır ----
const inMeetWindow = i => Math.abs(now() - i.at) <= 6 * 3600000;
function participant(i, me) {   // davet sahibi ya da daveti kabul etmiş misafir
  if (i.host_id === me.id) return true;
  const g = db.prepare('SELECT status FROM guests WHERE invite_id=? AND user_id=?').get(i.id, me.id);
  return !!g && g.status === 'accepted';
}
R('POST', '/api/invites/:id/photo', ({ req, p, body }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.status !== 'open') throw err(400, 'Bu davet artık açık değil');
  if (!participant(i, me)) throw err(403, 'Önce daveti kabul et');
  if (!db.prepare("SELECT 1 FROM guests WHERE invite_id=? AND status='accepted'").get(i.id)) throw err(400, 'Önce davet kabul edilmeli');
  if (!goalOk(i)) throw err(400, 'Önce hedefin onaylanması gerekir');
  if (!inMeetWindow(i)) throw err(400, 'Fotoğraf yalnızca jest saatinin 6 saat öncesi ve sonrası arasında yüklenir');
  if (body.consent !== true) throw err(400, 'Fotoğrafın jestin tarafları ile paylaşılmasını onaylaman gerekir');
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image || ''));
  if (!m) throw err(400, 'Fotoğraf okunamadı');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 500 || buf.length > 300000) throw err(400, 'Fotoğraf çok küçük ya da çok büyük');
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw err(400, 'Fotoğraf geçerli değil');
  const lat = Number(body.lat), lng = Number(body.lng), okll = body.lat != null && body.lng != null && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  db.prepare('INSERT OR REPLACE INTO photos(invite_id,user_id,at,lat,lng,data) VALUES(?,?,?,?,?,?)').run(i.id, me.id, now(), okll ? lat : null, okll ? lng : null, m[0]);
  return inviteView(i, me);
});
R('GET', '/api/invites/:id/photos', ({ req, p }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  return { photos: db.prepare('SELECT p.user_id id,u.name,p.at,p.data image FROM photos p JOIN users u ON u.id=p.user_id WHERE p.invite_id=? ORDER BY p.at').all(i.id) };
});
function maybeConfirm(i, extra) {   // sahip ve en az bir kabul eden misafir okutunca / "buluştuk" deyince onaylanır
  const hostIn = db.prepare('SELECT 1 FROM scans WHERE invite_id=? AND user_id=?').get(i.id, i.host_id);
  const guestIn = db.prepare("SELECT 1 FROM scans s JOIN guests g ON g.invite_id=s.invite_id AND g.user_id=s.user_id WHERE s.invite_id=? AND g.status='accepted'").get(i.id);
  let confirmed = i.status === 'confirmed';
  if (hostIn && guestIn && !confirmed) {
    db.prepare("UPDATE invites SET status='confirmed' WHERE id=?").run(i.id);
    if (extra && extra.commission) db.prepare('INSERT OR IGNORE INTO commissions(invite_id,venue_id,amount,month,created) VALUES(?,?,?,?,?)').run(i.id, extra.venueId, COMMISSION, new Date().toISOString().slice(0, 7), now());
    confirmed = true;
  }
  return { confirmed, hostIn: !!hostIn, guestIn: !!guestIn };
}
R('POST', '/api/invites/:id/met', ({ req, p }) => {   // üye olmayan yerde QR yok: fotoğraftan sonra iki taraf da "Buluştuk" der
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.venue_id > 0) throw err(400, 'Üye mekânda QR kullanılır');
  if (i.status === 'cancelled') throw err(400, 'Davet geri çekilmiş');
  if (!participant(i, me)) throw err(403, 'Önce daveti kabul et');
  if (!goalOk(i)) throw err(400, 'Önce hedefin onaylanması gerekir');
  if (!photoCount(i.id)) throw err(400, 'Önce buluşma fotoğrafını yükle');
  db.prepare('INSERT OR IGNORE INTO scans(invite_id,user_id,at) VALUES(?,?,?)').run(i.id, me.id, now());
  maybeConfirm(i, null);
  return inviteView(db.prepare('SELECT * FROM invites WHERE id=?').get(i.id), me);
});

// ---- QR çift onay: sahip ve en az bir kabul eden misafir mekânda okutur (önce buluşma fotoğrafı) ----
R('GET', '/api/invites/:id/qr', ({ req, p }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.venue_id <= 0) throw err(400, 'Bu yer Jestora üyesi değil, QR yok');
  if (i.host_id !== me.id && db.prepare('SELECT status FROM guests WHERE invite_id=? AND user_id=?').get(i.id, me.id).status !== 'accepted') throw err(403, 'Önce daveti kabul et');
  if (!goalOk(i)) throw err(403, 'Önce hedefin onaylanması gerekir');
  if (!photoCount(i.id)) throw err(403, 'QR için önce buluşma fotoğrafını yükle');
  const t = Math.floor(now() / 60000);              // 1 dakikalık pencere, ekran görüntüsü işe yaramaz
  const base = `${i.id}.${me.id}.${t}`;
  return { token: `${base}.${hmac(base)}`, validSeconds: 120 };
});
R('POST', '/api/venue/scan', ({ req, body }) => {
  const v = venueAuth(req);
  const [iid, uid, t, sig] = String(body.token || '').split('.');
  if (!sig || hmac(`${iid}.${uid}.${t}`) !== sig) throw err(400, 'QR geçersiz');
  if (Math.abs(Math.floor(now() / 60000) - +t) > 2) throw err(400, 'QR süresi doldu, yenisini göster');
  const i = db.prepare('SELECT * FROM invites WHERE id=?').get(+iid);
  if (!i || i.venue_id !== v.id) throw err(400, 'Bu davet bu mekân için değil');
  if (i.status === 'cancelled') throw err(400, 'Davet geri çekilmiş');
  if (Math.abs(now() - i.at) > 6 * 3600000) throw err(400, 'Davet saati dışında');
  if (!goalOk(i) || !photoCount(i.id)) throw err(400, 'Buluşma fotoğrafı yüklenmemiş');
  db.prepare('INSERT OR IGNORE INTO scans(invite_id,user_id,at) VALUES(?,?,?)').run(i.id, +uid, now());
  const c = maybeConfirm(i, { commission: true, venueId: v.id });
  return { confirmed: c.confirmed, normal: v.normal, jest: v.jest, pay: c.confirmed ? v.jest : v.normal, waiting: c.confirmed ? null : (c.hostIn ? 'misafir' : 'sahip') };
});
R('GET', '/api/invites/:id/receipt', ({ req, p }) => {
  const me = auth(req), i = myInvite(+p.id, me);
  if (i.status !== 'confirmed') throw err(400, 'Henüz onaylanmadı');
  if (i.venue_id <= 0) throw err(400, 'Üye olmayan yerde jest fişi yok');
  const v = db.prepare('SELECT * FROM venues WHERE id=?').get(i.venue_id);
  return { invite: i.id, venue: v.name, at: i.at, normal: v.normal, jest: v.jest, saved: v.normal - v.jest, note: 'Ödemeyi mekâna yaptın. Jestora para tutmaz.' };
});

// ---- mekân ve yönetim ----
R('GET', '/api/venue/today', ({ req }) => { const v = venueAuth(req); return { venue: v.name, invites: db.prepare('SELECT id,at,status FROM invites WHERE venue_id=? AND at BETWEEN ? AND ? ORDER BY at').all(v.id, now() - 6 * 3600000, now() + 24 * 3600000) }; });
if (PILOT) {   // Pilot: mekân anahtarları JEST_SECRET'tan türetilir; eski deneme anahtarları (venue-...) geçersiz olur.
  const upd = db.prepare('UPDATE venues SET key=? WHERE id=?');
  for (const v of db.prepare('SELECT id,name FROM venues').all()) upd.run('mk-' + crypto.createHmac('sha256', SECRET).update('venue:' + v.name).digest('hex').slice(0, 14), v.id);
}
// Üye olmayanların numaraları: davet saatinden 24 saat sonra silinir.
const cleanPending = () => db.prepare('DELETE FROM invite_pending WHERE invite_id IN (SELECT id FROM invites WHERE at < ?)').run(now() - 86400000);
const cleanPhotos = () => db.prepare('DELETE FROM photos WHERE invite_id IN (SELECT id FROM invites WHERE at < ?)').run(now() - PHOTO_DAYS * 86400000);
cleanPending(); cleanPhotos(); setInterval(() => { cleanPending(); cleanPhotos(); }, 3600000).unref();
const adminOnly = req => { if (req.headers['x-admin-key'] !== ADMIN_KEY) throw err(401, 'Yetkisiz'); };
R('GET', '/api/admin/venues', ({ req }) => { adminOnly(req); return { venues: db.prepare('SELECT id,name,district,normal,jest,key FROM venues').all() }; });
R('POST', '/api/admin/venues/:id/rotate', ({ req, p }) => { adminOnly(req); const k = crypto.randomBytes(12).toString('hex'); const r = db.prepare('UPDATE venues SET key=? WHERE id=?').run(k, +p.id); if (!r.changes) throw err(404, 'Mekan yok'); return { id: +p.id, key: k }; });
R('POST', '/api/admin/venues', ({ req, body }) => { adminOnly(req); const n = String(body.name || '').trim(), d = String(body.district || '').trim(); const nm = +body.normal, js = +body.jest;
  if (!n || !d || !(nm > 0) || !(js > 0) || js >= nm) throw err(400, 'Ad, semt, normal ve jest fiyatı gerekli (jest < normal)'); const k = crypto.randomBytes(12).toString('hex');
  const r = db.prepare('INSERT INTO venues(name,district,normal,jest,key) VALUES(?,?,?,?,?)').run(n, d, nm, js, k); return { id: r.lastInsertRowid, key: k }; });
R('GET', '/api/admin/commissions', ({ req, url }) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) throw err(401, 'Yetkisiz');
  const m = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  return { month: m, venues: db.prepare('SELECT v.name,COUNT(*) adet,SUM(c.amount) toplam FROM commissions c JOIN venues v ON v.id=c.venue_id WHERE c.month=? GROUP BY v.id').all(m) };
});

// ---- sunucu ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip, 'all', 120) || (/^\/api\/(code|verify)$/.test(url.pathname) && limited(ip, url.pathname, 10))) throw err(429, 'Çok fazla istek. Biraz bekle.');
      let raw = ''; for await (const ch of req) { raw += ch; if (raw.length > (/\/photo$/.test(url.pathname) ? 5e5 : 1e5)) throw err(413, 'Çok büyük'); }
      let body = {}; if (raw) try { body = JSON.parse(raw); } catch { throw err(400, 'Geçersiz JSON'); }
      for (const [m, re, f] of routes) {
        const mt = m === req.method && re.exec(url.pathname);
        if (mt) return ok(res, await f({ req, res, body, url, p: mt.groups || {} }));
      }
      throw err(404, 'Yol yok');
    }
    let f = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(__dirname, 'public', 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Jestora sunucusu çalışıyor. (Ekran dosyaları henüz yüklenmedi.)'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    const st = fs.createReadStream(f); st.on('error', () => { if (!res.headersSent) res.writeHead(404); res.end('Bulunamadı'); }); st.pipe(res);
  } catch (e) { ok(res, { error: e.message }, e.code || 500); if (!e.code) console.error(e); }
});
if (require.main === module) server.listen(PORT, () => console.log(`Jestora http://localhost:${PORT}${DEV ? '  (GELİŞTİRME)' : ''}`));
module.exports = { server, db };
