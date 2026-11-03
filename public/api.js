// Jestora gerçek sunucu bağlantısı: giriş ve kayıt. Davet ekranları sonraki adımda bağlanacak.
(function(){
var TK='jest-token',CFG={dev:false,closed:false,ageSelf:false};
function tok(){try{return localStorage.getItem(TK)||''}catch(e){return ''}}
function setTok(t){try{if(t)localStorage.setItem(TK,t);else localStorage.removeItem(TK)}catch(e){}}
window.jestApi=function(m,p,b){
  var h={'content-type':'application/json'};if(tok())h.authorization='Bearer '+tok();
  return fetch(p,{method:m,headers:h,body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok){var e=new Error(j.error||'Bir hata oldu');e.status=r.status;throw e}return j})})};
var api=window.jestApi;
function phone(){return '0'+$('ph').value.replace(/\D/g,'')}
function ageToken(){return CFG.dev?'DEV-AGE-OK':(CFG.ageSelf?'BEYAN':'')}

// kapalı pilot için davet kodu alanı
var LINK={token:'',info:null};
try{var qs=new URLSearchParams(location.search).get('davet');if(qs&&/^[a-f0-9]{24}$/.test(qs)){LINK.token=qs;localStorage.setItem('jest-davet',qs)}else{var sv=localStorage.getItem('jest-davet');if(sv&&/^[a-f0-9]{24}$/.test(sv))LINK.token=sv}}catch(e){}
function linkDone(){LINK={token:'',info:null};try{localStorage.removeItem('jest-davet');if(location.search)history.replaceState(null,'',location.pathname)}catch(e){}var b=$('linkBox');if(b)b.remove()}
function showLinkBox(){
  var old=$('linkBox');if(old)old.remove();if(!LINK.token)return;
  var d=document.createElement('div');d.id='linkBox';d.style.cssText='background:#FFE9D3;border-radius:16px;padding:12px 14px;margin:0 0 12px;font-weight:700';
  if(LINK.info)d.textContent=LINK.info.host+' seni Jestora\'ya davet etti: '+LINK.info.venue+', '+new Date(LINK.info.at).toLocaleString('tr-TR',{day:'numeric',month:'long',weekday:'long',hour:'2-digit',minute:'2-digit'})+'. Kayıt olurken, davetin yazıldığı numarayı kullan (…'+LINK.info.phoneEnd+' ile biten).';
  else d.textContent='Bir davet seni bekliyor. Kayıt olurken davetin yazıldığı numarayı kullan.';
  var t=$('authTitle');t.parentNode.insertBefore(d,t.nextSibling)}
function loadLink(){if(!LINK.token)return;api('GET','/api/link/'+LINK.token).then(function(j){LINK.info=j;showLinkBox()}).catch(function(e){var t=LINK.token;LINK.token='';try{localStorage.removeItem('jest-davet')}catch(x){}var d=$('linkBox');if(d)d.remove();window.authUI&&window.authUI();var er=$('aerr');if(er)er.textContent=e.message})}
function addInviteRow(){
  if(!CFG.closed||LINK.token||$('invRow'))return;
  var d=document.createElement('div');d.className='f';d.id='invRow';
  d.innerHTML='<label for="inv">Davet kodu</label><input type="text" id="inv" maxlength="20" autocomplete="off" autocapitalize="characters" placeholder="Pilot davet kodun"><small>Jestora şu an kapalı pilotta. Kodu sana Jestora ekibi verdi.</small>';
  $('phoneRow').parentNode.insertBefore(d,$('phoneRow'));
}
var oldUI=window.authUI;
window.authUI=function(){oldUI();if(CFG&&CFG.pilot){$('authGo').textContent='Devam';var ft=document.querySelector('footer');if(ft)ft.textContent='Kapalı pilot: SMS gönderilmez. Kayıtta seçtiğin 6–8 haneli PIN ile giriş yaparsın. Telefon numaran yalnızca hesabını doğrulamak için kullanılır.'}addInviteRow();var r=$('invRow');if(r)r.hidden=authMode!=='up'||!!LINK.token;showLinkBox();if($('inv'))$('inv').readOnly=false};

