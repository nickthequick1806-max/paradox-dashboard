/* Recorded data in the supplied detail-dialog shells. No production preview facts. */
window.installParadoxLiveDetails=function({state,esc,fa,openModal,closeModal,toast,render}){
  const api=window.ParadoxAPI,date=window.ParadoxData.date;
  const kv=(key,value)=>`<div class="sm-kv"><span>${esc(key)}</span><strong>${esc(value??'Not reported')}</strong></div>`;
  const code=value=>`<pre class="sm-code">${esc(JSON.stringify(value,null,2))}</pre>`;
  const shell=(page,title,body,foot='')=>openModal(title,`<div class="section-modal ${page}"><div class="section-modal-hero"><div class="section-modal-icon">${fa('shield-halved')}</div><div><span>RECORDED SERVER DATA</span><h2>${esc(title)}</h2></div></div>${body}</div>`,foot||'<button class="btn" data-action="closeModal">Close</button>');
  function evidence(detail,tab='Overview'){
    state.recordDetail=detail;const s=detail.snapshot||{},review=detail.reviews?.[0];
    const tabs=`<div class="sm-tabs interactive">${['Overview','Evidence','Player','Server Logs'].map(name=>`<button class="${name===tab?'active':''}" data-action="liveRecordTab" data-tab="${name}">${name}</button>`).join('')}</div>`;
    let body='';
    if(tab==='Overview')body=`<h3>Detection reason</h3><p class="det-reason">${esc(s.detection||'Unknown signal')}</p><div class="sm-grid4">${kv('Detection ID',detail.id)}${kv('Module',s.module)}${kv('Trust',s.trust)}${kv('Created',date(s.timestamp))}</div>${review?`<section class="recommendation-box"><div><strong>${review.removed?'Dismissed':'Restored'}</strong><p>${esc(review.reason)}</p><span>${esc(review.actor)} · ${esc(date(review.updated_at))}</span></div></section>`:''}`;
    if(tab==='Evidence')body=`<div class="v15-modal-section"><h3>${fa('camera')} Evidence</h3><div class="v15-evidence-grid">${(detail.screenshots||[]).map(p=>`<button class="btn" data-action="liveScreenshotDetail" data-id="${esc(p.id)}">${fa('image')} ${esc(p.status)} · ${esc(date(p.created_at))}</button>`).join('')||'<div>No screenshot recorded</div>'}</div><h3>Captured telemetry</h3>${code(s.telemetry||{})}<h3>Event evidence</h3>${code(s.evidence||{})}</div>`;
    if(tab==='Player')body=`<div class="v15-modal-section"><h3>${fa('user')} Player at capture</h3>${kv('Server ID',s.source)}${kv('Session',s.session)}${kv('State',s.state)}${kv('Routing bucket',s.bucket)}${code(s.position||{})}</div>`;
    if(tab==='Server Logs')body=`<div class="v15-modal-section"><h3>${fa('terminal')} Recorded processing</h3><div class="v15-logline">${esc(date(s.timestamp))} · ${esc(s.detection)} · ${esc(s.mode||'Unreported mode')}</div>${(detail.providers||[]).map(p=>`<div class="v15-logline">${esc(p.provider)}: ${esc(p.status)} · ${esc(date(p.created_at))}</div>`).join('')}</div>`;
    shell('detections','Detection',`<div class="detection-review-grid"><section><div class="det-action-banner">${fa('triangle-exclamation')}<div><span>POLICY MODE</span><strong>${esc(s.mode||'Not reported')}</strong></div><b>${s.confidence==null?'Unrated':esc(s.confidence)+'% signal confidence'}</b></div>${tabs}${body}</section><aside><h3>${fa('user')} Player</h3><div class="det-player"><div class="avatar">${esc(s.source??'?')}</div><div><strong>Server ID ${esc(s.source??'Unknown')}</strong><span>At capture time</span></div></div>${kv('Session state',s.state)}${kv('Category',s.category)}${kv('Exemption',s.exemption||'None')}</aside></div>`,`<button class="btn" data-action="liveReviewRecord" data-removed="${review?.removed?'false':'true'}">${fa(review?.removed?'rotate-left':'trash')} ${review?.removed?'Restore':'Remove'} Detection</button><button class="btn" data-action="closeModal">Close</button>`);
  }
  async function inspect(kind,id){
    shell(kind,'Loading record','<div class="v13-tab-empty">Loading the recorded server response…</div>');
    const version=state.modalVersion;
    try{
      const response=await api.getDetail(kind,id);if(version!==state.modalVersion)return;
      const d=response?.detail;if(!d)throw Error('Record unavailable');
      if(kind==='evidence'||kind==='detection'){evidence(d);return;}
      if(kind==='screenshot'){
        const valid=typeof d.image_data==='string'&&d.image_data.length<=2000000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d.image_data);
        shell('live-view','Evidence capture',`<div class="stream-modal-preview">${valid?`<img style="max-width:100%;max-height:60vh" src="${esc(d.image_data)}" alt="Recorded server evidence">`:`${fa('image')}<strong>${esc(d.status)}</strong><span>No captured image is available for this record.</span>`}</div><div class="sm-grid4">${kv('Evidence',d.evidence_id)}${kv('Captured',date(d.created_at))}${kv('Status',d.status)}${kv('Type','Still image')}</div>`);return;
      }
      shell('logbook','Audit Entry',`<div class="audit-modal-head"><div class="avatar">A</div><div><strong>${esc(d.actor)}</strong><span>${esc(d.kind)}</span></div><time>${esc(date(d.created_at))}</time></div><div class="audit-flow">${code(d.detail||{})}</div><div class="sm-grid4">${kv('Audit ID',d.id)}${kv('Action',d.kind)}</div>`);
    }catch(error){if(version===state.modalVersion)shell(kind,'Record unavailable',`<div class="v13-tab-empty">${esc(error.message)}</div>`);}
  }
  window.ParadoxInspectRecord=inspect;
  window.ParadoxLiveDetail=(page,card)=>{
    const id=card?.dataset?.recordId;
    const kinds={detections:'detection','removed-detections':'detection',replays:'evidence',logs:'audit',logbook:'audit','live-view':'screenshot',cdn:'screenshot'};
    if(page==='cdn'&&!id)return false;
    if(kinds[page]){if(id)inspect(kinds[page],id);else shell(page,'Record unavailable','<div class="v13-tab-empty">Select a persisted record to inspect its details.</div>');return true;}
    if(page==='server-details'){
      const s=state.live?.server||{};
      shell(page,'Server Detail',`<div class="server-modal-identity"><div class="server-orb">${fa('server')}</div><div><span>CONNECTED SERVER</span><h3>${esc(s.name||state.server.name)}</h3><p>${esc(state.server.serverId||'Current game server')}</p></div><span class="status-online">${state.live?.connected?'ONLINE':'OFFLINE'}</span></div><div class="server-modal-columns"><section><h3>Runtime</h3>${kv('Version',s.version)}${kv('Uptime',s.uptime)}${kv('Players',state.live?.summary?.online)}${kv('Max players',s.maxPlayers)}</section><section><h3>Protection</h3>${kv('Mode',state.live?.mode)}${kv('Database',state.live?.health?.database?.schema)}${kv('Storage provider',state.sectionData?.[page]?.settings?.fiveManageKeyConfigured?'Configured; acceptance pending':'Not configured')}</section></div>`);return true;
    }
    if(page==='insights'||page==='firewall-analytics'){
      const d=state.sectionData?.[page]||{};
      shell(page,page==='insights'?'Security Insight':'Firewall Statistic',`<div class="sm-grid4">${kv('Database',d.db?.schema)}${kv('Policy mode',d.mode||state.live?.mode)}${kv('Event categories',d.events?.length)}${kv('Detection categories',d.detections?.length)}</div><div class="recommendation-box"><div><strong>Recorded observations</strong><span>Missing measurements do not establish clean gameplay.</span></div></div>${code(d)}`);return true;
    }
    // Other cards already contain real values or explicit unavailable states; let their existing
    // expanded-card renderer display those exact values instead of a sample-only dialog.
    return false;
  };
  document.addEventListener('click',async event=>{
    if(state.demoSession)return;const el=event.target.closest('[data-action]');
    if(!el||!['liveRecordTab','liveScreenshotDetail','liveReviewRecord','liveSaveReview'].includes(el.dataset.action))return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      if(el.dataset.action==='liveRecordTab'){if(state.recordDetail)evidence(state.recordDetail,el.dataset.tab);return;}
      if(el.dataset.action==='liveScreenshotDetail'){await inspect('screenshot',el.dataset.id);return;}
      if(el.dataset.action==='liveReviewRecord'){
        const d=state.recordDetail;if(!d)throw Error('Reopen the record.');
        state.reviewDraft={id:d.id,removed:el.dataset.removed==='true'};
        shell('removed-detections',state.reviewDraft.removed?'Remove Detection':'Restore Detection',`<div class="removed-audit"><p>${esc(d.id)}</p><label>Review reason</label><textarea class="textarea" id="liveReviewReason" minlength="3" maxlength="256"></textarea></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="liveSaveReview">Save review</button>`);return;
      }
      const text=document.querySelector('#liveReviewReason')?.value.trim();if(!text||text.length<3)throw Error('A review reason of at least three characters is required.');
      if(state.reviewSaving)return;
      const draft=state.reviewDraft;if(!draft)throw Error('Reopen the record.');
      state.reviewSaving=true;el.disabled=true;
      try{await api.performAction('review',{...draft,text});if(state.reviewDraft===draft){state.reviewDraft=null;closeModal();}window.ParadoxData.clear();render(state.page);toast('Review saved','The original evidence and the audited review remain in the server database.');}
      finally{state.reviewSaving=false;el.disabled=false;}
    }catch(error){toast('Request failed',error.message,'bad');}
  },true);
};
