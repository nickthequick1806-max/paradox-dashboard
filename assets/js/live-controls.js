/* Connect existing controls; never replace a page renderer or its styles. */
window.installParadoxLiveControls=function({state,esc,fa,openModal,closeModal,toast,render,navigateToPage,playerModal}){
  const api=window.ParadoxAPI,$=s=>document.querySelector(s);
  const refresh=()=>{window.ParadoxData.clear();render(state.page);};
  const download=(name,text,type='application/json')=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const footer=(action,label)=>`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="${action}">${esc(label)}</button>`;
  async function handle(action,el){
    if(action==='liveModerate'||action==='createBan'||action==='openPlayerPicker'){
      const key=el.dataset.player||state.playerModalName,record=state.playerDetails[key];
      state.moderationTarget=record?.session?{source:record.source,session:record.session}:null;
      const operation=el.dataset.operation||(action==='createBan'?'permban':'warn');
      const operations={warn:'Warn',kick:'Kick',tempban:'Temporary ban (server configured duration)',permban:'Permanent ban',freeze:'Freeze (5 minute lease)',unfreeze:'Unfreeze',quarantine:'Quarantine (5 minute lease)',release:'Release quarantine',screenshot:'Request screenshot',repair:'Repair vehicle',delete_vehicle:'Delete vehicle'};
      if(api.mode==='nui')Object.assign(operations,{goto_player:'Go to player',bring:'Bring player',spectate:'Spectate (60 seconds)',spectate_stop:'Stop spectating'});
      openModal('Player action',`<div class="form-grid"><div class="field"><label>Player server ID</label><input class="input" id="liveActionTarget" type="number" min="1" value="${record?.source||''}"></div><div class="field"><label>Action</label><select class="input" id="liveActionKind">${Object.entries(operations).map(([id,title])=>`<option value="${id}" ${id===operation?'selected':''}>${esc(title)}</option>`).join('')}</select></div><div class="field full"><label>Reason</label><textarea class="textarea" id="liveActionReason" minlength="3" maxlength="256"></textarea></div></div>`,footer('liveConfirmAction','Review action'));return;
    }
    if(action==='liveConfirmAction'){
      const target=Number($('#liveActionTarget').value),reason=$('#liveActionReason').value.trim(),operation=$('#liveActionKind').value;
      if(!Number.isInteger(target)||target<1||reason.length<3||reason.length>256)throw Error('Enter a current player ID and a reason of 3–256 characters.');
      const result=await api.getDetail('player',target);if(!result?.detail?.session)throw Error('Player session is unavailable');
      if(state.moderationTarget?.source===target&&state.moderationTarget.session!==result.detail.session)throw Error('This player reconnected. Reopen their details before acting.');
      state.actionDraft={operation,payload:{target,targetSession:result.detail.session,reason}};
      openModal('Confirm player action',`<div class="v12-form-modal"><h2>${esc(operation)} · ${esc(result.detail.name)} (${target})</h2><p>${esc(reason)}</p><p>The server will check your permission and this exact player session before accepting the action.</p></div>`,footer('liveSubmitAction','Confirm action'));return;
    }
    if(action==='liveSubmitAction'){
      const draft=state.actionDraft;if(!draft)throw Error('Review the player action first.');
      state.actionDraft=null;await api.performAction(draft.operation,draft.payload);closeModal();toast('Request accepted','Check the server audit for the outcome.');refresh();return;
    }
    if(action==='inspectRow'||action==='rowMenu'){
      const id=el.closest('tr')?.querySelector('td')?.textContent.trim();
      const kind=({bans:'ban',detections:'detection',logs:'audit',replays:'evidence',logbook:'audit'})[state.page];
      if(!kind||!id)throw Error('No persisted detail record is associated with this row.');
      const result=await api.getDetail(kind,id);
      openModal('Record details',`<div class="v12-form-modal"><pre style="white-space:pre-wrap">${esc(JSON.stringify(result.detail,null,2))}</pre></div>`,kind==='ban'&&!result.detail.revoked_at?footer('liveUnban','Revoke ban'):'');
      state.inspectedBan=kind==='ban'?id:null;return;
    }
    if(action==='liveUnban'){
      if(!state.inspectedBan)throw Error('Reopen the ban record.');
      openModal('Revoke ban',`<div class="v12-form-modal"><p>${esc(state.inspectedBan)}</p><label>Reason</label><input class="input" id="liveUnbanReason" minlength="3" maxlength="256"></div>`,footer('liveConfirmUnban','Confirm revoke'));return;
    }
    if(action==='liveConfirmUnban'){
      const reason=$('#liveUnbanReason').value.trim();if(reason.length<3)throw Error('A reason is required.');
      await api.performAction('unban',{target:state.inspectedBan,reason});state.inspectedBan=null;closeModal();toast('Revoke requested','Check the ban record and audit for the result.');refresh();return;
    }

    if(action==='detectorSettings'||action==='livePolicyToggle'){
      const label=el.dataset.name,matched=window.ParadoxData.binding(state,label);
      if(!matched.available)throw Error('This original control has no independently configurable server detector yet.');
      const response=await api.getConfig();if(!response?.policy)throw Error('Owner permission is required');
      state.policyEdit={...response,ids:matched.ids,label,settingPath:matched.settingPath};
      if(matched.settingPath){openModal(`${esc(label)} Settings`,`<div class="pro-form-modal"><h2>${esc(label)}</h2><div class="form-grid"><div class="field"><label>Enabled</label><input id="livePolicyEnabled" type="checkbox" ${!matched.enabled?'checked':''}></div><div class="field"><label>Change reason</label><input class="input" id="livePolicyReason" maxlength="256" minlength="3"></div></div></div>`,footer('liveSavePolicy','Save Changes'));return;}
      const rule=response.policy.detections[matched.ids[0]];
      openModal(`${esc(label)} Settings`,`<div class="pro-form-modal"><div class="pro-form-icon">${fa('gear')}</div><h2>${esc(label)}</h2><p>Edits apply to ${matched.ids.map(esc).join(', ')}. The server rejects enforcement for advisory-only signals.</p><div class="form-grid"><div class="field"><label>Detection action</label><select class="input" id="livePolicyMode">${['OFF','SHADOW','LOG','BLOCK','ENFORCE'].map(mode=>`<option ${mode===rule.mode?'selected':''}>${mode}</option>`).join('')}</select></div><div class="field"><label>Enabled</label><input id="livePolicyEnabled" type="checkbox" ${action==='livePolicyToggle'?!matched.enabled?'checked':'':rule.enabled?'checked':''}></div><div class="field"><label>Cooldown (ms)</label><input class="input" id="livePolicyCooldown" type="number" min="1000" max="600000" value="${rule.cooldown}"></div><div class="field"><label>Change reason</label><input class="input" id="livePolicyReason" maxlength="256" minlength="3"></div></div></div>`,footer('liveSavePolicy','Save Changes'));return;
    }
    if(action==='liveSavePolicy'){
      const edit=state.policyEdit;if(!edit)throw Error('Reopen the settings to reload the policy.');
      const policy=structuredClone(edit.policy),reason=$('#livePolicyReason').value.trim();
      if(edit.settingPath)policy.settings[edit.settingPath]=edit.list||$('#livePolicyEnabled').checked;
      for(const id of edit.ids)policy.detections[id]={enabled:$('#livePolicyEnabled').checked,mode:$('#livePolicyMode').value,cooldown:Number($('#livePolicyCooldown').value)};
      await api.savePolicy(policy,edit.revision,reason);state.policyEdit=null;closeModal();toast('Policy saved','The server validated and audited this revision.');refresh();return;
    }
    if(action==='saveConfig'){
      if(state.page!=='entity-rules'||!['whitelist','blacklist'].includes(state.entityTab))throw Error('This section requires its specific server policy editor.');
      const names=$('.v11-textarea').value.split(/[\s,;]+/).filter(Boolean);
      if(!names.length||names.length>256||names.some(name=>!/^[A-Za-z0-9_]{1,64}$/.test(name)))throw Error('Enter 1–256 valid model names or hashes.');
      const response=await api.getConfig();if(!response?.policy)throw Error('Owner permission is required');
      const settingPath=state.entityTab==='whitelist'?'entities.allowed':'entities.blocked';
      const list=[...new Set([...(response.policy.settings?.[settingPath]||[]),...names.map(name=>/^\d+$/.test(name)?Number(name):name)])];
      state.policyEdit={...response,ids:[],settingPath,list};
      openModal('Save entity policy',`<div class="pro-form-modal"><h2>Update ${esc(state.entityTab)}</h2><p>${names.length} model entries will be validated by the server.</p><label>Change reason</label><input class="input" id="livePolicyReason" maxlength="256" minlength="3"></div>`,footer('liveSavePolicy','Save Changes'));return;
    }
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
    if(action==='createBackup'||action==='liveRestoreBackup'){
      if(api.mode==='nui')throw Error('Configuration backups are managed on the website.');
      const current=await api.getConfig();if(!current?.policy)throw Error('Policy is unavailable');
      const restore=action==='liveRestoreBackup',saved=restore?(await api.query('policy_version',{revision:Number(el.dataset.revision)})).detail:null;
      state.backupDraft={policy:restore?saved.policy:current.policy,revision:current.revision,restore};
      openModal(restore?'Restore Backup':'Create Backup',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('box-archive')}</div><h2>${restore?'Restore revision '+esc(saved.revision):'Create a verified snapshot'}</h2><p>${restore?'The saved policy will be validated and committed as a new audited revision. Existing revisions are retained.':'Save the current server policy as an audited revision.'}</p><label>${restore?'Restore reason':'Backup label'}</label><input class="input" id="liveBackupReason" minlength="3" maxlength="256"></div>`,footer('liveSaveBackup',restore?'Restore Backup':'Create Backup'));return;
    }
    if(action==='liveSaveBackup'){
      const draft=state.backupDraft,reason=$('#liveBackupReason').value.trim();if(!draft||reason.length<3)throw Error('A label or reason of at least three characters is required.');
      await api.savePolicy(draft.policy,draft.revision,reason);state.backupDraft=null;closeModal();toast(draft.restore?'Policy restored':'Backup created','The server committed a new audited policy revision.');refresh();return;
    }
    if(action==='liveDownloadBackup'){
      const result=await api.query('policy_version',{revision:Number(el.dataset.revision)});download('paradox-policy-'+result.detail.revision+'.json',JSON.stringify(result.detail,null,2));return;
    }
    if(action==='screenshotPlayer'){const record=state.playerDetails[el.dataset.player];if(!record)throw Error('Player is no longer available');await api.performAction('screenshot',{target:record.source,reason:'Staff requested evidence capture'});toast('Capture requested','Check evidence for the capture result.');return;}
    if(action==='liveInspectEvidence'){await window.ParadoxInspectRecord(el.dataset.kind,el.dataset.id);return;}
    throw Error('This control is awaiting its server integration. No change was saved.');
  }
  const handled=new Set(['liveRestoreBackup','liveSaveBackup','liveDownloadBackup','liveModerate','createBan','openPlayerPicker','liveConfirmAction','liveSubmitAction','inspectRow','rowMenu','liveUnban','liveConfirmUnban','saveConfig','detectorSettings','livePolicyToggle','liveSavePolicy','inviteMember','createInviteLink','liveSaveMember','liveRevokeMember','refresh','testSync','addPlayerNote','exportLogs','clearCache','syncRules','runConsole','createBackup','screenshotPlayer','liveInspectEvidence']);
  const pending=new Set(['saveModal','saveConfig','saveSecurityEditor','saveNativeEditor','removeRule','confirmRestart','saveZone','createApiKey','createPermissionRole','addBypass','detectorSettings']);
  document.addEventListener('click',event=>{
    if(state.demoSession)return;
    const el=event.target.closest('[data-action]');
    const plain=event.target.closest('button');
    let action=el?.dataset.action;
    if(!action&&plain&&/export csv/i.test(plain.textContent))action='exportLogs';
    if(!action&&plain&&/^refresh$/i.test(plain.textContent.trim()))action='refresh';
    if(event.target.closest('.switch')&&action!=='livePolicyToggle'){event.preventDefault();event.stopImmediatePropagation();toast('Server policy required','This setting is awaiting a canonical policy binding. No change was saved.','bad');return;}
    if(!handled.has(action)&&!pending.has(action))return;
    event.preventDefault();event.stopImmediatePropagation();
    const target=el||plain;target.disabled=true;
    handle(action,target).catch(error=>toast('Request failed',error.message,'bad')).finally(()=>{if(target.isConnected)target.disabled=false;});
  },true);
};
