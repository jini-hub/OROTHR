// OROT HR optional private sync server · Cloudflare Workers + D1
// Never publish SETUP_KEY or device tokens; only their SHA256 digests are persisted.
const HEADERS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-Device-ID,X-Setup-Key','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
const response=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:HEADERS});
const fail=(msg,status=400)=>response({error:msg},status);
const bytes=(len=32)=>{const buf=new Uint8Array(len);crypto.getRandomValues(buf);return buf};
const hex=bytes=>Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');
const secret=()=>hex(bytes(32));
const digest=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
const code=()=>{const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',v=bytes(12);return [...v].map(b=>abc[b%abc.length]).join('')};
async function json(request){let txt=await request.text();if(txt.length>1900000)throw new Error('용량 제한(약 1.9MB)을 초과했습니다.');return JSON.parse(txt)}
const now=()=>new Date().toISOString();
function snapshotValid(data){return data&&data.schemaVersion===1&&Array.isArray(data.stages)&&Array.isArray(data.tasks)&&Array.isArray(data.trash)}
async function auth(request,env){const h=request.headers.get('Authorization')||'',token=h.replace(/^Bearer\s+/i,''),deviceId=request.headers.get('X-Device-ID')||'';
 if(!token||!deviceId||token.length>200||deviceId.length>100)return null;
 const row=await env.DB.prepare('SELECT id, workspace_id FROM devices WHERE id=? AND token_hash=? AND revoked=0').bind(deviceId,await digest(token)).first();return row||null;
}
export default {async fetch(request,env){
 try{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  const u=new URL(request.url),path=u.pathname;
  if(path==='/api/health')return response({status:'ok',service:'OROT HR Sync'});
  if(path==='/api/workspaces'&&request.method==='POST'){
   if(!env.SETUP_KEY||env.SETUP_KEY.length<16)return fail('서버에 SETUP_KEY(16자 이상)를 먼저 설정하세요.',503);
   const supplied=request.headers.get('X-Setup-Key')||'';
   if(!supplied||await digest(supplied)!==await digest(env.SETUP_KEY))return fail('초기 설정키가 일치하지 않습니다.',403);
   const existing=await env.DB.prepare('SELECT COUNT(*) as n FROM workspaces').first();
   if(existing?.n>0)return fail('이미 작업공간이 있습니다. 기존 기기에서 연결코드를 발급해주세요.',409);
   const b=await json(request);if(!snapshotValid(b.data))return fail('작업공간 데이터 형식이 올바르지 않습니다.');
   const workspaceId=crypto.randomUUID(),deviceId=crypto.randomUUID(),token=secret(),date=now();
   await env.DB.prepare('INSERT INTO workspaces(id,version,data,updated_at) VALUES (?,1,?,?)').bind(workspaceId,JSON.stringify(b.data),date).run();
   await env.DB.prepare('INSERT INTO devices(id,workspace_id,token_hash,name,created_at,revoked) VALUES (?,?,?,?,?,0)').bind(deviceId,workspaceId,await digest(token),String(b.name||'첫 기기').slice(0,80),date).run();
   return response({workspaceId,deviceId,token,version:1});
  }
  if(path==='/api/claim'&&request.method==='POST'){
   const b=await json(request),c=String(b.code||'').replace(/[\s-]/g,'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{12}$/.test(c))return fail('12자리 연결코드를 확인하세요.');
   const hash=await digest(c);const pairing=await env.DB.prepare('SELECT * FROM pairings WHERE code_hash=? AND consumed=0 AND expires_at>?').bind(hash,now()).first();
   if(!pairing)return fail('코드가 틀렸거나 만료되었습니다.',403);
   const issuer=await env.DB.prepare('SELECT id FROM devices WHERE id=? AND revoked=0').bind(pairing.issuer_id).first();if(!issuer)return fail('발급 기기 연결이 해제되었습니다.',403);
   const taken=await env.DB.prepare('UPDATE pairings SET consumed=1 WHERE code_hash=? AND consumed=0 AND expires_at>?').bind(hash,now()).run();
   if(taken.meta.changes!==1)return fail('이미 사용된 연결코드입니다.',409);
   const deviceId=crypto.randomUUID(),token=secret(),date=now();
   await env.DB.prepare('INSERT INTO devices(id,workspace_id,token_hash,name,created_at,revoked) VALUES (?,?,?,?,?,0)').bind(deviceId,pairing.workspace_id,await digest(token),String(b.name||'새 기기').slice(0,80),date).run();
   const w=await env.DB.prepare('SELECT version,data FROM workspaces WHERE id=?').bind(pairing.workspace_id).first();
   if(!w)return fail('작업공간을 찾을 수 없습니다.',404);
   return response({workspaceId:pairing.workspace_id,deviceId,token,version:w.version,data:JSON.parse(w.data)});
  }
  const d=await auth(request,env);if(!d)return fail('기기 인증에 실패했습니다. 연결을 다시 확인하세요.',401);
  if(path==='/api/snapshot'&&request.method==='GET'){
   const w=await env.DB.prepare('SELECT version,data,updated_at FROM workspaces WHERE id=?').bind(d.workspace_id).first();if(!w)return fail('작업공간을 찾을 수 없습니다.',404);
   return response({version:w.version,data:JSON.parse(w.data),updatedAt:w.updated_at});
  }
  if(path==='/api/snapshot'&&request.method==='PUT'){
   const b=await json(request);if(!snapshotValid(b.data))return fail('저장 데이터 형식이 올바르지 않습니다.');
   const version=Number(b.expectedVersion);if(!Number.isInteger(version)||version<1)return fail('현재 서버 버전이 필요합니다.');
   const result=await env.DB.prepare('UPDATE workspaces SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(b.data),now(),d.workspace_id,version).run();
   if(result.meta.changes!==1){const w=await env.DB.prepare('SELECT version FROM workspaces WHERE id=?').bind(d.workspace_id).first();return response({error:'다른 기기에서 내용이 변경되었습니다.',serverVersion:w?.version},409)}
   return response({version:version+1});
  }
  if(path==='/api/pairings'&&request.method==='POST'){
   const value=code(),date=new Date(Date.now()+10*60*1000).toISOString();
   await env.DB.prepare('INSERT INTO pairings(code_hash,workspace_id,issuer_id,expires_at,consumed) VALUES (?,?,?,?,0)').bind(await digest(value),d.workspace_id,d.id,date).run();
   return response({code:value,expiresAt:date});
  }
  if(path==='/api/devices'&&request.method==='GET'){
   const res=await env.DB.prepare('SELECT id,name,created_at FROM devices WHERE workspace_id=? AND revoked=0 ORDER BY created_at').bind(d.workspace_id).all();
   return response({devices:(res.results||[]).map(i=>({id:i.id,name:i.name,createdAt:i.created_at}))});
  }
  if(path==='/api/devices/revoke'&&request.method==='POST'){
   const b=await json(request),id=String(b.deviceId||'');if(id===d.id)return fail('현재 기기는 다른 기기에서 해제하세요.');
   const result=await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=? AND workspace_id=?').bind(id,d.workspace_id).run();if(result.meta.changes!==1)return fail('기기를 찾을 수 없습니다.',404);
   return response({revoked:true});
  }
  return fail('요청 경로를 찾을 수 없습니다.',404);
 }catch(e){console.error('OROT worker error',e);return fail(e?.message?.startsWith('용량 제한')?e.message:'처리 중 오류가 발생했습니다.',500)}
 }};