window.sendCode=function(){
  var rb=$('otpResend');rb.disabled=true;
  if(CFG.pilot){var lb=document.querySelector('label[for="otp"]');if(lb)lb.textContent=authMode==='up'?'Kendi PIN\'ini seç (6–8 rakam)':'PIN';rb.hidden=true;$('otpHint').textContent=authMode==='up'?'Sonraki girişlerde bu PIN ile gireceksin. Unutma.':'Kayıt olurken seçtiğin PIN.';return}
  api('POST','/api/code',{phone:phone()}).then(function(j){
    $('otpHint').textContent=j.pilot?(authMode==='up'?'Kendine 6–8 haneli bir PIN seç. Sonraki girişlerde bunu kullanacaksın. Unutma.':'PIN\'ini yaz.'):j.devCode?'Deneme sürümü: SMS gönderilmez, kod '+j.devCode+'.':'+90 '+$('ph').value+' numarasına SMS gönderildi.';
    var left=30;rb.textContent='Tekrar gönder ('+left+')';clearInterval(otpTimer);
    otpTimer=setInterval(function(){left--;if(left<=0){clearInterval(otpTimer);rb.disabled=false;rb.textContent='Tekrar gönder'}else rb.textContent='Tekrar gönder ('+left+')'},1000);
  }).catch(function(e){$('aerr').textContent=e.message;rb.disabled=false;rb.textContent='Tekrar gönder'});
};

window.authSubmit=function(e){
  e.preventDefault();
  var up=authMode==='up';
  if(authStage===0){
    var fn=$('fn').value.trim().replace(/\s+/g,' '),m='';
    if(up){if(!nameOk(fn))m=fn.length<2?'Adını ve soyadını yaz.':'Ad yalnızca harf, boşluk, nokta ve kesme işareti içerebilir.'}
    if(!m&&!/^5\d{9}$/.test(fmtPh()))m='Telefon numarası 5 ile başlayan 10 haneli olmalı.';
    if(!m&&up&&CFG.closed&&!LINK.token&&!($('inv')&&$('inv').value.trim()))m='Davet kodunu yaz.';
    if(!m&&up&&!$('kv').checked)m='Aydınlatma metnini ve kullanım şartlarını onaylamalısın.';
    $('aerr').textContent=m;if(m)return;
    authStage=1;['fn','u','ph'].forEach(function(i){$(i).readOnly=true});if($('inv'))$('inv').readOnly=true;
    $('otpRow').hidden=false;$('authGo').textContent='Doğrula';sendCode();$('otp').focus();return}
  var c=$('otp').value.replace(/\D/g,'');
  if(c.length<6||c.length>8){$('aerr').textContent=CFG.pilot?'PIN 6 ile 8 rakam olmalı.':'6 haneli kodu yaz.';return}
  $('aerr').textContent='';
  if(up&&!AGEOK){clearInterval(otpTimer);$('authForm').hidden=true;$('ageBox').hidden=false;$('ageErr').textContent='';return}
  var body={phone:phone(),code:c};if(LINK.token)body.linkToken=LINK.token;
  if(up){body.name=$('fn').value.trim().replace(/\s+/g,' ');body.terms=true;body.ageToken=ageToken();body.inviteCode=$('inv')?$('inv').value.trim():''}
  $('authGo').disabled=true;
  api('POST','/api/verify',body).then(function(j){
    if(LINK.token)linkDone();setTok(j.token);window.JEST_ME=j.user;S.user=j.user.username;S.name=j.user.name;saveSess();clearInterval(otpTimer);
    $('hello').textContent='Merhaba, '+dname();otpReset();renderHome();go(7);
  }).catch(function(er){
    var msg=er.message;
    if(!up&&/Adını yaz/.test(msg))msg='Bu numara kayıtlı değil. Önce Kayıt ol sekmesini seç.';
    if(up&&AGEOK){$('ageBox').hidden=true;$('authForm').hidden=false}
    if(/Kod/.test(msg)||/deneme/.test(msg)){authStage=1}
    AGEOK=false;$('aerr').textContent=msg;
  }).then(function(){$('authGo').disabled=false});
};
$('authGo').onclick=window.authSubmit;
$('authForm').onkeydown=function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox')window.authSubmit(e)};
$('ageOk').onclick=function(){AGEOK=true;window.authSubmit({preventDefault:function(){}})};
$('ageOk').textContent=CFG.dev?'e-Devlet\'ten belirteç al (deneme: 18+)':'18 yaşından büyük olduğumu beyan ederim';
$('logout').onclick=function(){api('POST','/api/logout').catch(function(){}).then(function(){setTok('');S.user='';try{localStorage.removeItem('jest-demo-oturum')}catch(e){}authUI();go(0)})};

api('GET','/api/config').then(function(c){
  CFG=c;loadLink();
  $('ageOk').textContent=c.dev?'e-Devlet\'ten belirteç al (deneme: 18+)':'18 yaşından büyük olduğumu beyan ederim';
  window.authUI();
  if(tok()){api('GET','/api/me').then(function(j){window.JEST_ME=j.user;S.user=j.user.username;S.name=j.user.name;saveSess();$('hello').textContent='Merhaba, '+dname();renderHome();go(7)}).catch(function(){setTok('');try{localStorage.removeItem('jest-demo-oturum')}catch(e){}window.authUI();go(0)})}
  else{try{localStorage.removeItem('jest-demo-oturum')}catch(e){}window.authUI();go(0)}
}).catch(function(){});
})();
