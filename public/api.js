// JEST gerçek sunucu bağlantısı: giriş ve kayıt. Davet ekranları sonraki adımda bağlanacak.
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
function addInviteRow(){
  if(!CFG.closed||$('invRow'))return;
  var d=document.createElement('div');d.className='f';d.id='invRow';
  d.innerHTML='<label for="inv">Davet kodu</label><input type="text" id="inv" maxlength="20" autocomplete="off" autocapitalize="characters" placeholder="Pilot davet kodun"><small>JEST şu an kapalı pilotta. Kodu sana JEST ekibi verdi.</small>';
  $('phoneRow').parentNode.insertBefore(d,$('phoneRow'));
}
var oldUI=window.authUI;
window.authUI=function(){oldUI();addInviteRow();var r=$('invRow');if(r)r.hidden=authMode!=='up';if($('inv'))$('inv').readOnly=false};

window.sendCode=function(){
  var rb=$('otpResend');rb.disabled=true;
  api('POST','/api/code',{phone:phone()}).then(function(j){
    $('otpHint').textContent=j.devCode?'Deneme sürümü: SMS gönderilmez, kod '+j.devCode+'.':'+90 '+$('ph').value+' numarasına SMS gönderildi.';
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
    if(!m&&up&&CFG.closed&&!($('inv')&&$('inv').value.trim()))m='Davet kodunu yaz.';
    if(!m&&up&&!$('kv').checked)m='Aydınlatma metnini ve kullanım şartlarını onaylamalısın.';
    $('aerr').textContent=m;if(m)return;
    authStage=1;['fn','u','ph'].forEach(function(i){$(i).readOnly=true});if($('inv'))$('inv').readOnly=true;
    $('otpRow').hidden=false;$('authGo').textContent='Doğrula';sendCode();$('otp').focus();return}
  var c=$('otp').value.replace(/\D/g,'');
  if(c.length!==6){$('aerr').textContent='6 haneli kodu yaz.';return}
  $('aerr').textContent='';
  if(up&&!AGEOK){clearInterval(otpTimer);$('authForm').hidden=true;$('ageBox').hidden=false;$('ageErr').textContent='';return}
  var body={phone:phone(),code:c};
  if(up){body.name=$('fn').value.trim().replace(/\s+/g,' ');body.terms=true;body.ageToken=ageToken();body.inviteCode=$('inv')?$('inv').value.trim():''}
  $('authGo').disabled=true;
  api('POST','/api/verify',body).then(function(j){
    setTok(j.token);window.JEST_ME=j.user;S.user=j.user.username;S.name=j.user.name;saveSess();clearInterval(otpTimer);
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
  CFG=c;
  $('ageOk').textContent=c.dev?'e-Devlet\'ten belirteç al (deneme: 18+)':'18 yaşından büyük olduğumu beyan ederim';
  window.authUI();
  if(tok()){api('GET','/api/me').then(function(j){window.JEST_ME=j.user;S.user=j.user.username;S.name=j.user.name;saveSess();$('hello').textContent='Merhaba, '+dname();renderHome();go(7)}).catch(function(){setTok('');try{localStorage.removeItem('jest-demo-oturum')}catch(e){}window.authUI();go(0)})}
  else{try{localStorage.removeItem('jest-demo-oturum')}catch(e){}window.authUI();go(0)}
}).catch(function(){});
})();
