import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8768';
const id=crypto.randomUUID();
const payload={id,name:'기능 확인',message:'방명록 테스트',password:crypto.randomUUID()};
async function send(method,body,requestOrigin=origin){const r=await fetch(origin+'/api/messages',{method,headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
assert.equal((await send('POST',payload,'https://example.org')).status,403);
assert.equal((await send('POST',payload)).status,201);
assert.equal((await send('POST',payload)).status,200);
let data=await(await fetch(origin+'/api/messages')).json();
assert.equal(data.messages.filter(m=>m.id===id).length,1);
assert.equal('hash' in data.messages[0],false);
assert.equal((await send('DELETE',{...payload,password:'incorrect'})).status,403);
assert.equal((await send('PATCH',{...payload,message:'수정 확인'})).status,200);
data=await(await fetch(origin+'/api/messages')).json();assert.equal(data.messages.find(m=>m.id===id).message,'수정 확인');
assert.equal((await send('DELETE',payload)).status,200);
data=await(await fetch(origin+'/api/messages')).json();assert.equal(data.messages.some(m=>m.id===id),false);
console.log('PASS: persistence, idempotent create, edit, password protection, deletion, origin check, private hash exclusion');
