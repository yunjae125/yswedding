const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const db=env=>{if(!env.DB)throw new Error('DB unavailable');return env.DB};
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
async function handle(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')){
  try{
   if(url.pathname!='/api/messages')return json({error:'찾을 수 없습니다.'},404);
   if(request.method==='GET'){
    const page=Math.max(0,Math.min(10000,parseInt(url.searchParams.get('page'))||0));
    const rows=await db(env).prepare('SELECT id,name,message,created FROM messages ORDER BY created DESC,id DESC LIMIT 6 OFFSET ?').bind(page*5).all();
    return json({messages:rows.results.slice(0,5),hasMore:rows.results.length>5});
   }
   if(!['POST','PATCH','DELETE'].includes(request.method))return json({error:'지원하지 않는 요청입니다.'},405);
   if(![url.origin,'https://yunjae125.github.io'].includes(request.headers.get('Origin')))return json({error:'잘못된 요청입니다.'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'잘못된 요청입니다.'},415);
   const raw=await request.text();if(raw.length>5000)return json({error:'입력 내용이 너무 깁니다.'},413);
   let body;try{body=JSON.parse(raw)}catch{return json({error:'입력 내용을 확인해 주세요.'},400)}
   const {id,password}=body;
   if(typeof id!=='string'||! /^[a-f0-9-]{36}$/.test(id)||typeof password!=='string'||password.length<6||password.length>100)return json({error:'비밀번호는 6~100자로 입력해 주세요.'},400);
   const name=typeof body.name==='string'?body.name.trim():'';
   const message=typeof body.message==='string'?body.message.trim():'';
   if(request.method!=='DELETE'&&(!name||name.length>30||!message||message.length>500))return json({error:'이름 30자, 축하 글 500자 이내로 입력해 주세요.'},400);
   if(request.method==='POST'){
    const existing=await db(env).prepare('SELECT id FROM messages WHERE id=?').bind(id).first();
    if(existing)return json({ok:true});
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    await db(env).prepare('INSERT INTO messages (id,name,message,salt,hash,created) VALUES (?,?,?,?,?,?)').bind(id,name,message,salt,await passwordHash(password,salt),Date.now()).run();
    return json({ok:true},201);
   }
   const row=await db(env).prepare('SELECT salt,hash FROM messages WHERE id=?').bind(id).first();
   if(!row)return json({error:'이미 삭제된 글입니다.'},404);
   const candidate=await passwordHash(password,row.salt);let different=0;for(let i=0;i<candidate.length;i++)different|=candidate.charCodeAt(i)^row.hash.charCodeAt(i);
   if(different)return json({error:'비밀번호가 맞지 않습니다.'},403);
   if(request.method==='DELETE')await db(env).prepare('DELETE FROM messages WHERE id=?').bind(id).run();
   else await db(env).prepare('UPDATE messages SET name=?,message=? WHERE id=?').bind(name,message,id).run();
   return json({ok:true});
  }catch(error){console.error('Guestbook storage request failed',error?.name);return json({error:'잠시 연결이 원활하지 않습니다. 작성한 내용은 유지됩니다. 다시 시도해 주세요.'},503)}
 }
 const path=url.pathname==='/'?'/index.html':url.pathname;
 if(!Object.hasOwn(assets,path))return new Response('Not found',{status:404});
 const type=path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript';
 return new Response(assets[path],{headers:{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');
 const allowed=origin==='https://yunjae125.github.io'||origin===new URL(request.url).origin;
 if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers:allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}:{}});
 const response=await handle(request,env);
 if(allowed&&new URL(request.url).pathname.startsWith('/api/')){response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');}
 return response;
}};
