/* Data binding only. The original app.js templates own every dashboard layout. */
(() => {
  const cache=new Map();
  const date=value=>value?new Date(Number(value)*1000).toLocaleString():'—';
  const bytes=value=>Number.isFinite(Number(value))?(Number(value)/1048576).toFixed(2)+' MB':'Not reported';
  const duration=value=>Number.isFinite(Number(value))&&value!=null?Math.floor(value/3600)+'h '+Math.floor(value%3600/60)+'m':'—';
  const datasets={logs:'audit',logbook:'audit',replays:'evidence','removed-detections':'reviews',falcon:'analytics','firewall-analytics':'analytics',insights:'health','live-view':'screenshots',console:'audit',bans:'bans'};
  const api=()=>window.ParadoxAPI;
  const sum=(rows,key)=>rows.reduce((total,r)=>total+Number(r[key]||0),0);
  function decorate(snapshot){
    if(!snapshot)return snapshot;
    const result={...snapshot,summary:{...snapshot.summary,maxPlayers:snapshot.server?.maxPlayers}};
    result.mapPins=(snapshot.players||[]).filter(p=>p.coords).map(p=>({id:p.source,name:p.name,label:p.name,type:'player',x:Math.max(0,Math.min(100,(p.coords.x+4000)/8500*100)),y:Math.max(0,Math.min(100,100-(p.coords.y+4500)/12500*100))}));
    result.detections=(snapshot.detections||[]).map(d=>({...d,time:date(d.created_at),playerName:d.playerName||`Session ${String(d.session_id||'').slice(-8)}`}));
    return result;
  }
  async function fetchSection(state){
    const key=state.page;
    if(key==='overview'){const result=await api().query('dashboard_stats',{range:state.chartRange||'24h'});try{result.storage=await api().storageStatus();}catch{}return result;}
    if(key==='permissions')return state.permissionsTab==='roles'?api().query('permissions'):api().getAccessUsers();
    if(key==='api-keys'||key==='server-details')return api().getSettings();
    if(key==='cdn')return api().storageStatus();
    if(key==='backups')return api().mode==='nui'?Promise.reject(Error('Configuration backups are managed on the website.')):api().query('policy_history',{page:1,pageSize:50});
    if(key.endsWith('-rules')||['event-protection','key-locks','rate-limits'].includes(key))return api().getConfig();
    if(datasets[key])return api().query(datasets[key],{page:1,pageSize:50});
    return {};
  }
  function ensure(state,render){
    if(state.demoSession||!state.authenticated)return;
    const key=`${state.user?.id||'nui'}:${state.server?.serverId||''}:${state.page}:${state.permissionsTab||''}:${state.chartRange||''}`;
    const old=cache.get(key);if(old&&(old.pending||Date.now()-old.at<15000))return;
    const page=state.page,entry={pending:true,at:Date.now()};cache.set(key,entry);
    const captured={...state};
    Promise.resolve().then(()=>fetchSection(captured)).then(data=>{
      entry.data=data||{};
      if(cache.get(key)!==entry||!state.authenticated)return;
      state.sectionData=state.sectionData||{};state.sectionData[page]=entry.data;
      if(page==='overview'&&data?.storage&&state.live)state.live.storage={used:'~'+bytes(data.storage.usedBytes),quota:'estimated server database size'};
      if(page==='logs'&&state.live)state.live.sections={...state.live.sections,logs:(data.rows||[]).map(r=>({time:date(r.created_at),log:`${r.actor}: ${r.kind}`}))};
    }).catch(error=>{entry.error=error.message;if(cache.get(key)===entry&&state.authenticated){state.sectionData=state.sectionData||{};state.sectionData[page]={error:error.message};}}).finally(()=>{entry.pending=false;if(cache.get(key)===entry&&state.authenticated&&state.page===page)render(page);});
  }
  function falcon(data,mode){
    if(!data||data.error)return {values:[],tops:[],error:data?.error||'Loading recorded telemetry'};
    const rows=mode==='events'?data.events:mode==='entities'?data.entities:null;
    if(!rows)return {values:[],tops:[],error:'This telemetry stream is not recorded by the current server adapter.'};
    const total=sum(rows,'total'),rejected=mode==='events'?sum(rows,'rejected'):null;
    return {values:mode==='events'?[total,'—']:[total,'—','—','—',rows.length,'—'],total,tops:rows.map(r=>({name:r.event_name||`Entity type ${r.entity_type}`,total:r.total})),rejected};
  }
  const ruleIds={'Anti Teleport':['movement.server_delta'],'Anti NoClip':['movement.context'],'Anti Spectate':['camera.spectate'],'Anti God Mode':['player.invincible','player.server_invincible'],'Anti Ped Model Changer':['player.server_model'],'Anti Free Cam (1)':['camera.freecam'],'Anti Invisible':['player.invisible'],'Anti Aim Bot':['combat.geometry'],'Anti Vehicle Modifier':['vehicle.server_state'],'Menu Detection (1)':['menu.context'],'Anti Entity Exploits':['entity.policy'],'Verify Weapon Damage':['weapon.policy'],'Auto Anti Weapon Spawn':['weapon.inventory']};
  const settingPaths={'Enable Whitelist':'entities.requireAllowlist','Whitelist Enabled':'world.particles.requireAllowlist'};
  function binding(state,label){const data=state.sectionData?.[state.page];const ids=(ruleIds[label]||[]).filter(id=>data?.policy?.detections?.[id]);const settingPath=settingPaths[label];const hasSetting=settingPath&&typeof data?.policy?.settings?.[settingPath]==='boolean';return {ids,data,settingPath:hasSetting?settingPath:null,available:hasSetting||ids.length>0,enabled:hasSetting?data.policy.settings[settingPath]:ids.length>0&&ids.every(id=>data.policy.detections[id].enabled)};}
  window.ParadoxData={decorate,ensure,falcon,date,bytes,duration,binding,clear(){cache.clear();}};
})();
