process.env.JEST_DEV='1';process.env.JEST_DB=':memory:';process.env.JEST_KODLAR='DENEME1';
const {chromium}=require('playwright');const {server}=require('./server.js');
server.listen(0,async()=>{const base='http://localhost:'+server.address().port;const b=await chromium.launch();const errs=[];
 async function user(name,phone){const p=await (await b.newContext({viewport:{width:420,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+'/');await p.waitForTimeout(700);await p.fill('#fn',name);await p.fill('#ph',phone);await p.check('#kv');await p.fill('#inv','DENEME1');
  await p.click('#authGo');await p.waitForTimeout(400);await p.fill('#otp','123456');await p.click('#authGo');await p.click('#ageOk');await p.waitForTimeout(1500);return p}
 const A=await user('Ayşe Kaya','5321110000');const B=await user('Mehmet Öz','5322220000');
 await A.waitForTimeout(2500);await A.screenshot({path:'/tmp/u1.png',fullPage:true});
 console.log('rehber:',await A.isVisible('#rGuide'),'| ana ekrana ekle:',await A.isVisible('#rInst'));
 await A.click('#newJ');await A.fill('.rpn input[type=tel]','5322220000');await A.click('.rpn .chip');await A.click('.rpn .btn');await A.waitForTimeout(1500);
 await A.click('.rpn >> text=Saati veya yeri değiştir');await A.waitForTimeout(400);await A.screenshot({path:'/tmp/u2.png'});
 await A.click('.rpn >> text=Kaydet');await A.waitForTimeout(1200);console.log('düzenleme sonrası ayrıntı:',(await A.textContent('.rpn')).slice(0,50));
 await B.reload();await B.waitForTimeout(1800);console.log('B bekleyen uyarısı:',(await B.textContent('#rGuide')).trim());
 console.log('JS hataları:',errs);await b.close();server.close()});
