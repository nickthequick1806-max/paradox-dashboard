/* Connect existing controls; never replace a page renderer or its styles. */
window.installParadoxLiveControls=function({state,esc,fa,openModal,closeModal,toast,render,navigateToPage,playerModal}){
  const api=window.ParadoxAPI,$=s=>document.querySelector(s);
  const refresh=()=>{window.ParadoxData.clear();render(state.page);};
  const download=(name,text,type='application/json')=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const footer=(action,label)=>`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="${action}">${esc(label)}</button>`;
  async function handle(action,el){
    if(action==='inviteMember'||action==='createInviteLink'){
      if(api.mode==='nui')throw Error('Website account access is managed from the website dashboard.');
      openModal('Invite Team Member',`<div class="v12-form-modal"><p>Create a user with immediate sign-in, or invite an existing email address.</p><label>Email address</label><input class="input" id="liveMemberEmail" type="email" autocomplete="off"><label>Role</label><select class="input" id="liveMemberRole">${['Viewer','Reviewer','Moderator','Admin'].map(x=>`<option>${x}</option>`).join('')}</select><label>New account password (optional)</label><input class="input" id="liveMemberPassword" type="password" autocomplete="new-password" minlength="12"><label>Display name (optional)</label><input class="input" id="liveMemberName" maxlength="80"></div>`,footer('liveSaveMember','Create user / invite'));return;
    }
    if(action==='liveSaveMember'){
      const email=$('#liveMemberEmail').value.trim(),password=$('#liveMemberPassword').value,role=$('#liveMemberRole').value,displayName=$('#liveMemberName').value.trim();
      const result=password?await api.request('/api/access/users',{method:'POST',body:{email,password,role,displayName}}):await api.request('/api/access',{method:'POST',body:{email,role}});
      if(result.inviteToken){const url=new URL(location.href);url.hash='invite='+result.inviteToken;openModal('Invitation ready',`<div class="v12-form-modal"><p>Share this one-use link with the intended recipient. It expires in 24 hours.</p><input class="input" readonly value="${esc(url.href)}"></div>`);}else closeModal();
      toast('Access updated',result.message||'The user can sign in now.');refresh();return;
    }
    if(action==='liveRevokeMember'){await api.removeAccess(el.dataset.id);toast('Access revoked','The server checks the updated permissions on every request.');refresh();return;}
    if(action==='refresh'||action==='testSync'){window.ParadoxData.clear();await window.ParadoxRefresh?.();render(state.page);return;}
    if(action==='addPlayerNote'){
      const key=el.dataset.player||state.playerModalName,record=state.playerDetails[key],text=$('#playerNoteInput')?.value.trim();
      if(!record?.session||!text)throw Error('A current player session and note are required.');
      await api.performAction('note',{target:record.source,text});
      const detail=(await api.getDetail('player',record.source)).detail;
      state.playerDetails[key]={...record,...detail,notes:(detail.notes||[]).map(n=>({text:n.note,author:n.actor,time:window.ParadoxData.date(n.created_at)}))};
      toast('Note saved','The note was saved in the server database.');playerModal(key,'notes');return;
    }
    if(action==='exportLogs'){
      const result=await api.query('audit',{page:1,pageSize:50});const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
      download('paradox-security-logs.csv',['time,actor,action',...(result.rows||[]).map(r=>[window.ParadoxData.date(r.created_at),r.actor,r.kind].map(cell).join(','))].join('\r\n'),'text/csv');toast('Exported','Export contains up to 50 latest authorized audit records.');return;
    }
    if(action==='clearCache'){window.ParadoxData.clear();toast('Cache cleared','Dashboard records will reload from the server.');render(state.page);return;}
    if(action==='syncRules'){const result=await api.getConfig();if(!result?.policy)throw Error('Policy is unavailable');state.policy=result;toast('Policy refreshed',`Loaded server policy revision ${result.revision}.`);return;}
    if(action==='runConsole'){const command=$('#consoleInput')?.value.trim();if(!command)return;const response=await api.performAction('console',{command});state.consoleResponse=response;toast('Status received',`Mode ${response.mode||'unknown'}; database ${response.db?.schema||'unknown'}.`);return;}
    if(action==='createBackup'){const result=await api.getConfig();if(!result?.policy)throw Error('Policy is unavailable');download('paradox-policy-'+result.revision+'.json',JSON.stringify(result,null,2));toast('Backup downloaded','The current revision and policy were exported.');return;}
    if(action==='screenshotPlayer'){const record=state.playerDetails[el.dataset.player];if(!record)throw Error('Player is no longer available');await api.performAction('screenshot',{target:record.source,reason:'Staff requested evidence capture'});toast('Capture requested','Check evidence for the capture result.');return;}
    if(action==='liveInspectEvidence'){const result=await api.getDetail(el.dataset.kind,el.dataset.id);openModal('Evidence details',`<div class="v12-form-modal"><pre style="white-space:pre-wrap">${esc(JSON.stringify(result.detail,null,2))}</pre></div>`);return;}
    throw Error('This control is awaiting its server integration. No change was saved.');
  }
  const handled=new Set(['inviteMember','createInviteLink','liveSaveMember','liveRevokeMember','refresh','testSync','addPlayerNote','exportLogs','clearCache','syncRules','runConsole','createBackup','screenshotPlayer','liveInspectEvidence']);
  const pending=new Set(['saveModal','saveConfig','saveSecurityEditor','saveNativeEditor','removeRule','confirmRestart','saveZone','createApiKey','createPermissionRole','addBypass','detectorSettings']);
  document.addEventListener('click',event=>{
    if(state.demoSession)return;
    const el=event.target.closest('[data-action]');
    const plain=event.target.closest('button');
    let action=el?.dataset.action;
    if(!action&&plain&&/export csv/i.test(plain.textContent))action='exportLogs';
    if(!action&&plain&&/^refresh$/i.test(plain.textContent.trim()))action='refresh';
    if(event.target.closest('.switch')){event.preventDefault();event.stopImmediatePropagation();toast('Server policy required','This setting is awaiting a canonical policy binding. No change was saved.','bad');return;}
    if(!handled.has(action)&&!pending.has(action))return;
    event.preventDefault();event.stopImmediatePropagation();
    const target=el||plain;target.disabled=true;
    handle(action,target).catch(error=>toast('Request failed',error.message,'bad')).finally(()=>{if(target.isConnected)target.disabled=false;});
  },true);
};
