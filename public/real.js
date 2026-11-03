// Jestora gerçek davet akışı: liste, yeni davet, yanıt, QR, fiş. Sunucuya bağlıdır.
(function(){
var api=window.jestApi,VEN=[],lastLoad=0,busy=false,view=[];
window.JESTS=[];
var st=document.createElement('style');
st.textContent='.rov{position:fixed;inset:0;background:rgba(15,27,61,.55);z-index:60;display:flex;align-items:flex-end;justify-content:center}.rpn{background:#FFF6EC;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:20px 20px 28px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box}.rpn h2{margin:0}.rpn input,.rpn select{width:100%;box-sizing:border-box;padding:12px;border-radius:14px;border:2px solid #E8DCCB;font:inherit;background:#fff}.rpn .row{display:flex;gap:8px;flex-wrap:wrap}.rpn .qrb{background:#fff;border-radius:16px;padding:8px;align-self:center;max-width:280px}.rpn .qrb svg{width:100%;height:auto;display:block}.rpn .big{font-size:22px;font-weight:800}.rpn .okb{background:#E7F8EF;border-radius:14px;padding:12px}.rpn .gl{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #EADFCF}';
document.head.appendChild(st);
function $$(id){return document.getElementById(id)}
function fmt(ts){var d=new Date(ts);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+DAYS[d.getDay()]+' · '+pad(d.getHours())+':'+pad(d.getMinutes())}
function tl(n){return n+' TL'}
function stat(i){
  if(i.status==='cancelled')return 'Geri çekildi';
  if(i.status==='open'&&i.at<Date.now()-6*3600000)return 'Süresi geçti';
  if(i.status==='confirmed')return 'Tamamlandı';
  var me=window.JEST_ME;
  if(i.role==='host'){
    if(!i.guests.length&&i.invited&&i.invited.length)return 'Üye bekleniyor';
    if(i.guests.some(function(g){return g.status==='proposed'}))return 'Zaman önerildi';
    if(i.guests.some(function(g){return g.status==='accepted'}))return 'Kabul edildi';
    if(i.guests.every(function(g){return g.status==='declined'}))return 'Reddedildi';
    return 'Bekliyor'}
  var g=i.guests.filter(function(x){return me&&x.id===me.id})[0];
  if(!g)return 'Bekliyor';
  return {pending:'Yanıt bekliyor',accepted:'Kabul edildi',declined:'Reddettin',proposed:'Zaman önerildi'}[g.status]||'Bekliyor'}
function mapInv(i){
  var names=i.role==='host'?i.guests.map(function(g){return g.name}).concat((i.invited||[]).map(function(x){return 'Davetli (…'+x.phone.slice(-4)+')'})):[i.host.name];
  var s=stat(i);
  return {id:i.id,names:names,reason:'Jest',place:i.venue.name,when:fmt(i.at),status:s,
    active:(i.status==='open'&&i.at>Date.now()-6*3600000),raw:i}}
function load(force){
  if(busy||(!force&&Date.now()-lastLoad<2000))return Promise.resolve();
  busy=true;
  return api('GET','/api/invites').then(function(j){
    JESTS=j.invites.map(mapInv);window.JESTS=JESTS;lastLoad=Date.now();busy=false;draw()}).catch(function(){busy=false})}
var oldRender=window.renderHome;
function draw(){oldRender();
  var hn=document.querySelector('#s7 .sub.note');
  var a=JESTS.filter(function(j){return j.active}),p=JESTS.filter(function(j){return !j.active});
  view=(homeTab==='a'?a:p).filter(function(j){return !selF||j.names.indexOf(selF)>-1});
  var cards=document.querySelectorAll('#jlist .jcard');
  cards.forEach(function(c,k){var j=view[k];if(!j)return;
    var ic=c.querySelector('.jimg');if(ic&&!c.querySelector('.jav')){var nm=j.names[0]||'?',pend=/^Davetli \(/.test(nm);
      var av=document.createElement('div');av.className='jav';var ini=pend?'?':(nm.replace(/[^\p{L}\s]/gu,'').trim().split(/\s+/).slice(0,2).map(function(x){return x[0]}).join('')||'?').toLocaleUpperCase('tr');
      av.textContent=ini;av.style.background=pend?'#B8BED6':fcol(nm);ic.className='jbd';av.appendChild(ic);c.insertBefore(av,c.firstChild)}c.style.cursor='pointer';c.setAttribute('role','button');c.tabIndex=0;
    c.onclick=function(){openDetail(j.id)};c.onkeydown=function(e){if(e.key==='Enter')openDetail(j.id)}});
  var box=$$('jlist'),old=$$('rGuide');if(old)old.remove();
  var wait=JESTS.filter(function(j){return j.active&&j.raw.role==='guest'&&j.status==='Yanıt bekliyor'}).length;
  if(wait){var w=el('div','');w.id='rGuide';w.className='card';w.style.cssText='background:#FFE9D3;border-radius:16px;padding:12px 14px;margin-bottom:10px;font-weight:800';w.textContent='Yanıtını bekleyen '+wait+' davetin var. Açmak için dokun.';w.style.cursor='pointer';w.setAttribute('role','button');w.tabIndex=0;var wj=JESTS.filter(function(j){return j.active&&j.raw.role==='guest'&&j.status==='Yanıt bekliyor'})[0];w.onclick=function(){if(wj)openDetail(wj.id)};w.onkeydown=function(e){if(e.key==='Enter'&&wj)openDetail(wj.id)};box.parentNode.insertBefore(w,box)}
  if(!view.length){var e=document.querySelector('#jlist p.sub');if(e)e.textContent=homeTab==='a'?'Aktif jestin yok.':'Geçmiş jestin yok.';
    if(!JESTS.length&&homeTab==='a'){var g=el('div','');g.id='rGuide';g.className='card';g.style.cssText='border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px';
      g.appendChild(el('b','Nasıl çalışır?'));['1. Tanıdığın birini telefon numarasıyla davet et, yeri ve saati seç.','2. O kabul edince ikiniz de mekânda QR kodunuzu gösterin.','3. Mekân onaylayınca jest fiyatı geçerli olur. Ödeme mekânda yapılır, Jestora para tutmaz.'].forEach(function(t){g.appendChild(el('span',t))});
      g.appendChild(el('small','Not: Karşındaki kişi henüz üye değilse, ona göndereceğin davet linki hazırlanır; link kayıt ekranında seni karşılar.'));box.parentNode.insertBefore(g,box)}}}
window.renderHome=function(){draw();if(localStorage.getItem('jest-token'))load()};
setInterval(function(){var s=$$('s7');if(s&&!s.hidden&&!document.querySelector('.rov'))load(true)},15000);

function overlay(){var o=document.createElement('div');o.className='rov';var p=document.createElement('div');p.className='rpn';o.appendChild(p);
  o.onclick=function(e){if(e.target===o)close(o)};document.body.appendChild(o);o._t=[];return {o:o,p:p}}
function close(o){(o._t||[]).forEach(clearInterval);o.remove()}
function el(tag,txt,cls){var e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function btn(txt,fn,cls){var b=el('button',txt,cls||'btn');b.type='button';b.onclick=fn;return b}
function errBox(){var e=el('div','');e.setAttribute('role','alert');e.style.cssText='color:#C0392B;font-weight:700;min-height:20px';return e}
function dtl(ts){var d=new Date(ts);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}

// ---- yeni davet ----
function openNew(){
  var O=overlay(),p=O.p,guests=[];
  p.appendChild(el('h2','Yeni jest daveti'));
  p.appendChild(el('p','Tanıdığın birini davet et, telefon numarasını yaz. Henüz üye değilse, ona göndereceğin davet linki hazırlanır.','sub'));
  var gl=el('div','');gl.className='chips';p.appendChild(gl);
  var ph=document.createElement('input');ph.type='tel';ph.placeholder='Davet edilen: 5xx xxx xx xx';ph.inputMode='numeric';
  var add=btn('Ekle',function(){var d=ph.value.replace(/\D/g,'').replace(/^0/,'').replace(/^90/,'');
    if(!/^5\d{9}$/.test(d)){er.textContent='Telefon 5 ile başlayan 10 haneli olmalı.';return}
    if(guests.indexOf(d)<0&&guests.length<5)guests.push(d);ph.value='';er.textContent='';rg()},'chip');
  var r1=el('div','');r1.className='row';r1.appendChild(ph);r1.appendChild(add);p.appendChild(r1);
  if(navigator.contacts&&navigator.contacts.select){var pk=btn('Rehberden seç',function(){navigator.contacts.select(['tel'],{multiple:true}).then(function(cs){var bad=0;cs.forEach(function(c){var t=(c.tel||[]).map(function(x){return String(x).replace(/\D/g,'').replace(/^90/,'').replace(/^0/,'')}).filter(function(x){return /^5\d{9}$/.test(x)})[0];if(t&&guests.indexOf(t)<0&&guests.length<5)guests.push(t);else bad++});er.textContent=bad?'Cep numarası olmayan kişiler eklenmedi (en fazla 5 kişi).':'';rg()}).catch(function(){})},'chip');pk.style.cssText='margin:8px 0';p.appendChild(pk)}
  function rg(){gl.innerHTML='';guests.forEach(function(g,k){var c=el('button','+90 '+g+' ✕','chip');c.type='button';c.onclick=function(){guests.splice(k,1);rg()};gl.appendChild(c)})}
  p.appendChild(el('h2','Nerede?'));
  var sel=document.createElement('select');p.appendChild(sel);
  VEN.forEach(function(v){var o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.district+' · '+tl(v.normal)+' yerine '+tl(v.jest);sel.appendChild(o)});
  p.appendChild(el('h2','Ne zaman?'));
  var dt=document.createElement('input');dt.type='datetime-local';var d0=new Date();d0.setDate(d0.getDate()+1);d0.setHours(15,0,0,0);dt.value=dtl(d0);dt.min=dtl(Date.now()+900000);p.appendChild(dt);
  var er=errBox();p.appendChild(er);
  var go2=btn('Daveti gönder',function(){
    if(ph.value.trim())add.onclick();if(!guests.length){er.textContent='En az bir kişi ekle.';return}
    go2.disabled=true;
    api('POST','/api/invites',{venueId:+sel.value,at:new Date(dt.value).getTime(),guests:guests.map(function(g){return '0'+g})}).then(function(inv){close(O.o);load(true).then(function(){openDetail(inv.id)})})
    .catch(function(e){er.textContent=e.message;go2.disabled=false})});
  p.appendChild(go2);p.appendChild(btn('Vazgeç',function(){close(O.o)},'chip'));
}

// ---- ayrıntı ----
function openDetail(id){
  if(!VEN.length){api('GET','/api/venues').then(function(j){VEN=j.venues;openDetail(id)});return}
  var O=overlay(),p=O.p;
  function render(i){
    p.innerHTML='';var me=window.JEST_ME||{};
    p.appendChild(el('h2',i.venue.name+' · '+i.venue.district));
    p.appendChild(el('p',fmt(i.at),'big'));
    p.appendChild(el('p','Normal fiyat '+tl(i.venue.normal)+', jest fiyatı '+tl(i.venue.jest)+'. Ödeme mekânda yapılır, Jestora para tutmaz.','sub'));
    p.appendChild(el('div','Davet sahibi: '+i.host.name+(i.role==='host'?' (sen)':'')));
    i.guests.forEach(function(g){var r=el('div','');r.className='gl';r.appendChild(el('span',g.name+(g.id===me.id?' (sen)':'')));
      var tx={pending:'Bekliyor',accepted:'Kabul etti',declined:'Reddetti',proposed:'Yeni saat önerdi: '+(g.proposal_at?fmt(g.proposal_at):'')}[g.status];r.appendChild(el('b',tx));p.appendChild(r)});
    if(i.role==='host'&&i.invited&&i.invited.length){
      p.appendChild(el('h2','Henüz Jestora üyesi olmayanlar'));
      p.appendChild(el('p','Linki kendi WhatsApp\'ından sen gönderirsin. Link yalnızca bu numaraya özeldir ve bir kez kullanılır.','sub'));
      i.invited.forEach(function(x){
        var link=location.origin+'/?davet='+x.token;
        var msg='Merhaba! Seni Jestora\'da bir jest\'e davet ettim: '+i.venue.name+', '+fmt(i.at)+'. Linke dokunup kayıt ol, davetini görürsün: '+link;
        var box=el('div','');box.className='gl';box.style.cssText='display:block;margin:8px 0';
        box.appendChild(el('b','+90 '+x.phone.slice(-10)));
        var row=el('div','');row.className='row';row.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
        var wa=document.createElement('a');wa.className='btn';wa.textContent='WhatsApp\'ta gönder';wa.target='_blank';wa.rel='noopener';wa.style.cssText='text-decoration:none;text-align:center;display:block;box-sizing:border-box';wa.href='https://wa.me/'+x.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(msg);row.appendChild(wa);
        var cp=btn('Mesajı kopyala',function(){var done=function(){cp.textContent='Kopyalandı'};try{navigator.clipboard.writeText(msg).then(done,function(){ta.select()})}catch(e){ta.select()}},'chip');row.appendChild(cp);
        var cl=btn('Linki kopyala',function(){var d=function(){cl.textContent='Link kopyalandı'};try{navigator.clipboard.writeText(link).then(d,function(){ta.select()})}catch(e){ta.select()}},'chip');row.appendChild(cl);
        if(navigator.share){row.appendChild(btn('Paylaş',function(){navigator.share({text:msg}).catch(function(){})},'chip'))}
        box.appendChild(row);
        var ta=document.createElement('textarea');ta.readOnly=true;ta.value=msg;ta.rows=3;ta.style.cssText='width:100%;margin-top:6px;font-size:13px';ta.onclick=function(){ta.select()};box.appendChild(ta);
        p.appendChild(box)})}
    var er=errBox();
    function act(a,extra){return function(){api('POST','/api/invites/'+i.id+'/respond',Object.assign({action:a},extra||{})).then(function(){return api('GET','/api/invites/'+i.id)}).then(function(n){render(n);load(true)}).catch(function(e){er.textContent=e.message})}}
    if(i.status==='confirmed'){
      var rc=el('div','');rc.className='okb';rc.textContent='Jest onaylandı. Mekânda ödeyeceğin tutar '+tl(i.venue.jest)+'. Normal fiyat '+tl(i.venue.normal)+', kazancın '+tl(i.venue.normal-i.venue.jest)+'.';p.appendChild(rc)}
    else if(i.status==='cancelled'){p.appendChild(el('p','Bu davet geri çekildi.','sub'))}
    else{
      var mine=i.guests.filter(function(g){return g.id===me.id})[0];
      if(i.role==='guest'){
        var row=el('div','');row.className='row';
        if(!mine||mine.status!=='accepted')row.appendChild(btn('Kabul et',act('accept')));
        if(!mine||mine.status!=='declined')row.appendChild(btn('Reddet',act('decline'),'chip'));p.appendChild(row);
        p.appendChild(el('h2','Başka bir saat öner'));
        var d=document.createElement('input');d.type='datetime-local';d.value=dtl(i.at+7200000);d.min=dtl(Date.now()+900000);p.appendChild(d);
        p.appendChild(btn('Saati öner',function(){act('propose',{at:new Date(d.value).getTime()})()},'chip'));
      }else{
        i.guests.filter(function(g){return g.status==='proposed'}).forEach(function(g){
          p.appendChild(btn(g.name+' için '+fmt(g.proposal_at)+' saatini kabul et',act('accept-proposal',{guestId:g.id}),'btn'))});
        var ed=el('div','');ed.className='row';p.appendChild(ed);
        p.appendChild(btn('Saati veya yeri değiştir',function(){editInv(i,O)},'chip'));
        p.appendChild(btn('Daveti geri çek',function(){api('POST','/api/invites/'+i.id+'/cancel').then(function(){close(O.o);load(true)}).catch(function(e){er.textContent=e.message})},'chip'));
      }
      var canQR=i.role==='host'?i.guests.some(function(g){return g.status==='accepted'}):(mine&&mine.status==='accepted');
      if(canQR){p.appendChild(el('h2','Mekânda QR onayı'));p.appendChild(el('p','Mekânda görevliye QR kodunu göster. Hem sen hem davet sahibi/misafir okutunca jest onaylanır.','sub'));
        p.appendChild(btn('QR kodumu göster',function(){showQR(i)}))}
    }
    p.appendChild(er);p.appendChild(btn('Kapat',function(){close(O.o)},'chip'));
  }
  api('GET','/api/invites/'+id).then(function(i){render(i);
    O.o._t.push(setInterval(function(){if(!document.body.contains(O.o))return;api('GET','/api/invites/'+id).then(function(n){if(n.status!==i.status||JSON.stringify(n.guests)!==JSON.stringify(i.guests)||JSON.stringify(n.invited)!==JSON.stringify(i.invited)){i=n;if(!document.querySelector('.qrov'))render(n);load(true)}}).catch(function(){})},6000))
  }).catch(function(e){p.appendChild(el('p',e.message));p.appendChild(btn('Kapat',function(){close(O.o)},'chip'))});
}
function editInv(i,O0){
  var O=overlay(),p=O.p;p.appendChild(el('h2','Daveti düzenle'));p.appendChild(el('p','Değişiklikten sonra davet edilenlerin yeniden yanıt vermesi gerekir.','sub'));
  var sel=document.createElement('select');p.appendChild(sel);VEN.forEach(function(v){var o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.district+' · '+tl(v.normal)+' yerine '+tl(v.jest);if(v.id===i.venue.id)o.selected=true;sel.appendChild(o)});
  var dt=document.createElement('input');dt.type='datetime-local';dt.value=dtl(i.at);dt.min=dtl(Date.now()+900000);p.appendChild(dt);var er=errBox();p.appendChild(er);
  p.appendChild(btn('Kaydet',function(){api('POST','/api/invites/'+i.id+'/edit',{at:new Date(dt.value).getTime(),venueId:+sel.value}).then(function(){close(O.o);close(O0.o);load(true).then(function(){openDetail(i.id)})}).catch(function(e){er.textContent=e.message})}));
  p.appendChild(btn('Vazgeç',function(){close(O.o)},'chip'));
}
function showQR(i){
  var O=overlay(),p=O.p;O.o.classList.add('qrov');p.appendChild(el('h2','QR kodun'));
  var box=el('div','');box.className='qrb';p.appendChild(box);var msg=el('p','Kod 2 dakikada bir yenilenir.','sub');p.appendChild(msg);
  function refresh(){api('GET','/api/invites/'+i.id+'/qr').then(function(j){box.innerHTML=window.jestQR(j.token,6)}).catch(function(e){msg.textContent=e.message})}
  refresh();O.o._t.push(setInterval(refresh,50000));
  O.o._t.push(setInterval(function(){api('GET','/api/invites/'+i.id).then(function(n){if(n.status==='confirmed'){msg.textContent='Onaylandı! Mekânda '+tl(n.venue.jest)+' ödeyeceksin.';msg.style.fontWeight='800';load(true)}}).catch(function(){})},4000));
  p.appendChild(btn('Kapat',function(){close(O.o)},'chip'));
}

// hesabı sil
(function(){var lo=$$('logout');if(!lo)return;var b=document.createElement('button');b.className='chip';b.type='button';b.textContent='Hesabımı sil';b.style.marginLeft='8px';lo.parentNode.appendChild(b);
  b.onclick=function(){var O=overlay(),p=O.p;p.appendChild(el('h2','Hesabını silmek istiyor musun?'));
    p.appendChild(el('p','Hesabın kapatılır, açık davetlerin geri çekilir ve oturumun sonlanır. Geri alınamaz. Onaylamak için SIL yaz.','sub'));
    var i=document.createElement('input');i.placeholder='SIL';i.autocapitalize='characters';p.appendChild(i);var er=errBox();p.appendChild(er);
    p.appendChild(btn('Hesabımı kalıcı olarak sil',function(){api('POST','/api/me/delete',{confirm:i.value.trim().toUpperCase()}).then(function(){try{localStorage.removeItem('jest-token');localStorage.removeItem('jest-demo-oturum')}catch(e){}location.reload()}).catch(function(e){er.textContent=e.message})}));
    p.appendChild(btn('Vazgeç',function(){close(O.o)},'chip'))}})();
// uygulamayı ana ekrana ekle
(function(){var dp=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;show()});
  var lo=$$('logout');function standalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone}
  function show(){if(standalone()||$$('rInst'))return;var b=document.createElement('button');b.id='rInst';b.className='chip';b.type='button';b.textContent='Ana ekrana ekle';b.style.marginLeft='8px';lo.parentNode.appendChild(b);
    b.onclick=function(){if(dp){dp.prompt();dp.userChoice.finally(function(){dp=null;b.remove()})}else iosHelp()}}
  function iosHelp(){var O=overlay(),p=O.p;p.appendChild(el('h2','Ana ekrana ekle'));
    ['iPhone: Safari ile aç, alttaki Paylaş düğmesine (kare ve yukarı ok) bas, Ana Ekrana Ekle seç.','Android: Chrome ile aç, sağ üstteki üç noktaya bas, Uygulamayı yükle ya da Ana ekrana ekle seç.','Eklenince Jestora uygulama gibi tam ekran açılır.'].forEach(function(t){p.appendChild(el('p',t))});
    p.appendChild(btn('Tamam',function(){close(O.o)},'chip'))}
  if(/iphone|ipad/i.test(navigator.userAgent)&&!standalone())show();
  setTimeout(function(){if(!dp&&!standalone()&&!$$('rInst')&&lo){show()}},2500);
})();
document.querySelectorAll('.demo').forEach(function(d){d.textContent='Kapalı pilot'});
(function(){var lo=$$('logout');if(!lo)return;var row=lo.parentNode;row.style.flexWrap='wrap';row.style.justifyContent='flex-end';row.style.gap='8px';var n=row.querySelector('.note');if(n)n.remove();[].forEach.call(row.querySelectorAll('button'),function(b){b.style.marginLeft='0'})})();
$$('newJ').onclick=function(){if(!VEN.length){api('GET','/api/venues').then(function(j){VEN=j.venues;openNew()})}else openNew()};
$$('toHome').onclick=function(){renderHome();go(7)};
// oturum sahibini bilmek için
var oldMe=window.jestApi;
window.addEventListener('load',function(){});
setInterval(function(){if(!window.JEST_ME&&localStorage.getItem('jest-token'))api('GET','/api/me').then(function(j){window.JEST_ME=j.user}).catch(function(){})},1500);
})();
