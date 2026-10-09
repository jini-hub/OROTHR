const SYNC_KEY = 'orot_hr_sync_config_v1';
export class OrotSync {
  constructor({getSnapshot, replaceSnapshot, notify}) {
    this.getSnapshot=getSnapshot; this.replaceSnapshot=replaceSnapshot; this.notify=notify;
    try {this.cfg=JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch {this.cfg={};}
    this.dirty=false; this.pending=false; this.busy=false; this.conflict=false; this.timer=null;
    this.status=this.cfg.token ? '연결됨 · 확인 대기' : '이 기기에 저장 중';
    if(this.cfg.token) {
      this.dirty=Boolean(this.cfg.unsent);
      this.timer=setTimeout(()=>this.dirty ? this.push() : this.pull(),2000);
    }
    window.addEventListener('online',()=>this.dirty?this.push():this.pull());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && this.cfg.token) this.dirty?this.push():this.pull();});
    this.poll=setInterval(()=>{if(this.cfg.token && !document.hidden && !this.dirty && !this.busy && !this.conflict) this.pull()},30000);
  }
  saveConfig(){ localStorage.setItem(SYNC_KEY,JSON.stringify(this.cfg)); this.notify(); }
  connected(){return !!(this.cfg.token && this.cfg.deviceId && this.cfg.workspaceId);}
  label(){return this.status;}
  setStatus(s){this.status=s; this.notify();}
  markChanged(){
    if(!this.connected()) {this.setStatus('이 기기에 저장됨');return;}
    this.dirty=true;this.cfg.unsent=true;this.saveConfig();this.setStatus('기기 저장됨 · 서버 전송 대기');
    clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),1100);
  }
  async request(path,{method='GET',body,auth=true,setupKey}={}){
    const cfg=this.cfg;
    if(!cfg.url) throw new Error('동기화 서버 URL이 설정되지 않았습니다.');
    const headers={'Content-Type':'application/json'};
    if(setupKey)headers['X-Setup-Key']=setupKey;
    if(auth){headers.Authorization=`Bearer ${cfg.token}`;headers['X-Device-ID']=cfg.deviceId;}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),14000);
    try{
      const r=await fetch(cfg.url.replace(/\/$/,'')+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){const err=new Error(j.error||`서버 오류 ${r.status}`);err.status=r.status;err.detail=j;throw err;}
      return j;
    }finally{clearTimeout(timeout);}
  }
  async createServer(url,deviceName,setupKey){
    const base=url.trim().replace(/\/$/,'');
    if(!/^https:\/\/[^\s/]+/i.test(base)) throw new Error('https:// 로 시작하는 서버 주소를 입력하세요.');
    const before=this.cfg;this.cfg={url:base};
    try{
      const result=await this.request('/api/workspaces',{method:'POST',auth:false,setupKey,body:{name:deviceName||'첫 번째 기기',data:this.getSnapshot()}});
      this.cfg={url:base,deviceId:result.deviceId,token:result.token,workspaceId:result.workspaceId,version:result.version,unsent:false};
      this.dirty=false;this.conflict=false;this.saveConfig();this.setStatus('서버 동기화 완료');return result;
    }catch(e){this.cfg=before;throw e;}
  }
  async createPair(){const j=await this.request('/api/pairings',{method:'POST'});return j;}
  async pair(url,code,deviceName){
    const base=url.trim().replace(/\/$/,'');
    if(!/^https:\/\/[^\s/]+/i.test(base))throw new Error('https 서버 주소를 입력하세요.');
    const before=this.cfg;this.cfg={url:base};
    try{
      const j=await this.request('/api/claim',{method:'POST',auth:false,body:{code:code.trim().toUpperCase().replace(/[\s-]/g,''),name:deviceName||'연결 기기'}});
      this.cfg={url:base,deviceId:j.deviceId,token:j.token,workspaceId:j.workspaceId,version:j.version,unsent:false};
      this.replaceSnapshot(j.data);this.dirty=false;this.conflict=false;this.saveConfig();this.setStatus('서버 동기화 완료');return j;
    }catch(e){this.cfg=before;throw e;}
  }
  async push(force=false){
    if(!this.connected()||this.busy||this.conflict&&!force||!this.dirty&&!force)return;
    this.busy=true;this.setStatus('서버에 전송 중…');
    const snapshot=this.getSnapshot();
    try {
      const result=await this.request('/api/snapshot',{method:'PUT',body:{data:snapshot,expectedVersion:this.cfg.version}});
      this.cfg.version=result.version;
      // 사용자가 업로드 중에 다시 수정한 경우에는 다음 전송을 유지합니다.
      if(JSON.stringify(this.getSnapshot())===JSON.stringify(snapshot)) {this.dirty=false;this.cfg.unsent=false;this.setStatus('서버 동기화 완료');}
      else {this.dirty=true;this.cfg.unsent=true;this.setStatus('새 변경사항 전송 대기');setTimeout(()=>this.push(),400);}
      this.saveConfig();
    } catch(e){
      if(e.status===409){this.conflict=true;this.setStatus('동기화 충돌 · 해결 필요');}
      else if(e.status===401){this.setStatus('연결 인증 실패 · 설정 확인');}
      else this.setStatus('서버 연결 실패 · 기기에 보관됨');
    } finally {this.busy=false;}
  }
  async pull(){
    if(!this.connected()||this.busy||this.dirty||this.conflict) return;
    this.busy=true;
    try{
      const result=await this.request('/api/snapshot');
      if(this.dirty||this.conflict)return;
      if(result.version>Number(this.cfg.version||0)) {this.replaceSnapshot(result.data);this.cfg.version=result.version;}
      this.cfg.unsent=false;this.saveConfig();this.setStatus('서버 동기화 완료');
    }catch(e){this.setStatus(e.status===401?'연결 인증 실패 · 설정 확인':'서버 연결 실패 · 기기에 보관됨');}
    finally{this.busy=false;}
  }
  async resolveConflict(useServer){
    if(!this.connected())throw new Error('연결된 서버가 없습니다.');
    const j=await this.request('/api/snapshot');
    if(useServer){this.replaceSnapshot(j.data);this.cfg.version=j.version;this.dirty=false;this.cfg.unsent=false;this.conflict=false;this.saveConfig();this.setStatus('서버 데이터로 복원됨');}
    else{this.cfg.version=j.version;this.conflict=false;this.dirty=true;this.saveConfig();this.busy=false;await this.push(true);}
  }
  async devices(){return (await this.request('/api/devices')).devices;}
  async revoke(id){return await this.request('/api/devices/revoke',{method:'POST',body:{deviceId:id}});}
  disconnect(){this.cfg={};this.dirty=false;this.conflict=false;clearTimeout(this.timer);localStorage.removeItem(SYNC_KEY);this.setStatus('이 기기에 저장됨');}
}
