// JEST gerçek davet akışı: liste, yeni davet, yanıt, QR, fiş. Sunucuya bağlıdır.
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
  if(i.status==='confirmed')return 'Tamamlandı';
  var me=window.JEST_ME;
  if(i.role==='host'){
    if(i.guests.some(function(g){return g.status==='proposed'}))return 'Zaman önerildi';
    if(i.guests.some(function(g){return g.status==='accepted'}))return 'Kabul edildi';
    if(i.guests.every(function(g){return g.status==='declined'}))return 'Reddedildi';
    return 'Bekliyor'}
  var g=i.guests.filter(function(x){return me&&x.id===me.id})[0];
  if(!g)return 'Bekliyor';
  return {pending:'Yanıt bekliyor',accepted:'Kabul edildi',declined:'Reddettin',proposed:'Zaman önerildi'}[g.status]||'Bekliyor'}
function mapInv(i){
  var names=i.role==='host'?i.guests.map(function(g){return g.name}):[i.host.name];
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
  var fr=$$('fr');if(fr)fr.hidden=true;
  var hn=document.querySelector('#s7 .sub.note');
  var a=JESTS.filter(function(j){return j.active}),p=JESTS.filter(function(j){return !j.active});
  view=homeTab==='a'?a:p;
  var cards=document.querySelectorAll('#jlist .jcard');
  cards.forEach(function(c,k){var j=view[k];if(!j)return;c.style.cursor='pointer';c.setAttribute('role','button');c.tabIndex=0;
    c.onclick=function(){openDetail(j.id)};c.onkeydown=function(e){if(e.key==='Enter')openDetail(j.id)}});
  if(!view.length){var e=document.querySelector('#jlist p.sub');if(e)e.textContent=homeTab==='a'?'Aktif jestin yok. Yeni bir davet gönder.':'Geçmiş jestin yok.'}}
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
  p.appendChild(el('p','Tanıdığın, JEST üyesi birini davet et. Telefon numarasını yaz.','sub'));
  var gl=el('div','');gl.className='chips';p.appendChild(gl);
  var ph=document.createElement('input');ph.type='tel';ph.placeholder='Davet edilen: 5xx xxx xx xx';ph.inputMode='numeric';
  var add=btn('Ekle',function(){var d=ph.value.replace(/\D/g,'').replace(/^0/,'').replace(/^90/,'');
    if(!/^5\d{9}$/.test(d)){er.textContent='Telefon 5 ile başlayan 10 haneli olmalı.';return}
    if(guests.indexOf(d)<0&&guests.length<5)guests.push(d);ph.value='';er.textContent='';rg()},'chip');
  var r1=el('div','');r1.className='row';r1.appendChild(ph);r1.appendChild(add);p.appendChild(r1);
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
  var O=overlay(),p=O.p;
  function render(i){
    p.innerHTML='';var me=window.JEST_ME||{};
    p.appendChild(el('h2',i.venue.name+' · '+i.venue.district));
    p.appendChild(el('p',fmt(i.at),'big'));
    p.appendChild(el('p','Normal fiyat '+tl(i.venue.normal)+', jest fiyatı '+tl(i.venue.jest)+'. Ödeme mekânda yapılır, JEST para tutmaz.','sub'));
    p.appendChild(el('div','Davet sahibi: '+i.host.name+(i.role==='host'?' (sen)':'')));
    i.guests.forEach(function(g){var r=el('div','');r.className='gl';r.appendChild(el('span',g.name+(g.id===me.id?' (sen)':'')));
      var tx={pending:'Bekliyor',accepted:'Kabul etti',declined:'Reddetti',proposed:'Yeni saat önerdi: '+(g.proposal_at?fmt(g.proposal_at):'')}[g.status];r.appendChild(el('b',tx));p.appendChild(r)});
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
        p.appendChild(btn('Daveti geri çek',function(){api('POST','/api/invites/'+i.id+'/cancel').then(function(){close(O.o);load(true)}).catch(function(e){er.textContent=e.message})},'chip'));
      }
      var canQR=i.role==='host'?i.guests.some(function(g){return g.status==='accepted'}):(mine&&mine.status==='accepted');
      if(canQR){p.appendChild(el('h2','Mekânda QR onayı'));p.appendChild(el('p','Mekânda görevliye QR kodunu göster. Hem sen hem davet sahibi/misafir okutunca jest onaylanır.','sub'));
        p.appendChild(btn('QR kodumu göster',function(){showQR(i)}))}
    }
    p.appendChild(er);p.appendChild(btn('Kapat',function(){close(O.o)},'chip'));
  }
  api('GET','/api/invites/'+id).then(function(i){render(i);
    O.o._t.push(setInterval(function(){if(!document.body.contains(O.o))return;api('GET','/api/invites/'+id).then(function(n){if(n.status!==i.status||JSON.stringify(n.guests)!==JSON.stringify(i.guests)){i=n;if(!document.querySelector('.qrov'))render(n);load(true)}}).catch(function(){})},6000))
  }).catch(function(e){p.appendChild(el('p',e.message));p.appendChild(btn('Kapat',function(){close(O.o)},'chip'))});
}
function showQR(i){
  var O=overlay(),p=O.p;O.o.classList.add('qrov');p.appendChild(el('h2','QR kodun'));
  var box=el('div','');box.className='qrb';p.appendChild(box);var msg=el('p','Kod 2 dakikada bir yenilenir.','sub');p.appendChild(msg);
  function refresh(){api('GET','/api/invites/'+i.id+'/qr').then(function(j){box.innerHTML=window.jestQR(j.token,6)}).catch(function(e){msg.textContent=e.message})}
  refresh();O.o._t.push(setInterval(refresh,50000));
  O.o._t.push(setInterval(function(){api('GET','/api/invites/'+i.id).then(function(n){if(n.status==='confirmed'){msg.textContent='Onaylandı! Mekânda '+tl(n.venue.jest)+' ödeyeceksin.';msg.style.fontWeight='800';load(true)}}).catch(function(){})},4000));
  p.appendChild(btn('Kapat',function(){close(O.o)},'chip'));
}

$$('newJ').onclick=function(){if(!VEN.length){api('GET','/api/venues').then(function(j){VEN=j.venues;openNew()})}else openNew()};
$$('toHome').onclick=function(){renderHome();go(7)};
// oturum sahibini bilmek için
var oldMe=window.jestApi;
window.addEventListener('load',function(){});
setInterval(function(){if(!window.JEST_ME&&localStorage.getItem('jest-token'))api('GET','/api/me').then(function(j){window.JEST_ME=j.user}).catch(function(){})},1500);
})();
