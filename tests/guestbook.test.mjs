import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';
const origin='https://yunjae125.github.io';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_lonely_speedball.sql',import.meta.url),'utf8'));
 const env={DB:{prepare(query){let values=[];return {bind(...args){values=args;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return {results:sql.prepare(query).all(...values)}},async run(){return sql.prepare(query).run(...values)}}}}};
 const payload={id:crypto.randomUUID(),name:'테스트',message:'축하합니다',password:'test-'+crypto.randomUUID()};
 async function call(method='GET',body,extra={}){const headers={Origin:origin,...extra.headers};if(body!==undefined)headers['Content-Type']='application/json';const res=await worker.fetch(new Request('https://test.example/api/messages'+(extra.query||''),{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),extra.env||env);return {status:res.status,headers:res.headers,data:await res.json()}}
 return {sql,env,payload,call};
}
test('저장/재조회 및 비밀번호·salt 비공개',async()=>{const f=fixture();assert.equal((await f.call('POST',f.payload)).status,201);const r=await f.call();assert.deepEqual(Object.keys(r.data.messages[0]).sort(),['created','id','message','name']);assert.equal(r.data.messages[0].message,f.payload.message);const row=f.sql.prepare('select * from messages').get();assert.notEqual(row.hash,f.payload.password);assert.equal(row.hash.length,64);assert.equal(row.salt.length,32)});
test('비밀번호 오류 시 수정·삭제 차단',async()=>{const f=fixture();await f.call('POST',f.payload);for(const method of ['PATCH','DELETE'])assert.equal((await f.call(method,{...f.payload,password:'wrong-password'})).status,403);assert.equal((await f.call()).data.messages.length,1)});
test('정상 수정·삭제·삭제된 글 처리',async()=>{const f=fixture();await f.call('POST',f.payload);assert.equal((await f.call('PATCH',{...f.payload,message:'수정'})).status,200);assert.equal((await f.call()).data.messages[0].message,'수정');assert.equal((await f.call('DELETE',f.payload)).status,200);assert.equal((await f.call()).data.messages.length,0);assert.equal((await f.call('DELETE',f.payload)).status,404)});
test('중복 전송 시 글 하나 유지',async()=>{const f=fixture();await f.call('POST',f.payload);assert.equal((await f.call('POST',f.payload)).status,200);assert.equal((await f.call()).data.messages.length,1)});
test('이름·글·비밀번호 경계값',async()=>{const f=fixture();for(const patch of [{name:''},{name:' '.repeat(3)},{name:'가'.repeat(31)},{message:''},{message:'가'.repeat(501)},{password:'12345'},{password:'a'.repeat(101)},{id:'invalid'}])assert.equal((await f.call('POST',{...f.payload,...patch})).status,400);assert.equal((await f.call('POST',{...f.payload,name:'가'.repeat(30),message:'가'.repeat(500),password:'123456'})).status,201)});
test('GitHub CORS 허용 및 다른 출처 쓰기 차단',async()=>{const f=fixture();const r=await f.call();assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal((await f.call('POST',f.payload,{headers:{Origin:'https://evil.example'}})).status,403);for(const [o,status]of[[origin,204],['https://evil.example',403]]){const pre=await worker.fetch(new Request('https://test.example/api/messages',{method:'OPTIONS',headers:{Origin:o}}),f.env);assert.equal(pre.status,status)}});
test('SQL 특수문자 데이터 안전 저장',async()=>{const f=fixture();const message="'); DROP TABLE messages; -- <script>alert(1)</script>";await f.call('POST',{...f.payload,message});assert.equal((await f.call()).data.messages[0].message,message)});
test('6개 글 페이지 분리·중복 없음',async()=>{const f=fixture();for(let i=0;i<6;i++)await f.call('POST',{...f.payload,id:crypto.randomUUID()});const a=(await f.call()).data;const b=(await f.call('GET',undefined,{query:'?page=1'})).data;assert.equal(a.messages.length,5);assert.equal(a.hasMore,true);assert.equal(b.messages.length,1);assert.equal(b.hasMore,false);assert.equal(new Set([...a.messages,...b.messages].map(x=>x.id)).size,6)});
test('DB 장애 시 503 및 내부 오류 비노출',async()=>{const f=fixture();const r=await f.call('POST',f.payload,{env:{}});assert.equal(r.status,503);assert.equal(r.data.error.includes('DB unavailable'),false)});
test('지원하지 않는 HTTP 메서드 차단',async()=>{const f=fixture();assert.equal((await f.call('PUT',f.payload)).status,405)});
test('잘못된 JSON은 400',async()=>{const f=fixture();const r=await worker.fetch(new Request('https://test.example/api/messages',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{broken'}),f.env);assert.equal(r.status,400)});
test('JSON null 요청은 클라이언트 오류 400이어야 함',async()=>{const f=fixture();assert.equal((await f.call('POST',null)).status,400)});
test('정적 화면·JS·404 응답',async()=>{const f=fixture();for(const path of ['/','/style.css','/features.js']){const r=await worker.fetch(new Request('https://test.example'+path),f.env);assert.equal(r.status,200)}assert.equal((await worker.fetch(new Request('https://test.example/missing'),f.env)).status,404)});
test('동시에 같은 글 재전송 시 둘 다 성공 처리',async()=>{const f=fixture();const results=await Promise.all([f.call('POST',f.payload),f.call('POST',f.payload)]);assert.equal((await f.call()).data.messages.length,1);assert.ok(results.every(r=>r.status===200||r.status===201),JSON.stringify(results.map(r=>r.status)))});

test('객체가 아닌 JSON은 모든 쓰기 메서드에서 400',async()=>{const f=fixture();for(const body of [null,[],true,42,'text'])for(const method of ['POST','PATCH','DELETE'])assert.equal((await f.call(method,body)).status,400)});
test('같은 ID에 다른 내용이 재전송돼도 원문·비밀번호 보존',async()=>{const f=fixture();await f.call('POST',f.payload);assert.equal((await f.call('POST',{...f.payload,message:'덮어쓰기 시도',password:'different'})).status,200);assert.equal((await f.call()).data.messages[0].message,f.payload.message);assert.equal((await f.call('DELETE',f.payload)).status,200)});
