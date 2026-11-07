// Jestora gerçek davet akışı: liste, yeni davet, yanıt, QR, fiş. Sunucuya bağlıdır.
(function(){
var api=window.jestApi,VEN=[],lastLoad=0,busy=false,view=[];
window.JESTS=[];
var st=document.createElement('style');
st.textContent='.rov{position:fixed;inset:0;background:rgba(15,27,61,.55);z-index:60;display:flex;align-items:flex-end;justify-content:center}.rpn{background:#FFF6EC;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:20px 20px 28px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box}.rpn h2{margin:0}.rpn input,.rpn select{width:100%;box-sizing:border-box;padding:12px;border-radius:14px;border:2px solid #E8DCCB;font:inherit;background:#fff}.rpn .row{display:flex;gap:8px;flex-wrap:wrap}.rpn .qrb{background:#fff;border-radius:16px;padding:8px;align-self:center;max-width:280px}.rpn .qrb svg{width:100%;height:auto;display:block}.rpn .big{font-size:22px;font-weight:800}.rpn .okb{background:#E7F8EF;border-radius:14px;padding:12px}.rpn .gl{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #EADFCF}';
document.head.appendChild(st);
var st2=document.createElement('style');
st2.textContent='#rToday,.rpn{color:#0F1B3D;color-scheme:light}:is(#rToday,.rpn) :is(h2,h3,b,p,div,span,label){color:#0F1B3D}:is(#rToday,.rpn) .sub{color:#4A5578}:is(#rToday,.rpn) :is(input,select,textarea){background:#fff;color:#0F1B3D;border:1px solid #C9CFE0;color-scheme:light}:is(#rToday,.rpn) .chip{background:#FFE0C2;color:#0F1B3D}:is(#rToday,.rpn) .err{color:#B3261E}#rToday a,.rpn a{color:#C2570A}';
document.head.appendChild(st2);
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
    if(i.kind==='goal'&&i.guests.some(function(g){return g.status==='accepted'})){return {active:'Hedef sürüyor',claimed:'Onay bekliyor',approved:'Hedef onaylandı'}[i.goalStatus]||'Kabul edildi'}
    if(i.guests.some(function(g){return g.status==='proposed'}))return 'Zaman önerildi';
    if(i.guests.some(function(g){return g.status==='accepted'}))return 'Kabul edildi';
    if(i.guests.every(function(g){return g.status==='declined'}))return 'Reddedildi';
    return 'Bekliyor'}
  var g=i.guests.filter(function(x){return me&&x.id===me.id})[0];
  if(!g)return 'Bekliyor';
  if(i.kind==='goal'&&g.status==='accepted'){return {active:'Hedef sürüyor',claimed:i.achieverId===(me&&me.id)?'Onay bekleniyor':'Onayını bekliyor',approved:'Hedef onaylandı'}[i.goalStatus]||'Kabul edildi'}
  return {pending:'Yanıt bekliyor',accepted:'Kabul edildi',declined:'Reddettin',proposed:'Zaman önerildi'}[g.status]||'Bekliyor'}
function mapInv(i){
  var names=i.role==='host'?i.guests.map(function(g){return g.name}).concat((i.invited||[]).map(function(x){return 'Davetli (…'+x.phone.slice(-4)+')'})):[i.host.name];
  var s=stat(i);
  return {id:i.id,names:names,reason:i.kind==='goal'?'Hedef jesti':'Jest',place:i.venue.name,when:fmt(i.at),status:s,
    active:(i.status==='open'&&i.at>Date.now()-6*3600000),raw:i}}
function load(force){
  if(busy||(!force&&Date.now()-lastLoad<2000))return Promise.resolve();
  busy=true;
  return api('GET','/api/invites').then(function(j){
    JESTS=j.invites.map(mapInv);window.JESTS=JESTS;lastLoad=Date.now();busy=false;draw()}).catch(function(){busy=false})}

