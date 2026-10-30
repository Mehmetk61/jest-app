process.env.JEST_DEV='1';process.env.JEST_DB=':memory:';process.env.JEST_KODLAR='PILOT1';
const assert=require('node:assert/strict');const {server}=require('./server.js');
server.listen(0,async()=>{const b='http://localhost:'+server.address().port;
const p=async(u,d)=>{const r=await fetch(b+u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});return r.status};
await p('/api/code',{phone:'05321110000'});
const base={phone:'05321110000',code:'123456',name:'Ayşe',terms:true,ageToken:'DEV-AGE-OK'};
assert.equal(await p('/api/verify',base),403);
assert.equal(await p('/api/verify',{...base,inviteCode:'yanlis'}),403);
assert.equal(await p('/api/verify',{...base,inviteCode:'pilot1'}),200);
await p('/api/code',{phone:'05321110000'});
assert.equal(await p('/api/verify',{phone:'05321110000',code:'123456'}),200); // kayıtlı üye kodsuz girer
console.log('KAPALI PİLOT TESTİ GEÇTİ');server.close()});
