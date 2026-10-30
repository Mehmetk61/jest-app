process.env.JEST_DEV='1';process.env.JEST_DB=':memory:';process.env.JEST_SECRET='t';
const assert=require('node:assert/strict');const {server,db}=require('./server.js');
server.listen(0,async()=>{const base='http://localhost:'+server.address().port;
const api=async(m,p,b,h={})=>{const r=await fetch(base+p,{method:m,headers:{'content-type':'application/json',...h},body:b?JSON.stringify(b):undefined});return{s:r.status,j:await r.json()}};
const login=async(phone,name,extra={})=>{await api('POST','/api/code',{phone});
 const r=await api('POST','/api/verify',{phone,code:'123456',name,terms:true,ageToken:'DEV-AGE-OK',...extra});assert.equal(r.s,200,JSON.stringify(r.j));return{h:{authorization:'Bearer '+r.j.token},u:r.j.user}};
try{
 process.env.X=1;
 // 18+ ve onay zorunlu
 await api('POST','/api/code',{phone:'05321110000'});
 assert.equal((await api('POST','/api/verify',{phone:'05321110000',code:'123456',name:'Ayşe',terms:true})).s,403);
 assert.equal((await api('POST','/api/verify',{phone:'05321110000',code:'123456',name:'Ayşe',ageToken:'DEV-AGE-OK'})).s,400);
 assert.equal((await api('POST','/api/verify',{phone:'05321110000',code:'000000',name:'Ayşe',terms:true,ageToken:'DEV-AGE-OK'})).s,400);
 const A=await login('05321110000','Ayşe Kaya');assert.equal(A.u.username,'ayse.kaya');
 const B=await login('05322220000','Mehmet Öz');
 const A2=await login('05321110000','x');assert.equal(A2.u.id,A.u.id);          // aynı numara = aynı hesap
 const venues=(await api('GET','/api/venues')).j.venues;const v=venues[0];assert.equal(v.normal-v.jest,20);
 const at=Date.now()+3600000;
 // davet
 assert.equal((await api('POST','/api/invites',{venueId:v.id,at,guests:['05329999999']},A.h)).s,400);   // üye değil
 assert.equal((await api('POST','/api/invites',{venueId:v.id,at:Date.now()-1,guests:['05322220000']},A.h)).s,400);
 const inv=(await api('POST','/api/invites',{venueId:v.id,at,guests:['05322220000']},A.h)).j;assert.equal(inv.guests[0].status,'pending');
 assert.equal((await api('GET','/api/invites/'+inv.id,null,(await login('05323330000','Zeynep')).h)).s,403); // yabancı göremez
 // önerilen saat
 const at2=at+7200000;
 await api('POST',`/api/invites/${inv.id}/respond`,{action:'propose',at:at2},B.h);
 await api('POST',`/api/invites/${inv.id}/respond`,{action:'accept-proposal',guestId:B.u.id},A.h);
 assert.equal((await api('GET','/api/invites/'+inv.id,null,A.h)).j.at,at2);
 await api('POST',`/api/invites/${inv.id}/respond`,{action:'accept'},B.h);
 // QR çift onay
 const vh={'x-venue-key':'venue-moda'};
 const qa=(await api('GET',`/api/invites/${inv.id}/qr`,null,A.h)).j.token, qb=(await api('GET',`/api/invites/${inv.id}/qr`,null,B.h)).j.token;
 assert.equal((await api('POST','/api/venue/scan',{token:qa+'x'},vh)).s,400);
 assert.equal((await api('POST','/api/venue/scan',{token:qa},{'x-venue-key':'venue-karaköy'})).s,400);   // yanlış mekân
 const s1=(await api('POST','/api/venue/scan',{token:qa},vh)).j;assert.equal(s1.confirmed,false);assert.equal(s1.pay,v.normal);assert.equal(s1.waiting,'misafir');
 assert.equal((await api('GET',`/api/invites/${inv.id}/receipt`,null,A.h)).s,400);
 const s2=(await api('POST','/api/venue/scan',{token:qb},vh)).j;assert.equal(s2.confirmed,true);assert.equal(s2.pay,v.jest);
 await api('POST','/api/venue/scan',{token:qb},vh);                                  // tekrar okutma komisyonu çoğaltmaz
 const rc=(await api('GET',`/api/invites/${inv.id}/receipt`,null,B.h)).j;assert.equal(rc.saved,20);
 const adm=(await api('GET','/api/admin/commissions',null,{'x-admin-key':'admin-dev'})).j;assert.equal(adm.venues[0].toplam,8);assert.equal(adm.venues[0].adet,1);
 assert.equal((await api('GET','/api/admin/commissions')).s,401);
 // geri çekme ve hesap silme
 const inv2=(await api('POST','/api/invites',{venueId:v.id,at:at+86400000,guests:['05322220000']},A.h)).j;
 assert.equal((await api('POST',`/api/invites/${inv2.id}/cancel`,null,B.h)).s,403);
 assert.equal((await api('POST','/api/me/delete',{confirm:'hayir'},B.h)).s,400);
 assert.equal((await api('POST','/api/me/delete',{confirm:'SIL'},B.h)).s,200);
 assert.equal((await api('GET','/api/me',null,B.h)).s,401);
 console.log('TÜM TESTLER GEÇTİ');
}catch(e){console.error('HATA',e);process.exitCode=1}finally{server.close()}});