// ---- v14 Bugün: niyet+seri, Sıra sende, kendine hedef, özel gün, teşekkür
var TD=null,tdAt=0,tdBusy=false;
function loadToday(force){if(tdBusy||(!force&&TD&&Date.now()-tdAt<60000))return;tdBusy=true;api('GET','/api/today').then(function(j){TD=j;tdAt=Date.now();tdBusy=false;renderToday()}).catch(function(){tdBusy=false})}
function tdPost(p,b){return api('POST',p,b).then(function(){tdAt=0;loadToday(true)})}
function tdSec(title,sub,id){var d=el('div','');d.className='tdsec';if(id)d.id=id;d.style.cssText='background:#fff;border-radius:14px;padding:10px 12px;margin-top:8px;display:flex;flex-direction:column;gap:6px';var h=el('div',title);h.style.cssText='font-weight:800';d.appendChild(h);if(sub){var s=el('div',sub);s.style.cssText='font-size:.85em;opacity:.75';d.appendChild(s)}return d}
function tdInp(ph,lab,type,max){var i=document.createElement('input');i.type=type||'text';if(max)i.maxLength=max;i.placeholder=ph;i.setAttribute('aria-label',lab);i.style.cssText='width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #ddd';return i}
function tdRow(){var r=el('div','');r.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';return r}
function newWith(pre){if(!VEN.length){api('GET','/api/venues').then(function(j){VEN=j.venues;openNew(pre)})}else openNew(pre)}
window.jestOpenNew=newWith;
function wa(msg){if(navigator.share){navigator.share({text:msg}).catch(function(){})}else{window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank')}}
function renderToday(){
  var old=$$('rToday'),keep={};
  if(old){var ae=document.activeElement;if(ae&&old.contains(ae)&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))return;
    old.querySelectorAll('input,select').forEach(function(e){var k=e.getAttribute('aria-label');if(k&&e.value)keep[k]=e.value});old.remove()}
  var box=$$('jlist');if(!box||!TD)return;
  var c=el('div','');c.id='rToday';c.className='card';c.style.cssText='background:#FFF0DB;border-radius:16px;padding:12px 14px;margin-bottom:10px;display:flex;flex-direction:column';
  var top=el('div','Bugün');top.style.cssText='font-weight:900;font-size:1.1em';c.appendChild(top);
  var sub=el('div',(TD.streak?TD.streak+' günlük niyet serin var. ':'')+'Küçük bir jest, güzel bir gün.');sub.style.cssText='font-size:.85em;opacity:.75';c.appendChild(sub);
  // 1) niyet
  var I=TD.intent,sI=tdSec('Günün niyeti',I.accepted?'Kabul ettin':'Sana bir öneri','tdNiyet');
  var tx=el('div',I.text);tx.style.cssText='font-weight:700';sI.appendChild(tx);
  var row=tdRow();
  if(!I.accepted){row.appendChild(btn('Kabul et',function(){tdPost('/api/today/intent',{action:'accept'})},'chip'));
    row.appendChild(btn('Kendim yazayım',function(){var v=prompt('Bugünkü niyetin?');if(v)tdPost('/api/today/intent',{action:'custom',text:v}).catch(function(e){alert(e.message)})},'chip'))}
  else if(!I.done){row.appendChild(btn('Yaptım',function(){tdPost('/api/today/intent',{action:'done'})},'chip'))}
  else{var ok=el('div','Yaptın, teşekkürler.');ok.style.cssText='font-weight:800';row.appendChild(ok)}
  sI.appendChild(row);
  // 2) Sıra sende
  var sT=tdSec('Sıra sende','Son buluşmada kim ısmarladıysa sıra karşıdadır','tdSira');
  var mine=TD.turns.filter(function(t){return t.mine}),theirs=TD.turns.filter(function(t){return !t.mine});
  if(TD.fresh||!TD.turns.length){sT.appendChild(el('div',TD.fresh?'İlk jestini 60 saniyede gönder. Bir şablon seç:':'Henüz tamamlanmış jestin yok. Bir arkadaşını davet et:'));
    var tr=tdRow();
    tr.appendChild(btn('Kahve jesti',function(){newWith({kind:'meet'})},'chip'));tr.appendChild(btn('Çay jesti',function(){newWith({kind:'meet'})},'chip'));tr.appendChild(btn('Hedef jesti',function(){newWith({kind:'goal'})},'chip'));sT.appendChild(tr)}
  mine.forEach(function(t){var r=tdRow();var tt=el('div','Sıra sende: '+t.name+' ('+t.days+' gün önce o ısmarladı)');tt.style.cssText='flex:1;min-width:10rem;font-weight:700';r.appendChild(tt);r.appendChild(btn('Davet et',function(){newWith({kind:'meet',guest:t.phone})},'chip'));sT.appendChild(r)});
  theirs.forEach(function(t){var r=el('div','Sıra onda: '+t.name+' (en son sen ısmarladın)');r.style.cssText='font-size:.9em;opacity:.8';sT.appendChild(r)});
  // 3) hedeflerim
  var sG=tdSec('Hedeflerim','Yalnızca sana özel. İstersen bir arkadaşınla hedef jestine çevir','tdHedef');
  TD.goals.forEach(function(g){var r=tdRow();var gt=el('div',(g.done?'✓ ':'')+g.text+(g.due?' · '+g.due.slice(8)+'.'+g.due.slice(5,7):''));gt.style.cssText='flex:1;min-width:9rem;'+(g.done?'text-decoration:line-through;opacity:.6':'font-weight:700');r.appendChild(gt);
    if(!g.done){r.appendChild(btn('Bitirdim',function(){tdPost('/api/mygoals/'+g.id+'/done')},'chip'));r.appendChild(btn('Arkadaşımla paylaş',function(){newWith({kind:'goal',goal:g.text})},'chip'))}
    r.appendChild(btn('Sil',function(){tdPost('/api/mygoals/'+g.id+'/delete')},'chip'));sG.appendChild(r)});
  var gi=tdInp('Yeni hedef, örn. Haftada 3 kere yürümek','Yeni hedef','text',120),gd=tdInp('Bitiş tarihi','Hedef bitiş tarihi','date');gd.min=new Date().toISOString().slice(0,10);
  var gr=tdRow();gr.appendChild(gd);gr.appendChild(btn('Hedef ekle',function(){if(!gi.value.trim()){gi.focus();return}tdPost('/api/mygoals',{text:gi.value.trim(),due:gd.value||null}).catch(function(e){alert(e.message)})},'chip'));
  sG.appendChild(gi);sG.appendChild(gr);
  // 4) özel günler
  var sO=tdSec('Özel günler','Doğum günü, sınav, mülakat: yaklaşınca burada görünür','tdOzel');
  TD.occasions.forEach(function(o){var r=tdRow();var when=o.left===0?'bugün':(o.left===1?'yarın':o.left+' gün sonra');var ot=el('div',o.name+' · '+o.label+': '+when);ot.style.cssText='flex:1;min-width:9rem;font-weight:700';r.appendChild(ot);
    r.appendChild(btn('Jest davet et',function(){newWith({kind:'meet'})},'chip'));
    r.appendChild(btn('Mesaj gönder',function(){wa(o.name+', '+(o.label==='Doğum günü'?'doğum günün kutlu olsun!':o.label==='Sınav'?'sınavında başarılar!':o.label==='Mülakat'?'mülakatında başarılar!':'özel günün kutlu olsun!')+' Küçük bir jest benden. (Jestora)')},'chip'));
    r.appendChild(btn('Sil',function(){tdPost('/api/occasions/'+o.id+'/delete')},'chip'));sO.appendChild(r)});
  if(!TD.occasions.length&&TD.occAll)sO.appendChild(el('div','Önümüzdeki 7 günde özel gün yok.'));
  var on=tdInp('Kişi','Özel gün için kişi adı','text',40),ol=document.createElement('select');ol.setAttribute('aria-label','Özel gün türü');ol.style.cssText='padding:10px;border-radius:10px;border:1px solid #ddd';['Doğum günü','Sınav','Mülakat','Yıl dönümü','Diğer'].forEach(function(x){var o=document.createElement('option');o.textContent=x;ol.appendChild(o)});
  var od=tdInp('Tarih','Özel gün tarihi','date');var orr=tdRow();orr.appendChild(ol);orr.appendChild(od);
  sO.appendChild(on);sO.appendChild(orr);sO.appendChild(btn('Özel gün ekle',function(){if(!on.value.trim()){on.focus();return}tdPost('/api/occasions',{name:on.value.trim(),label:ol.value,date:od.value}).catch(function(e){alert(e.message)})},'chip'));
  // 5) teşekkür
  var sK=tdSec('Günün teşekkürü','Bugün seni güldüren, yardım eden birine kısa bir teşekkür gönder','tdTesekkur');
  var who=tdInp('Kime? (isim)','Teşekkür edeceğin kişi','text',40),nt=tdInp('Neyi için teşekkür ediyorsun?','Teşekkür notu','text',120);sK.appendChild(who);sK.appendChild(nt);
  var kr=tdRow();kr.appendChild(btn('WhatsApp ile gönder',function(){var n=nt.value.trim();if(!n){nt.focus();return}var msg=(who.value.trim()?who.value.trim()+', ':'')+n+' için teşekkür ederim. Küçük bir jest benden. (Jestora)';
    api('POST','/api/today/thanks').then(function(){tdAt=0;loadToday(true)}).catch(function(){});wa(msg);nt.value=''},'chip'));sK.appendChild(kr);
  var W=TD.week;var sS=tdSec('Bu hafta','Yalnızca sana özel');
  sS.appendChild(el('div','Tamamlanan buluşma: '+W.met+' · Gönderilen davet: '+W.sent+' · Teşekkür: '+W.thanks+' · Niyet: '+W.intentDone+'/7'));
  var h=TD.hour,order=h<12?[sI,sT,sG,sO,sK,sS]:(h<17?[sT,sI,sG,sO,sK,sS]:[sK,sT,sI,sO,sG,sS]);
  order.forEach(function(x){c.appendChild(x)});
  c.querySelectorAll('input,select').forEach(function(e){var k=e.getAttribute('aria-label');if(k&&keep[k]!=null)e.value=keep[k]});
  box.parentNode.insertBefore(c,box)}
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
  loadToday();renderToday();
  var box=$$('jlist'),old=$$('rGuide');if(old)old.remove();
  var wait=JESTS.filter(function(j){return j.active&&j.raw.role==='guest'&&j.status==='Yanıt bekliyor'}).length;
  if(wait){var w=el('div','');w.id='rGuide';w.className='card';w.style.cssText='background:#FFE9D3;border-radius:16px;padding:12px 14px;margin-bottom:10px;font-weight:800';w.textContent='Yanıtını bekleyen '+wait+' davetin var. Açmak için dokun.';w.style.cursor='pointer';w.setAttribute('role','button');w.tabIndex=0;var wj=JESTS.filter(function(j){return j.active&&j.raw.role==='guest'&&j.status==='Yanıt bekliyor'})[0];w.onclick=function(){if(wj)openDetail(wj.id)};w.onkeydown=function(e){if(e.key==='Enter'&&wj)openDetail(wj.id)};box.parentNode.insertBefore(w,box)}
  if(!view.length){var e=document.querySelector('#jlist p.sub');if(e)e.textContent=homeTab==='a'?'Aktif jestin yok.':'Geçmiş jestin yok.';
    if(!JESTS.length&&homeTab==='a'){var g=el('div','');g.id='rGuide';g.className='card';g.style.cssText='border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px';
      g.appendChild(el('b','Nasıl çalışır?'));['1. Tanıdığın birini davet et: sadece buluşma ya da bir hedef koyup “başarırsan sana jest” de. Yeri (haritadan herhangi bir yer) ve saati seç.','2. O kabul edince (hedef varsa hedef onaylanınca) buluşun.','3. Buluşunca bir fotoğraf çekip yükleyin, QR açılır; mekân onaylayınca jest fiyatı geçerli olur. Ödeme mekânda yapılır, Jestora para tutmaz.'].forEach(function(t){g.appendChild(el('span',t))});
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

// ---- yer seçici ("Konum bul"): üye mekân ya da herhangi bir yer ----
function dec(x){x=x.replace(/\+/g,' ');try{return decodeURIComponent(x)}catch(e){return x}}
function parseMaps(val){
  val=val.trim().replace(/\s+/g,' ');var out={name:'',url:'',lat:null,lng:null,note:''};
  if(!/^https?:\/\//i.test(val)&&/^(www\.|maps\.|[a-z0-9-]+\.(google|apple|openstreetmap|yandex)\.[a-z.]+\/)\S*$/i.test(val))val='https://'+val;
  if(/^https?:\/\//i.test(val)){
    try{var u=new URL(val);
      if(/(^|\.)goo\.gl$|(^|\.)g\.co$|(^|\.)bit\.ly$/i.test(u.hostname)){out.note='Kısa bağlantılar okunamıyor. Haritalar\'da yeri açıp adres çubuğundaki uzun bağlantıyı kopyala ya da yerin adını yaz.';return out}
      var m=u.pathname.match(/\/place\/([^/]+)/),q=u.searchParams.get('query')||u.searchParams.get('q')||u.searchParams.get('destination')||u.searchParams.get('address')||'';
      var name=m?dec(m[1]):dec(q);
      var c=val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||val.match(/[?&](?:ll|mlat)=(-?\d+\.\d+)(?:,|&mlon=)(-?\d+\.\d+)/)||name.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
      if(c){out.lat=+c[1];out.lng=+c[2]}
      if(/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(name))name='Haritadan seçilen nokta';
      name=name.replace(/\s+/g,' ').trim();if(!name&&out.lat!=null)name='Haritadan seçilen nokta';
      if(name){out.name=name.slice(0,60);out.url=val.slice(0,400)}else out.note='Bağlantıda yer adı bulunamadı. Yerin adını yaz.';
    }catch(e){out.note='Bağlantı okunamadı. Yerin adını yaz.'}
  }else out.name=val.slice(0,60);
  return out}
function placePicker(p,init){
  var wrap=el('div','');wrap.style.cssText='display:flex;flex-direction:column;gap:10px';
  var sel=document.createElement('select');
  VEN.forEach(function(v){var o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.district+' · '+tl(v.normal)+' yerine '+tl(v.jest);sel.appendChild(o)});
  var oc=document.createElement('option');oc.value='0';oc.textContent='Başka bir yer (Konum bul)';sel.appendChild(oc);wrap.appendChild(sel);
  var box=el('div','');box.style.cssText='display:none;flex-direction:column;gap:10px;background:#fff;border-radius:16px;padding:12px';wrap.appendChild(box);
  box.appendChild(el('b','Konum bul'));
  var inp=document.createElement('input');inp.type='text';inp.maxLength=400;inp.autocomplete='off';inp.placeholder='Yer adı yaz veya Haritalar bağlantısını yapıştır';inp.setAttribute('aria-label','Yer adı veya Haritalar bağlantısı');box.appendChild(inp);
  var find=document.createElement('a');find.className='chip';find.textContent='Haritada ara';find.target='_blank';find.rel='noopener';find.style.cssText='text-decoration:none;text-align:center;display:block;box-sizing:border-box;font-weight:800';box.appendChild(find);
  var geo=btn('Yakınımdaki konumu kullan',function(){
    if(!navigator.geolocation){info.textContent='Bu cihaz konum vermiyor. Yer adını yaz.';return}
    geo.disabled=true;info.textContent='Konum aranıyor…';
    navigator.geolocation.getCurrentPosition(function(pos){geo.disabled=false;st.lat=+pos.coords.latitude.toFixed(5);st.lng=+pos.coords.longitude.toFixed(5);
      if(!st.name){st.name='Bulunduğum konum';inp.value=st.name;auto=true;setTimeout(function(){inp.focus();inp.select()},50)}
      info.textContent='Konum alındı: '+st.lat+', '+st.lng+(pos.coords.accuracy?' (yaklaşık '+Math.round(pos.coords.accuracy)+' m)':'')+'. Yerin adını düzeltebilirsin.';upd()},
      function(){geo.disabled=false;info.textContent='Konum izni verilmedi. Yer adını yazabilir ya da Haritalar bağlantısı yapıştırabilirsin.'},{enableHighAccuracy:false,timeout:8000,maximumAge:60000})},'chip');box.appendChild(geo);
  var info=el('p','1) Yer adını yaz. 2) Haritada ara ile kontrol et. İstersen Haritalar\'daki uzun bağlantıyı buraya yapıştır, yer adı otomatik gelir. Üye olmayan yerde normal ödeme geçerli, jest indirimi olmaz.','sub');info.style.fontSize='13px';box.appendChild(info);
  var st={name:'',url:'',lat:null,lng:null};var auto=false;
  function upd(){var q=st.name&&!st.url?st.name:(st.lat!=null?st.lat+','+st.lng:'kafe yakınımda');find.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)}
  inp.onfocus=function(){if(auto)inp.select()};inp.oninput=function(){auto=false;var r=parseMaps(inp.value);st.name=r.name;st.url=r.url;if(r.url){st.lat=r.lat;st.lng=r.lng}
    if(r.note)info.textContent=r.note;else if(r.url)info.textContent='Seçilen: '+r.name+(r.lat!=null?' · koordinat alındı':'');upd()};
  function show(){box.style.display=sel.value==='0'?'flex':'none'}
  sel.onchange=show;upd();
  if(init){if(init.custom){sel.value='0';st.name=init.name||'';st.url=init.url||'';st.lat=init.lat!=null?init.lat:null;st.lng=init.lng!=null?init.lng:null;inp.value=st.url||st.name;upd()}else sel.value=String(init.id)}
  show();p.appendChild(wrap);
  return {body:function(){return sel.value==='0'?{venueId:0,place:{name:st.name,url:st.url,lat:st.lat,lng:st.lng}}:{venueId:+sel.value}},
    check:function(){return sel.value==='0'&&st.name.trim().length<2?'Yerin adını yaz ya da bir üye mekân seç.':''}}}

// ---- fotoğraf: kameradan çek, küçült, yükle ----
function shrinkPhoto(file,cb,bad){
  var r=new FileReader();r.onerror=bad;r.onload=function(){var im=new Image();im.onerror=bad;im.onload=function(){
    var sc=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);var q=.72,d=c.toDataURL('image/jpeg',q);while(d.length>380000&&q>.35){q-=.1;d=c.toDataURL('image/jpeg',q)}cb(d)};im.src=r.result};r.readAsDataURL(file)}
function whereNow(cb){if(!navigator.geolocation)return cb(null);var done=false,t=setTimeout(function(){if(!done){done=true;cb(null)}},3500);
  navigator.geolocation.getCurrentPosition(function(p){if(done)return;done=true;clearTimeout(t);cb({lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)})},function(){if(done)return;done=true;clearTimeout(t);cb(null)},{timeout:3000,maximumAge:120000})}
function goalLine(i){var ach=i.dir==='me'?i.host.name:((i.guests[0]&&i.guests[0].name)||'Davetli'),bk=i.dir==='me'?((i.guests[0]&&i.guests[0].name)||'Davetli'):i.host.name;return {ach:ach,bk:bk,text:ach+' hedefi başarırsa '+bk+' ona bir jest verir.'}}
function mapsLink(v){if(v.url)return v.url;if(v.lat!=null&&v.lng!=null)return 'https://www.google.com/maps/search/?api=1&query='+v.lat+','+v.lng;return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name)}

// ---- yeni davet ----
function openNew(pre){
  var O=overlay(),p=O.p,guests=[],kind='meet',dir='me';
  p.appendChild(el('h2','Yeni jest daveti'));
  var kr=el('div','');kr.className='row';p.appendChild(kr);
  var kb=btn('Buluşma',function(){setKind('meet')},'chip'),kg=btn('Hedef jesti',function(){setKind('goal')},'chip');kb.id='kMeet';kg.id='kGoal';kr.appendChild(kb);kr.appendChild(kg);
  var kd=el('p','','sub');p.appendChild(kd);
  var gbox=el('div','');gbox.style.cssText='display:none;flex-direction:column;gap:8px';p.appendChild(gbox);
  var ds=document.createElement('select');ds.id='goalDir';[['me','Hedef benim: başarırsam sen bana jest ver'],['you','Hedef senin: başarırsan ben sana jest vereyim']].forEach(function(x){var o=document.createElement('option');o.value=x[0];o.textContent=x[1];ds.appendChild(o)});ds.onchange=function(){dir=ds.value};gbox.appendChild(ds);
  var gi=document.createElement('input');gi.type='text';gi.id='goalText';gi.maxLength=120;gi.placeholder='Hedef, örn. Sınavdan 70 almak';gi.setAttribute('aria-label','Hedef');gbox.appendChild(gi);
  gbox.appendChild(el('p','Jest küçük bir ikramdır. Bahis, ceza ya da borç yoktur; hedef tutmazsa kimse bir şey kaybetmez.','sub'));
  function setKind(k){kind=k;kb.setAttribute('aria-pressed',String(k==='meet'));kg.setAttribute('aria-pressed',String(k==='goal'));kb.style.outline=k==='meet'?'3px solid #FF7A1A':'none';kg.style.outline=k==='goal'?'3px solid #FF7A1A':'none';
    gbox.style.display=k==='goal'?'flex':'none';
    kd.textContent=k==='goal'?'Bir hedef koy, arkadaşın arkana dursun. Hedef onaylanınca buluşup jestini yaparsınız. Tek kişiyle yapılır.':'Tanıdığın birini davet et, telefon numarasını yaz. Henüz üye değilse, ona göndereceğin davet linki hazırlanır.';
    if(k==='goal'&&guests.length>1){guests.length=1;rg()}tl2.textContent=k==='goal'?'Jest ne zaman, nerede?':'Ne zaman?'}
  var gl=el('div','');gl.className='chips';p.appendChild(gl);
  var ph=document.createElement('input');ph.type='tel';ph.placeholder='Davet edilen: 5xx xxx xx xx';ph.inputMode='numeric';
  function lim(){return kind==='goal'?1:5}
  var add=btn('Ekle',function(){var d=ph.value.replace(/\D/g,'').replace(/^0/,'').replace(/^90/,'');
    if(!/^5\d{9}$/.test(d)){er.textContent='Telefon 5 ile başlayan 10 haneli olmalı.';return}
    if(guests.length>=lim()&&guests.indexOf(d)<0){er.textContent=kind==='goal'?'Hedef jesti tek kişiyle yapılır.':'En fazla 5 kişi.';return}
    if(guests.indexOf(d)<0)guests.push(d);ph.value='';er.textContent='';rg()},'chip');
  var r1=el('div','');r1.className='row';r1.appendChild(ph);r1.appendChild(add);p.appendChild(r1);
  if(navigator.contacts&&navigator.contacts.select){var pk=btn('Rehberden seç',function(){navigator.contacts.select(['tel'],{multiple:kind!=='goal'}).then(function(cs){var bad=0;cs.forEach(function(c){var t=(c.tel||[]).map(function(x){return String(x).replace(/\D/g,'').replace(/^90/,'').replace(/^0/,'')}).filter(function(x){return /^5\d{9}$/.test(x)})[0];if(t&&guests.indexOf(t)<0&&guests.length<lim())guests.push(t);else bad++});er.textContent=bad?'Cep numarası olmayan ya da sınırı aşan kişiler eklenmedi.':'';rg()}).catch(function(){})},'chip');pk.style.cssText='margin:8px 0';p.appendChild(pk)}
  function rg(){gl.innerHTML='';guests.forEach(function(g,k){var c=el('button','+90 '+g+' ✕','chip');c.type='button';c.onclick=function(){guests.splice(k,1);rg()};gl.appendChild(c)})}
  p.appendChild(el('h2','Nerede?'));
  var pp=placePicker(p,null);
  var tl2=el('h2','Ne zaman?');p.appendChild(tl2);
  var dt=document.createElement('input');dt.type='datetime-local';var d0=new Date();d0.setDate(d0.getDate()+1);d0.setHours(15,0,0,0);dt.value=dtl(d0);dt.min=dtl(Date.now()+900000);p.appendChild(dt);
  var er=errBox();p.appendChild(er);setKind('meet');
  if(pre){if(pre.kind==='goal')setKind('goal');if(pre.goal)gi.value=pre.goal;if(pre.guest&&/^5\d{9}$/.test(pre.guest)){guests.push(pre.guest);rg()}}
  var go2=btn('Daveti gönder',function(){
    if(ph.value.trim())add.onclick();if(!guests.length){er.textContent='En az bir kişi ekle.';return}
    if(kind==='goal'&&gi.value.trim().length<3){er.textContent='Hedefi yaz (en az 3 harf).';return}
    var pe=pp.check();if(pe){er.textContent=pe;return}
    go2.disabled=true;
    var body=Object.assign({kind:kind,at:new Date(dt.value).getTime(),guests:guests.map(function(g){return '0'+g})},pp.body());
    if(kind==='goal'){body.goal=gi.value.trim();body.dir=dir}
    api('POST','/api/invites',body).then(function(inv){close(O.o);load(true).then(function(){openDetail(inv.id)})})
    .catch(function(e){er.textContent=e.message;go2.disabled=false})});
  p.appendChild(go2);p.appendChild(btn('Vazgeç',function(){close(O.o)},'chip'));
}

// jest kartı: tamamlanan jestin paylaşılabilir görseli (fotoğraf içermez)
function cardCanvas(i){
  var W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#FFE9D3');g.addColorStop(1,'#FFB878');x.fillStyle=g;x.fillRect(0,0,W,H);
  function first(n){return String(n||'').trim().split(/\s+/)[0]}
  function wrap(t,mx,fs,y,lh){x.font='800 '+fs+'px system-ui,sans-serif';var w=String(t).split(' '),ln='';w.forEach(function(k){var tt=ln?ln+' '+k:k;if(x.measureText(tt).width>mx&&ln){x.fillText(ln,W/2,y);y+=lh;ln=k}else ln=tt});x.fillText(ln,W/2,y);return y+lh}
  x.textAlign='center';x.fillStyle='#0F1B3D';
  x.font='900 64px system-ui,sans-serif';x.fillText('Bir jest yaptık',W/2,250);
  var names=[first(i.host.name)].concat(i.guests.filter(function(g){return g.status==='accepted'}).map(function(g){return first(g.name)}));
  var y=wrap(names.join(' + '),900,96,470,116);
  if(i.kind==='goal'&&i.goal){x.font='700 52px system-ui,sans-serif';y=wrap('Hedef: '+i.goal,880,52,y+40,70)}
  x.font='700 46px system-ui,sans-serif';y=wrap(i.venue.name,880,46,y+50,62);
  var d=new Date(i.at);x.font='600 44px system-ui,sans-serif';x.fillText(d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear(),W/2,y+30);
  x.font='900 72px system-ui,sans-serif';x.fillStyle='#FF7A1A';x.fillText('Jestora',W/2,H-170);
  x.font='600 36px system-ui,sans-serif';x.fillStyle='#0F1B3D';x.fillText('Küçük bir jest, güzel bir gün.',W/2,H-110);
  return c}
function shareCard(i){var c=cardCanvas(i);
  c.toBlob(function(b){if(!b)return;var f;try{f=new File([b],'jestora-jest.png',{type:'image/png'})}catch(e){f=null}
    if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],text:'Jestora ile bir jest yaptık.'}).catch(function(){})}
    else{var O=overlay(),p=O.p;p.appendChild(el('h2','Jest kartın'));var im=document.createElement('img');im.src=URL.createObjectURL(b);im.alt='Jest kartı';im.style.cssText='width:100%;border-radius:16px';im.id='cardImg';p.appendChild(im);p.appendChild(el('p','Görsele uzun basıp kaydedebilir, sonra paylaşabilirsin.','sub'));p.appendChild(btn('Kapat',function(){close(O.o)},'chip'))}},'image/png')}
