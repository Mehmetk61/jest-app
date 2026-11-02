process.env.JEST_DEV='1';process.env.JEST_DB=':memory:';process.env.JEST_KODLAR='DENEME1';
const {chromium}=require('playwright');const {server,db}=require('./server.js');
server.listen(0,async()=>{
 const base='http://localhost:'+server.address().port;
 const b=await chromium.launch();const errs=[];
 async function user(name,phone){
  const ctx=await b.newContext({viewport:{width:420,height:900}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));
  await p.goto(base+'/');await p.waitForTimeout(700);
  await p.fill('#fn',name);await p.fill('#ph',phone);await p.check('#kv');await p.fill('#inv','DENEME1');
  await p.click('#authGo');await p.waitForTimeout(500);await p.fill('#otp','123456');await p.click('#authGo');await p.click('#ageOk');await p.waitForTimeout(1200);
  return p}
 const A=await user('Ayşe Kaya','5321110000'),B=await user('Mehmet Öz','5322220000');
 await A.click('#newJ');await A.waitForTimeout(500);
 await A.fill('.rpn input[type=tel]','5322220000');await A.click('.rpn .chip');
 await A.click('.rpn .btn');await A.waitForTimeout(1500);
 console.log('A detay:',(await A.textContent('.rpn')).slice(0,160));
 await A.screenshot({path:'/tmp/e2e1.png'});
 await A.click('.rpn .chip:last-child').catch(()=>{});
 await B.reload();await B.waitForTimeout(1500);
 console.log('B liste:',(await B.textContent('#jlist')).trim().slice(0,100));
 await B.click('#jlist .jcard');await B.waitForTimeout(600);
 await B.click('.rpn >> text=Kabul et');await B.waitForTimeout(800);
 console.log('B sonra:',(await B.textContent('.rpn')).includes('Kabul etti'));
 await B.screenshot({path:'/tmp/e2e2.png'});
 // QR ve mekân onayı
 await A.reload();await A.waitForTimeout(1500);await A.click('#jlist .jcard');await A.waitForTimeout(600);
 console.log('A görür:',(await A.textContent('.rpn')).includes('Kabul etti'));
 await A.click('.rpn >> text=QR kodumu göster');await A.waitForTimeout(800);
 const svgA=await A.$('.qrb svg');console.log('A QR var:',!!svgA);
 const tokA=await A.evaluate(async()=>{const t=localStorage.getItem('jest-token');const id=JESTS[0].id;const r=await fetch('/api/invites/'+id+'/qr',{headers:{authorization:'Bearer '+t}});return (await r.json()).token});
 await B.click('.rpn >> text=Kapat');await B.click('#jlist .jcard');await B.waitForTimeout(500);await B.click('.rpn >> text=QR kodumu göster');
 const tokB=await B.evaluate(async()=>{const t=localStorage.getItem('jest-token');const id=JESTS[0].id;const r=await fetch('/api/invites/'+id+'/qr',{headers:{authorization:'Bearer '+t}});return (await r.json()).token});
 db.prepare('UPDATE invites SET at=?').run(Date.now()+600000);
 const sc=async t=>(await fetch(base+'/api/venue/scan',{method:'POST',headers:{'content-type':'application/json','x-venue-key':'venue-moda'},body:JSON.stringify({token:t})})).json();
 console.log('1. okutma:',JSON.stringify(await sc(tokA)));console.log('2. okutma:',JSON.stringify(await sc(tokB)));
 await B.waitForTimeout(4500);console.log('B QR ekranı:',(await B.textContent('.qrov')).slice(0,80));
 await B.screenshot({path:'/tmp/e2e3.png'});
 console.log('JS hataları:',errs);
 await b.close();server.close()});
