/* Production views consume canonical responses. The supplied design preview remains separate. */
window.createParadoxProduction = function({state,esc,header,render,openModal,toast}) {
  const api=window.ParadoxAPI, cache=new Map(), pages={}, searches={};
  const $=s=>document.querySelector(s);
  const unavailable=message=>`<div class="empty-state"><strong>Unavailable</strong><span>${esc(message)}</span></div>`;
  const button=(action,label,attrs='')=>`<button class="btn" data-prod="${action}" ${attrs}>${esc(label)}</button>`;
  const panel=(title,body)=>`<section class="panel"><div class="panel-head"><div class="panel-title">${esc(title)}</div></div><div class="panel-body">${body}</div></section>`;
  const fmt=v=>v===null||v===undefined?'—':typeof v==='object'?JSON.stringify(v):String(v);
  const objectRows=obj=>`<div class="production-facts">${Object.entries(obj||{}).filter(([k])=>k!=='image_data').map(([k,v])=>`<div><strong>${esc(k.replaceAll('_',' '))}</strong><span>${esc(fmt(v))}</span></div>`).join('')}</div>`;
  function load(key,fn){
    if(!state.authenticated)return {error:'Sign in to load records'};
    if(!cache.has(key)){
      cache.set(key,{loading:true});
      Promise.resolve().then(fn).then(value=>cache.set(key,{value:value||{}})).catch(e=>cache.set(key,{error:e.message})).finally(()=>{if(state.authenticated)render();});
    }
    return cache.get(key);
  }
  function content(entry,fn){return entry.loading?'<p role="status">Loading server records…</p>':entry.error?unavailable(entry.error):fn(entry.value);}
  function recordTable(rows,kind){
    if(!rows?.length)return '<div class="empty-state"><strong>No records</strong><span>No matching records were returned by the server.</span></div>';
    const keys=Object.keys(rows[0]).filter(k=>!['image_data','permissions','identifier_hash'].includes(k)).slice(0,8);
    return `<div class="production-table"><table class="data-table"><thead><tr>${keys.map(k=>`<th>${esc(k.replaceAll('_',' '))}</th>`).join('')}<th>Details</th></tr></thead><tbody>${rows.map(row=>`<tr>${keys.map(k=>`<td>${esc(fmt(row[k]))}</td>`).join('')}<td>${kind?button('detail','Inspect',`data-kind="${kind}" data-id="${esc(row.source??row.ban_id??row.id)}"`):'—'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const routes={players:['players','player'],'player-lookup':['players','player'],detections:['detections','detection'],logs:['audit','audit'],logbook:['audit','audit'],replays:['evidence','evidence'],'removed-detections':['detections','detection'],'live-view':['screenshots','screenshot']};
  const configPages=new Set(['entity-rules','particle-rules','weapon-rules','explosion-rules','event-protection','general-rules','safety-rules','native-rules','key-locks','rate-limits','security-rules']);
  function tablePage(key,dataset,kind){
    const page=pages[key]||1, search=searches[key]||'', entry=load(`${key}:${page}:${search}`,()=>api.query(dataset,{page,pageSize:25,search}));
    return `<div class="filters"><input class="input" id="productionSearch" placeholder="Search records" value="${esc(search)}">${button('search','Search')}${button('refresh','Refresh')}${button('export','Export current page')}</div>`+content(entry,data=>`${recordTable(data.rows,kind)}<div class="filters">${button('previous','Previous',page===1?'disabled':'')}<span>Page ${page} · ${data.totalCount??0} records</span>${button('next','Next',page*25>=(data.totalCount||0)?'disabled':'')}</div>`);
  }
  function policyPage(){
    return content(load('policy',()=>api.getConfig()),data=>{
      if(!data.policy)return unavailable('Owner permission and a connected server are required.');
      const p=data.policy;
      return `<p>Revision ${Number(data.revision)}. Changes are validated and audited by the server. Advisory detections remain restricted to SHADOW or OFF.</p><label>Overall mode <select class="select" id="productionMode">${['OFF','SHADOW','LOG','BLOCK','ENFORCE'].map(m=>`<option ${m===p.mode?'selected':''}>${m}</option>`).join('')}</select></label><div class="production-table"><table class="data-table"><thead><tr><th>Detection</th><th>Enabled</th><th>Mode</th><th>Cooldown (ms)</th></tr></thead><tbody>${Object.entries(p.detections).map(([id,d])=>`<tr data-policy-id="${esc(id)}"><td>${esc(id)}</td><td><input type="checkbox" aria-label="Enable ${esc(id)}" ${d.enabled?'checked':''}></td><td><select aria-label="Mode ${esc(id)}" class="select">${['OFF','SHADOW','LOG','BLOCK','ENFORCE'].map(m=>`<option ${m===d.mode?'selected':''}>${m}</option>`).join('')}</select></td><td><input aria-label="Cooldown ${esc(id)}" type="number" class="input" min="1000" max="600000" value="${Number(d.cooldown)}"></td></tr>`).join('')}</tbody></table></div><label>Reason <input class="input" id="productionReason" minlength="3" maxlength="256" placeholder="Reason for policy change"></label>${button('savePolicy','Save policy')}`;
    });
  }
  function accessPage(){
    return content(load('access',()=>api.getAccessUsers()),data=>`${recordTable(data.users)}${data.canManage?`<h3>Create user or grant access</h3><label>New user password<input class="input" id="productionPassword" type="password" autocomplete="new-password" minlength="12" maxlength="256" placeholder="12–256 characters; only for creating a new user"></label><div class="filters"><input class="input" id="productionEmail" type="email" placeholder="member@example.com"><select class="select" id="productionRole">${['Viewer','Reviewer','Moderator','Admin'].map(x=>`<option>${x}</option>`).join('')}</select>${button('provision','Create user')}${button('invite','Invite / grant existing user')}</div>${(data.users||[]).filter(u=>!u.isOwner).map(u=>button('revoke',`Revoke ${u.email}`,`data-id="${esc(u.id)}"`)).join('')}`:''}`);
  }
  function settingsPage(){
    return content(load('settings',()=>api.getSettings()),data=>{
      const s=data.settings||{};
      return `<p>Bridge ${s.linked?'connected':'offline'} · ${esc(data.role||'')}</p><div class="form-grid"><label>Server name<input class="input" id="productionServerName" value="${esc(s.name||'')}"></label><label>Region<input class="input" id="productionRegion" value="${esc(s.region||'')}"></label><label>Discord log webhook<input class="input" id="productionWebhook" type="password" autocomplete="off" placeholder="${s.discordLogWebhookConfigured?'Configured; leave blank to preserve':'Not configured'}"></label></div>${button('settings','Save settings')}${button('pair','Generate replacement bridge key')}<p>The server connects outbound over HTTPS. Generating a replacement key disconnects the existing bridge until its server-only key is updated.</p>`;
    });
  }
  function mapPage(){
    const players=(state.live?.players||[]).filter(p=>p.coords&&Number.isFinite(p.coords.x)&&Number.isFinite(p.coords.y));
    return `<p>Positions from the current server snapshot. ${players.length} players with coordinates.</p><div class="production-map" role="img" aria-label="Live player map">${players.map(p=>{const x=Math.max(0,Math.min(100,(p.coords.x+4000)/8500*100)),y=Math.max(0,Math.min(100,100-(p.coords.y+4500)/12500*100));return `<button class="production-pin" style="left:${x}%;top:${y}%" data-prod="detail" data-kind="player" data-id="${Number(p.source)}" title="${esc(p.name)}">${Number(p.source)}</button>`;}).join('')}</div>${recordTable(players.map(p=>({source:p.source,name:p.name,x:p.coords.x.toFixed(1),y:p.coords.y.toFixed(1),z:p.coords.z.toFixed(1)})),'player')}`;
  }
  function page(key,title,description){
    let body='';
    if(routes[key])body=tablePage(key,...routes[key]);
    else if(configPages.has(key))body=policyPage();
    else if(['settings','server-details','api-keys'].includes(key))body=settingsPage();
    else if(key==='permissions')body=accessPage();
    else if(key==='interactive-map')body=mapPage();
    else if(['console','falcon','insights','firewall-analytics'].includes(key))body=content(load(key,()=>api.query(key==='console'?'health':'analytics')),data=>objectRows(data));
    else if(key==='overview'){
      const s=state.live;
      body=s?.connected?`<div class="metric-cards">${[['Online',s.summary?.online],['High risk',s.summary?.highRisk],['Mode',s.mode],['Server',s.server?.name]].map(([k,v])=>`<div class="metric-card"><span>${esc(k)}</span><strong>${esc(fmt(v))}</strong></div>`).join('')}</div>${panel('Subsystem health',objectRows(s.health))}<p>Signals in SHADOW mode are observations awaiting gameplay calibration.</p>${button('refresh','Refresh live data')}`:unavailable(s?.error||api.lastError?.message||'Waiting for server telemetry');
    }else if(key==='support-tickets')body=`<label>Support message<textarea class="textarea" id="productionSupport" maxlength="1800" placeholder="Describe the issue"></textarea></label>${button('support','Send to configured support provider')}`;
    else if(key==='backups')body=`<p>Export the current server policy to keep a local backup.</p>${button('backup','Download current policy')}`;
    else if(key==='cdn')body=content(load(key,()=>api.storageStatus()),data=>objectRows(data));
    else body=unavailable('This integration has not been connected. No sample records or successful operations are implied.');
    return `<div class="page production-page">${header(title,description,button('refresh','Refresh'))}${panel(title,body)}</div>`;
  }
  async function detail(kind,id){
    openModal('Loading record','<p role="status">Loading…</p>');
    const d=(await api.getDetail(kind,id)).detail;if(!d)throw new Error('No record returned');
    let body=objectRows(d);
    if(d.image_data?.match(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/))body=`<img alt="Captured evidence" style="max-width:100%" src="${d.image_data}">`+body;
    if(kind==='player')body+=`<h3>Staff action</h3><input class="input" id="productionActionReason" placeholder="Reason (required)" maxlength="256"><div class="filters">${['screenshot','kick','tempban','freeze','unfreeze','quarantine','release'].map(a=>button('playerAction',a,`data-op="${a}" data-id="${Number(id)}"`)).join('')}</div><h3>Player note</h3><textarea class="textarea" id="productionNote" maxlength="1000"></textarea>${button('note','Save note',`data-id="${Number(id)}"`)}`;
    if(kind==='detection')body+=`<h3>Review</h3><textarea class="textarea" id="productionReview" maxlength="256" placeholder="Review reason"></textarea>${button('review','Mark reviewed and removed',`data-id="${esc(id)}"`)}`;
    if(kind==='ban'&&!d.revoked_at)body+=`<input class="input" id="productionActionReason" placeholder="Reason for revocation">${button('playerAction','Revoke ban',`data-op="unban" data-id="${esc(id)}"`)}`;
    openModal(`${kind} record`,body);
  }
  function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function act(buttonEl){
    const action=buttonEl.dataset.prod,key=state.page;
    if(action==='refresh'){cache.clear();await window.ParadoxRefresh?.();render();return;}
    if(action==='search'){searches[key]=$('#productionSearch').value;pages[key]=1;render();return;}
    if(action==='next'||action==='previous'){pages[key]=Math.max(1,(pages[key]||1)+(action==='next'?1:-1));render();return;}
    if(action==='detail'){await detail(buttonEl.dataset.kind,buttonEl.dataset.id);return;}
    if(action==='export'){const data=cache.get(`${key}:${pages[key]||1}:${searches[key]||''}`)?.value;if(!data)throw new Error('No loaded data');download(`paradox-${key}.json`,data);return;}
    if(action==='playerAction'){
      const reason=$('#productionActionReason').value.trim();if(reason.length<3)throw new Error('Enter a reason of at least three characters');
      const result=await api.performAction(buttonEl.dataset.op,{target:buttonEl.dataset.id,reason});
      toast('Request accepted',result.queued?'Accepted by the server; check the audit for completion.':'Server returned a successful result.');return;
    }
    if(action==='note'){await api.performAction('note',{target:buttonEl.dataset.id,text:$('#productionNote').value});toast('Note saved','The server stored and audited the note.');await detail('player',buttonEl.dataset.id);return;}
    if(action==='review'){await api.performAction('review',{id:buttonEl.dataset.id,text:$('#productionReview').value,removed:true});toast('Review saved','The server recorded your review.');cache.clear();render();return;}
    if(action==='savePolicy'){
      const data=cache.get('policy')?.value;if(!data?.policy)throw new Error('Load policy first');const p=structuredClone(data.policy);p.mode=$('#productionMode').value;
      document.querySelectorAll('[data-policy-id]').forEach(row=>{p.detections[row.dataset.policyId]={enabled:row.querySelector('[type=checkbox]').checked,mode:row.querySelector('select').value,cooldown:Number(row.querySelector('[type=number]').value)};});
      await api.savePolicy(p,data.revision,$('#productionReason').value);cache.delete('policy');toast('Policy saved','Validated and persisted by the server.');render();return;
    }
    if(action==='settings'){const body={name:$('#productionServerName').value,region:$('#productionRegion').value};if($('#productionWebhook').value)body.discordLogWebhook=$('#productionWebhook').value;await api.saveSettings(body);cache.delete('settings');toast('Settings saved','Stored securely in Cloudflare.');render();return;}
    if(action==='pair'){const result=await api.pair();openModal('Replacement bridge key',`<p>Store this only in the server configuration. It will not be displayed again.</p><pre class="production-secret">${esc(result.key)}</pre><p>API: ${esc(api.baseUrl)}</p>`);cache.delete('settings');return;}
    if(action==='provision'){
      const password=$('#productionPassword').value;
      await api.request('/api/access/users',{method:'POST',body:{email:$('#productionEmail').value,password,role:$('#productionRole').value}});
      $('#productionPassword').value='';cache.delete('access');render();toast('User created','The user can now sign in with their email and password.');return;
    }
    if(action==='invite'){
      const result=await api.request('/api/access',{method:'POST',body:{email:$('#productionEmail').value,role:$('#productionRole').value}});
      cache.delete('access');render();
      if(result.inviteToken)openModal('One-time invitation',`<p>Share this link with the invited person. It expires in 24 hours.</p><textarea class="textarea" readonly>${esc(location.href.split('#')[0]+'#invite='+encodeURIComponent(result.inviteToken))}</textarea>`);
      else toast('Access granted',result.message);return;
    }
    if(action==='revoke'){await api.removeAccess(buttonEl.dataset.id);cache.delete('access');render();toast('Access revoked','New requests from this membership are denied.');return;}
    if(action==='support'){await api.sendSupport({message:$('#productionSupport').value,page:key});toast('Support sent','The configured provider accepted your message.');return;}
    if(action==='backup'){const p=await api.getConfig();if(!p?.policy)throw new Error('Policy unavailable');download('paradox-policy-backup.json',p);return;}
  }
  document.addEventListener('click',e=>{
    if(state.demoSession)return;
    const target=e.target.closest('[data-prod]');if(!target)return;
    e.preventDefault();e.stopImmediatePropagation();target.disabled=true;
    act(target).catch(err=>toast('Request failed',err.message,'bad')).finally(()=>target.disabled=false);
  },true);
  return {page,clear:()=>cache.clear(),detail};
};