window.jestCardCanvas=cardCanvas;
// ---- ayrıntı ----
function openDetail(id){
  if(!VEN.length){api('GET','/api/venues').then(function(j){VEN=j.venues;openDetail(id)});return}
  var O=overlay(),p=O.p;
  function render(i){
    p.innerHTML='';var me=window.JEST_ME||{},cu=i.venue.custom;
    p.appendChild(el('h2',cu?i.venue.name:i.venue.name+' · '+i.venue.district));
    if(cu){var ml=document.createElement('a');ml.textContent='Haritada aç';ml.href=mapsLink(i.venue);ml.target='_blank';ml.rel='noopener';ml.style.cssText='color:#FF7A1A;font-weight:700';p.appendChild(ml)}
    p.appendChild(el('p',fmt(i.at),'big'));
    p.appendChild(el('p',cu?'Üye olmayan yer: normal ödeme geçerli, jest indirimi yok. Jestora para tutmaz.':'Normal fiyat '+tl(i.venue.normal)+', jest fiyatı '+tl(i.venue.jest)+'. Ödeme mekânda yapılır, Jestora para tutmaz.','sub'));
    p.appendChild(el('div','Davet sahibi: '+i.host.name+(i.role==='host'?' (sen)':'')));
    if(i.status==='confirmed'){var cb=btn('Jest kartı paylaş',function(){shareCard(i)},'chip');cb.id='cardBtn';p.appendChild(cb)}
    var mine=i.guests.filter(function(g){return g.id===me.id})[0];
    var anyAcc=i.guests.some(function(g){return g.status==='accepted'});
    var im=function(){return i.role==='host'||(mine&&mine.status==='accepted')};
    i.guests.forEach(function(g){var r=el('div','');r.className='gl';r.appendChild(el('span',g.name+(g.id===me.id?' (sen)':'')));
      var tx={pending:'Bekliyor',accepted:'Kabul etti',declined:'Reddetti',proposed:'Yeni saat önerdi: '+(g.proposal_at?fmt(g.proposal_at):'')}[g.status];r.appendChild(el('b',tx));p.appendChild(r)});
    var er=errBox();
    function act(a,extra){return function(){api('POST','/api/invites/'+i.id+'/respond',Object.assign({action:a},extra||{})).then(function(){return api('GET','/api/invites/'+i.id)}).then(function(n){render(n);load(true)}).catch(function(e){er.textContent=e.message})}}
    function post(path,body){return function(){api('POST','/api/invites/'+i.id+path,body||{}).then(function(){return api('GET','/api/invites/'+i.id)}).then(function(n){render(n);load(true)}).catch(function(e){er.textContent=e.message})}}
    // hedef bloğu
    if(i.kind==='goal'){var gb=el('div','');gb.className='okb';gb.style.background='#FFF0DC';gb.id='goalBox';var gln=goalLine(i);
      gb.appendChild(el('b','Hedef: '+i.goal));gb.appendChild(el('div',gln.text));
      var gs=i.goalStatus,amAch=i.achieverId===me.id,amBk=im()&&!amAch&&anyAcc;
      if(i.status==='cancelled'){}
      else if(!anyAcc){gb.appendChild(el('div','Davet kabul edilince hedef başlar.','sub'))}
      else if(gs==='active'){
        if(amAch){var nt=document.createElement('input');nt.id='goalNote';nt.maxLength=140;nt.placeholder='İstersen kısa bir not (örn. 82 aldım)';nt.style.marginTop='8px';gb.appendChild(nt);
          var gc=btn('Hedefi yaptım',function(){post('/goal',{action:'claim',note:nt.value})()});gc.style.marginTop='8px';gb.appendChild(gc)}
        else gb.appendChild(el('div',gln.ach+' hedefi bitirince burada bildirecek.','sub'))}
      else if(gs==='claimed'){
        gb.appendChild(el('div',gln.ach+' hedefi yaptığını bildirdi'+(i.goalNote?': “'+i.goalNote+'”':'')+'.'));
        if(amBk){var rw=el('div','');rw.className='row';rw.style.marginTop='8px';rw.appendChild(btn('Onayla',post('/goal',{action:'approve'})));rw.appendChild(btn('Henüz değil',post('/goal',{action:'reopen'}),'chip'));gb.appendChild(rw)}
        else gb.appendChild(el('div','Onay bekleniyor.','sub'))}
      else if(gs==='approved'){gb.appendChild(el('b','✓ Hedef onaylandı. Şimdi jesti yapma zamanı.'))}
      p.appendChild(gb)}
    if(i.role==='host'&&i.invited&&i.invited.length){
      p.appendChild(el('h2','Henüz Jestora üyesi olmayanlar'));
      p.appendChild(el('p','Linki kendi WhatsApp\'ından sen gönderirsin. Link yalnızca bu numaraya özeldir ve bir kez kullanılır.','sub'));
      i.invited.forEach(function(x){
        var link=location.origin+'/?davet='+x.token;
        var msg=i.kind==='goal'?'Merhaba! Jestora\'da sana bir hedef jesti önerdim. '+(i.dir==='me'?'Hedefim: '+i.goal+'. Başarırsam sen bana bir jest verirsin.':'Senin hedefin: '+i.goal+'. Başarırsan ben sana bir jest veririm.')+' Jest: '+i.venue.name+', '+fmt(i.at)+'. Linke dokunup kayıt ol, davetini görürsün: '+link
          :'Merhaba! Seni Jestora\'da bir jest\'e davet ettim: '+i.venue.name+', '+fmt(i.at)+'. Linke dokunup kayıt ol, davetini görürsün: '+link;
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
    if(i.status==='confirmed'){
      var rc=el('div','');rc.className='okb';
      rc.textContent=cu?(i.kind==='goal'?'Hedef jesti tamamlandı. Buluşma onaylandı. Üye olmayan yerde normal ödeme geçerli.':'Buluşma onaylandı. Üye olmayan yerde normal ödeme geçerli.'):'Jest onaylandı. Mekânda ödeyeceğin tutar '+tl(i.venue.jest)+'. Normal fiyat '+tl(i.venue.normal)+', kazancın '+tl(i.venue.normal-i.venue.jest)+'.';p.appendChild(rc);
      if(i.photoReady)loadPhotos(i,p)}
    else if(i.status==='cancelled'){p.appendChild(el('p','Bu davet geri çekildi.','sub'))}
    else{
      if(i.role==='guest'){
        var row=el('div','');row.className='row';
        if(!mine||mine.status!=='accepted')row.appendChild(btn('Kabul et',act('accept')));
        if(!mine||mine.status!=='declined')row.appendChild(btn('Reddet',act('decline'),'chip'));p.appendChild(row);
        if(!mine||mine.status!=='accepted'){p.appendChild(el('h2','Başka bir saat öner'));
        var d=document.createElement('input');d.type='datetime-local';d.value=dtl(i.at+7200000);d.min=dtl(Date.now()+900000);p.appendChild(d);
        p.appendChild(btn('Saati öner',function(){act('propose',{at:new Date(d.value).getTime()})()},'chip'))}
      }else{
        i.guests.filter(function(g){return g.status==='proposed'}).forEach(function(g){
          p.appendChild(btn(g.name+' için '+fmt(g.proposal_at)+' saatini kabul et',act('accept-proposal',{guestId:g.id}),'btn'))});
        var ed=el('div','');ed.className='row';p.appendChild(ed);
        p.appendChild(btn('Saati veya yeri değiştir',function(){editInv(i,O)},'chip'));
        p.appendChild(btn('Daveti geri çek',function(){api('POST','/api/invites/'+i.id+'/cancel').then(function(){close(O.o);load(true)}).catch(function(e){er.textContent=e.message})},'chip'));
      }
      var can=im()&&(i.role==='host'?anyAcc:true);
      if(can&&i.kind==='goal'&&!i.goalOk){p.appendChild(el('p','Hedef onaylanınca buluşma adımları (fotoğraf, QR) açılır.','sub'))}
      else if(can){
        p.appendChild(el('h2','Buluşma anı'));
        var inWin=Math.abs(Date.now()-i.at)<=6*3600000;
        if(!i.photoReady){
          p.appendChild(el('p','1) Buluşunca birlikte bir fotoğraf çek ve yükle. '+(cu?'2) Fotoğraftan sonra iki taraf da “Buluştuk” der.':'2) Fotoğraf yüklenince QR kodun açılır.'),'sub'));
          if(!inWin){p.appendChild(el('p','Fotoğraf adımı jest saatinde açılır (saatten 6 saat önce başlar).','sub'))}
          else{
            var cr=document.createElement('label');cr.style.cssText='display:flex;gap:8px;align-items:flex-start;font-size:14px';var cb=document.createElement('input');cb.type='checkbox';cb.id='photoOk';cb.style.cssText='width:auto;margin-top:3px';cr.appendChild(cb);cr.appendChild(el('span','Fotoğrafın bu jestin tarafları (davet sahibi ve misafir) ile paylaşılmasını onaylıyorum. Fotoğraftaki kişilerin de haberi var. Fotoğraf yalnızca bu iki tarafa görünür ve 7 gün sonra silinir.'));p.appendChild(cr);
            var fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.setAttribute('capture','environment');fi.id='photoFile';fi.style.display='none';p.appendChild(fi);
            var pb=btn('Fotoğraf çek ve yükle',function(){if(!cb.checked){er.textContent='Önce paylaşım onay kutusunu işaretle.';return}er.textContent='';fi.click()});pb.id='photoBtn';p.appendChild(pb);
            fi.onchange=function(){var f=fi.files&&fi.files[0];if(!f)return;pb.disabled=true;er.textContent='Fotoğraf hazırlanıyor…';
              shrinkPhoto(f,function(data){whereNow(function(ll){var b={image:data,consent:true};if(ll){b.lat=ll.lat;b.lng=ll.lng}
                api('POST','/api/invites/'+i.id+'/photo',b).then(function(){return api('GET','/api/invites/'+i.id)}).then(function(n){render(n);load(true)}).catch(function(e){er.textContent=e.message;pb.disabled=false})})},function(){er.textContent='Fotoğraf okunamadı, tekrar dene.';pb.disabled=false})}}
        }else{
          loadPhotos(i,p);
          if(cu){
            var iMet=i.scanned.indexOf(me.id)>-1;
            if(iMet)p.appendChild(el('p','Onayladın. Diğer tarafın “Buluştuk” demesi bekleniyor.','sub'));
            else p.appendChild(btn('Buluştuk',post('/met')));
          }else{
            p.appendChild(el('p','Fotoğraf yüklendi, QR açıldı. Mekânda görevliye QR kodunu göster. Hem sen hem davet sahibi/misafir okutunca jest onaylanır.','sub'));
            p.appendChild(btn('QR kodumu göster',function(){showQR(i)}))}
        }
      }
    }
    p.appendChild(er);p.appendChild(btn('Kapat',function(){close(O.o)},'chip'));
  }
  api('GET','/api/invites/'+id).then(function(i){render(i);
    O.o._t.push(setInterval(function(){if(!document.body.contains(O.o))return;if(document.activeElement&&document.activeElement.id==='goalNote')return;api('GET','/api/invites/'+id).then(function(n){var sig=function(x){return JSON.stringify([x.status,x.guests,x.invited,x.goalStatus,x.photos,x.scanned,x.at])};if(sig(n)!==sig(i)){i=n;if(!document.querySelector('.qrov'))render(n);load(true)}}).catch(function(){})},6000))
  }).catch(function(e){p.appendChild(el('p',e.message));p.appendChild(btn('Kapat',function(){close(O.o)},'chip'))});
}
function loadPhotos(i,p){
  var box=el('div','');box.id='photoBox';box.style.cssText='display:flex;gap:8px;flex-wrap:wrap';p.appendChild(box);
  api('GET','/api/invites/'+i.id+'/photos').then(function(j){j.photos.forEach(function(x){var f=el('figure','');f.style.cssText='margin:0;flex:1 1 120px;max-width:200px';var im=document.createElement('img');im.src=x.image;im.alt='Buluşma fotoğrafı: '+x.name;im.style.cssText='width:100%;border-radius:12px;display:block';f.appendChild(im);var c=el('figcaption',x.name+' · '+fmt(x.at));c.style.cssText='font-size:12px;color:#5B6482';f.appendChild(c);box.appendChild(f)})}).catch(function(){})}
function editInv(i,O0){
  var O=overlay(),p=O.p;p.appendChild(el('h2','Daveti düzenle'));p.appendChild(el('p','Değişiklikten sonra davet edilenlerin yeniden yanıt vermesi gerekir. Yüklenmiş buluşma fotoğrafı varsa silinir.','sub'));
  var pp=placePicker(p,i.venue);
  var dt=document.createElement('input');dt.type='datetime-local';dt.value=dtl(i.at);dt.min=dtl(Date.now()+900000);p.appendChild(dt);var er=errBox();p.appendChild(er);
  p.appendChild(btn('Kaydet',function(){var pe=pp.check();if(pe){er.textContent=pe;return}api('POST','/api/invites/'+i.id+'/edit',Object.assign({at:new Date(dt.value).getTime()},pp.body())).then(function(){close(O.o);close(O0.o);load(true).then(function(){openDetail(i.id)})}).catch(function(e){er.textContent=e.message})}));
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
