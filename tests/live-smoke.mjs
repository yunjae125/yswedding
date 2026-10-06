import assert from 'node:assert/strict';
const base=process.argv[2];if(!base)throw Error('API origin required');
const siteOrigin='https://yunjae125.github.io';
const payload={id:crypto.randomUUID(),name:'배포 기능 확인',message:'자동 테스트용 임시 글입니다. 확인 후 삭제됩니다.',password:crypto.randomUUID()};
let saved=false;const results=[];
async function req(method,body){const start=performance.now();const response=await fetch(base+'/api/messages',{method,headers:{Origin:siteOrigin,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined});results.push({method,status:response.status,ms:Math.round(performance.now()-start)});return response}
try{
const pre=await req('OPTIONS');assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),siteOrigin);
assert.equal((await req('POST',null)).status,400);
const posts=await Promise.all([req('POST',payload),req('POST',payload)]);saved=posts.some(r=>r.status===201);assert.deepEqual(posts.map(r=>r.status).sort(),[200,201]);
const list=await req('GET');assert.equal(list.headers.get('Access-Control-Allow-Origin'),siteOrigin);assert.equal((await list.json()).messages.some(x=>x.id===payload.id),true);
assert.equal((await req('PATCH',{...payload,message:'수정 기능 확인'})).status,200);
assert.equal((await req('DELETE',{...payload,password:'incorrect-password'})).status,403);
assert.equal((await req('DELETE',payload)).status,200);saved=false;
assert.equal((await(await req('GET')).json()).messages.some(x=>x.id===payload.id),false);
console.log(JSON.stringify({result:'PASS',base,checks:'CORS, null validation, concurrent idempotent create, read, update, wrong password rejection, delete, cleanup verified',results},null,2));
}finally{if(saved){const r=await req('DELETE',payload);console.log('Cleanup status',r.status)}}
