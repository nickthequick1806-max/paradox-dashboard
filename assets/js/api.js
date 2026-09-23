/*
  PARADOX ANTICHEAT dashboard API adapter.

  Production flow:
    Browser -> Cloudflare Worker API -> protected FiveM bridge -> paradox_anticheat exports/events

  Sensitive keys never need to be returned to the browser. Opening index.html directly
  remains usable for design testing with one explicit test account only.
*/
(() => {
  const cfg = window.PARADOX_CONFIG || {};
  const read = (key, fallback={}) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const server = read('pa_server_settings', {});
  const sameOrigin = /^https?:$/i.test(location.protocol) ? location.origin : '';
  const configuredBase = (
    cfg.apiBaseUrl ||
    sameOrigin ||
    'http://localhost:8787'
  ).replace(/\/$/,'');

  class ParadoxAPIClient {
    constructor(){
      this.baseUrl = configuredBase;
      this.mode = /^file:$/i.test(location.protocol) ? 'demo' : 'auto';
      this.token = localStorage.getItem('pa_api_token') || '';
      this.lastError = null;
    }
    headers(extra={}){
      return Object.assign({'Content-Type':'application/json'}, this.token?{Authorization:`Bearer ${this.token}`}:{}, extra);
    }
    async request(path, options={}){
      if(this.mode==='demo' && !options.allowDemoFetch) return null;
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(), options.timeout || 25000);
      try{
        const res=await fetch(`${this.baseUrl}${path}`,{
          method:options.method||'GET',
          headers:this.headers(options.headers||{}),
          body:options.body===undefined?undefined:JSON.stringify(options.body),
          signal:controller.signal
        });
        let data=await res.json();
        if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
        const deadline=Date.now()+22000;
        while(data?.pending && data.jobId){
          if(Date.now()>deadline)throw new Error('Server response timed out. Check the audit before repeating an action.');
          await new Promise(resolve=>setTimeout(resolve,700));
          const poll=await fetch(`${this.baseUrl}/api/jobs/${encodeURIComponent(data.jobId)}`,{headers:this.headers(),signal:controller.signal});
          data=await poll.json();
          if(!poll.ok)throw new Error(data.error||`HTTP ${poll.status}`);
        }
        if(data?.error)throw new Error(data.error);
        this.lastError=null;
        return data;
      }catch(err){
        this.lastError=err;
        if(options.optional) return null;
        throw err;
      }finally{
        clearTimeout(timer);
      }
    }
    async login(email,password){
      // Local ZIP preview only accepts the explicit test account.
      if(this.mode==='demo'){
        const test=cfg.testAccount||{};
        if(email!==test.email || password!==test.password) throw new Error('Invalid test email or password');
        const token=`demo_${Date.now()}`;
        this.token=token;
        localStorage.setItem('pa_api_token',token);
        return {ok:true,token,user:{name:'Paradox Demo',email,role:'Server Owner'},demo:true};
      }
      const data=await this.request('/api/auth/login',{method:'POST',body:{email,password}});
      if(data?.token){
        this.token=data.token;
        localStorage.setItem('pa_api_token',data.token);
      }
      return data;
    }
    async logout(){
      try{ if(this.mode!=='demo') await this.request('/api/auth/logout',{method:'POST',optional:true}); }
      finally{ this.token=''; localStorage.removeItem('pa_api_token'); }
    }
    async getAccount(){ return this.request('/api/account',{optional:true}); }
    async updateAccount(payload){
      if(this.mode==='demo') return {ok:true,user:payload,demo:true};
      return this.request('/api/account',{method:'PUT',body:payload});
    }
    async setupServer(settings){
      if(this.mode==='demo') return {ok:true,connected:false,demo:true};
      return this.request('/api/settings/server',{method:'PUT',body:settings});
    }
    async saveSettings(settings){
      if(this.mode==='demo') return {ok:true,demo:true};
      return this.request('/api/settings',{method:'PUT',body:settings});
    }
    async getSettings(){ return this.request('/api/settings',{optional:true}); }
    async getServers(){ return this.request('/api/servers',{optional:true}); }
    async getAccessUsers(){
      if(this.mode==='demo') return {ok:true,users:[]};
      return this.request('/api/access',{optional:true});
    }
    async inviteAccess(email){
      if(this.mode==='demo') return {ok:true,user:{email,status:'active'},demo:true};
      return this.request('/api/access',{method:'POST',body:{email}});
    }
    async removeAccess(id){
      if(this.mode==='demo') return {ok:true,demo:true};
      return this.request(`/api/access/${encodeURIComponent(id)}`,{method:'DELETE'});
    }
    async getSnapshot(){ return this.request('/api/dashboard/snapshot',{optional:true}); }
    async getOverview(){ return this.request('/api/dashboard/overview',{optional:true}); }
    async getPlayers(){ return this.request('/api/players',{optional:true}); }
    async getDetections(){ return this.request('/api/detections',{optional:true}); }
    async getConnections(){ return this.request('/api/connections',{optional:true}); }
    async getResources(){ return this.request('/api/resources',{optional:true}); }
    async getConfig(){ return this.request('/api/config',{optional:true}); }
    async updateRule(id,value){ return this.request('/api/config/rule',{method:'PUT',body:{id,value}}); }
    async performAction(action,payload={}){ return this.request('/api/actions',{method:'POST',body:{action,payload}}); }
    async search(query){const data=await this.request(`/api/search?q=${encodeURIComponent(query)}`);return {results:(data.rows||[]).map(p=>({type:'Player',id:p.source,name:p.name,detail:p.state}))};}
    async savePolicy(policy,revision,reason){return this.request('/api/config/rule',{method:'PUT',body:{policy,revision,reason}});}
    async query(dataset,options={}){return this.request('/api/query',{method:'POST',body:{dataset,...options}});}
    async getDetail(kind,id){return this.query('detail',{kind,id:String(id)});}
    async pair(){return this.request('/api/pairing',{method:'POST',body:{}});}
    async health(){ return this.request('/api/health',{optional:true,timeout:3500}); }
    async storageStatus(){ return this.request('/api/storage/status',{optional:true}); }
    async getAudit(limit=50){ return this.request(`/api/audit?limit=${encodeURIComponent(limit)}`,{optional:true}); }
    async sendSupport(payload){
      if(this.mode==='demo') return {ok:true,demo:true};
      return this.request('/api/support',{method:'POST',body:payload});
    }
  }

  window.ParadoxAPI = new ParadoxAPIClient();
})();
