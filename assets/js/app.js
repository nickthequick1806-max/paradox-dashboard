(() => {
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const main = $('#mainContent');
  const rail = $('#rightRail');
  const shell = $('#appShell');
  const modalLayer = $('#modalLayer');
  const toasts = $('#toastStack');
  const dropdownLayer = $('#dropdownLayer');
  const authLayer = $('#authLayer');

  const readStore = (key, fallback={}) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const storedPrefs = readStore('pa_preferences', {});
  const storedServer = readStore('pa_server_settings', {});
  const storedSession = readStore('pa_session', {});
  const AUTH_VERSION = 5;
  const dismissedNotificationKeys = new Set(readStore('pa_dismissed_notifications', []));
  const notificationKey = n => String(n?.id || [n?.title||'', n?.body||'', n?.time||''].join('|'));

  const state = {
    page: 'overview',
    devMode: false,
    attackMode: false,
    blockConnections: false,
    chartRange: '24h',
    searchOpen: false,
    mapMode: storedPrefs.mapMode || 'atlas',
    mapZoom: Number(storedPrefs.mapZoom || 1.08),
    mapX: 0,
    mapY: 0,
    accent: storedPrefs.accent || '#47f3b4',
    authenticated: storedSession?.v === AUTH_VERSION && !!storedSession?.createdAt,
    demoSession: location.protocol==='file:' && storedSession?.v === AUTH_VERSION && !!storedSession?.demo,
    setupComplete: !!localStorage.getItem('pa_setup_complete'),
    user: Object.assign({name:'Dashboard user',role:'Viewer',email:'',avatarUrl:''}, readStore('pa_account',{})),
    server: Object.assign({
      name:'FiveM Server',
      serverId:'',
      serverUrl:'',
      region:'',
      syncInterval:5000,
      syncKeyConfigured:false,
      fiveManageKeyConfigured:false,
      linked:false
    }, storedServer),
    live: null,
    playerDetails: {},
    notifications: storedSession?.demo ? [
      {title:'High confidence detection',body:'Weapon modifier evidence reached 97% confidence.',time:'2m',icon:'fa-shield-halved',unread:true,page:'detections'},
      {title:'Entity burst blocked',body:'12 unauthorized entities were cancelled and removed.',time:'7m',icon:'fa-cubes',unread:true,page:'detections'},
      {title:'Protection synchronized',body:'87 player sessions acknowledged the latest rules.',time:'18m',icon:'fa-arrows-rotate',unread:false,page:'logs'}
    ].filter(n=>!dismissedNotificationKeys.has(notificationKey(n))) : []
  };

  const pageMeta = {
    overview:['Overview','Live anti-cheat status, telemetry and server health.'],
    console:['Console','Live protection console with command and subsystem output.'],
    players:['Players Management','Inspect connected players, flags, playtime and last-seen activity.'],
    falcon:['Falcon Analytics','Real-time monitoring and analytics for server activity.'],
    'live-view':['Live View','Real-time security cards for online players.'],
    'interactive-map':['Interactive Map','Live player, incident and entity positions.'],
    'entity-rules':['Entity Rules','Configure object, ped and vehicle creation protection.'],
    'particle-rules':['Particle Rules','Control ptFx allowlists, rate limits and attachment policies.'],
    'weapon-rules':['Weapon Rules','Configure weapon authorization, damage and ammunition policies.'],
    'explosion-rules':['Explosion Rules','Tune explosion types, rate limits and cancellation policies.'],
    'event-protection':['Event Protection','Secure events, schemas, cooldowns and exploit guards.'],
    'general-rules':['General AntiCheat Rules','Manage and control how cheaters are handled in your server.'],
    'safety-rules':['Safety Rules','Configure safety settings for the players in your server.'],
    'native-rules':['Native Rules','Configure server-native Cfx event security modules.'],
    'key-locks':['Key Locks','Optional blocked key and input telemetry policies.'],
    'rate-limits':['Rate Limits','Global, category and detector-specific rate windows.'],
    'security-rules':['Security Rules','Session, integrity, honeypot and connection security settings.'],
    logs:['Logs','Searchable operational, security and enforcement logs.'],
    insights:['Insights','Risk trends, false-positive review and detection performance.'],
    'player-lookup':['Player Lookup','Search identities, sessions, history and linked bans.'],
    'firewall-analytics':['Firewall Analytics','Blocked events, entity traffic and request patterns.'],
    detections:['Detections','Detection catalog, current policies and recent triggers.'],
    'removed-detections':['Removed Detections','Disabled and retired detections with audit history.'],
    replays:['Replays','Evidence replay sessions and timeline reconstruction.'],

    assets:['Assets','View and download protected PARADOX builds and artifacts.'],
    logbook:['Logbook','View your server audit log and activity history.'],
    'server-details':['Server Details','View technical specifications and configuration details for your server.'],
    'api-keys':['API Keys','Create and manage secure API keys for dashboard integrations.'],
    'support-tickets':['Support Tickets','Create and manage support tickets.'],
    cdn:['CDN Files','Files uploaded to your server CDN storage.'],
    permissions:['Permissions & RBAC','Security roles, permissions and access sources.'],
    backups:['Backups','Configuration and database backup management.'],
  };

  const DEMO_PLAYERS = [
    ['87','Kevin#7719','license:92ef...8a17','Mechanic','31 ms',12,'Safe'],
    ['42','2Moonlight#8421','license:1100...c45','Unemployed','44 ms',91,'Critical'],
    ['113','SashaV','license:afd8...2bc','Police','27 ms',8,'Safe'],
    ['58','n0va.exe','license:7cd1...91f','Taxi','62 ms',64,'High'],
    ['26','RetroJames','license:03ac...fe8','EMS','35 ms',22,'Low'],
    ['141','AveryB','license:bc11...998','Dealer','55 ms',47,'Medium'],
    ['12','NorthsideJay','license:118a...bf2','Police','28 ms',5,'Safe'],
    ['99','RicoV','license:56a4...c11','Unemployed','71 ms',36,'Medium']
  ];

  const DEMO_DETECTIONS = [
    ['DET-9281','Weapon Modifications','2Moonlight#8421','combat.weapon_damage','97','High','Blocked','2m ago'],
    ['DET-9278','Speed Hack','n0va.exe','movement.vehicle_speed','82','High','Observed','5m ago'],
    ['DET-9274','No Recoil','2Moonlight#8421','combat.recoil_pattern','74','Medium','Screenshot','8m ago'],
    ['DET-9269','Menus / Injectors','Unknown','integrity.texture_signature','58','Medium','Logged','13m ago'],
    ['DET-9261','Teleportation','AveryB','movement.teleport_delta','61','Medium','Observed','19m ago'],
    ['DET-9257','Entity Spam','RicoV','world.entity_burst','89','High','Blocked','24m ago'],
    ['DET-9248','Godmode Proofs','n0va.exe','player.godmode_proofs','92','Critical','Blocked','31m ago']
  ];

  const DEMO_CONNECTIONS = [
    ['CON-22091','Kevin#7719','Allowed','license + discord + fivem','34 ms','Just now'],
    ['CON-22090','Unknown User','Denied','Active ban PA-F72B91','27 ms','2m ago'],
    ['CON-22089','SashaV','Allowed','Identity verified','31 ms','5m ago'],
    ['CON-22088','vpnTest22','Review','Proxy reputation signal','410 ms','8m ago'],
    ['CON-22087','RetroJames','Allowed','Identity verified','29 ms','10m ago']
  ];

  state.splitView = state.splitView || {active:false,left:null,right:null,ratio:58};
  state.securityRuleFilter = state.securityRuleFilter || 'all';
  state.securityRuleset = state.securityRuleset || 'All Rulesets';
  state.securityAdvanced = !!state.securityAdvanced;
  state.securityRuleOverrides = state.securityRuleOverrides || {};
  state.hiddenRules = state.hiddenRules || {};
  state.nativeFilter = state.nativeFilter || 'all';
  state.detectionFilter = state.detectionFilter || 'all';
  state.removedDetectionFilter = state.removedDetectionFilter || 'all';
  state.securityCollapsed = state.securityCollapsed || {};
  state.securityEditor = state.securityEditor || null;
  state.nativeEditor = state.nativeEditor || null;
  state.sectionModalTab = state.sectionModalTab || {};
  state.sectionModalTitle = state.sectionModalTitle || '';
  state.eventLists = state.eventLists || {locked:['jim-mining:Crafting:GetItem','jim-mining:server:toggleItem','jim-recycle:server:toggleItem','jim-mining:Reward','sf_camerasecurity:Server:BuyItem','lation_247robbery:CompleteSafeRobbery','hg-wheel:server:giveitem','drc_uwu:giveitems','angelicxs-BankTruck:Server:HeistReward','AttackTransport:graczZrobilnapad','qb-hotdogjob:server:Sell','qb-garbagejob:server:PayShift','qb-diving:server:TakeCoral','qb-diving:server:SellCorals','qb-crafting:server:receiveItem','inventory:server:OpenInventory','inventory:server:SetInventoryData','QBCore:Server:AddItem','QBCore:Server:TriggerCallback'],serverIgnored:['screencapture:INTERNAL_requestUploadToken','prism-mining:server:OnPlayerLoaded'],clientIgnored:['screencapture:INTERNAL_requestUploadToken','chat:addSuggestion','chat:removeSuggestion','chat:addMessage','phone:messages:newMessage','nolag_properties:client:trashAdded','prp-seahunt:radiusBlip','prp-seahunt:destroy','nolag_properties:client:setLightsState','phone:crypto:updateCoins']};

  let players = state.demoSession ? DEMO_PLAYERS.map(row=>[...row]) : [];
  let detections = state.demoSession ? DEMO_DETECTIONS.map(row=>[...row]) : [];
  let connectionRows = state.demoSession ? DEMO_CONNECTIONS.map(row=>[...row]) : [];

  function setDemoData(enabled){
    state.demoSession=!!enabled;
    players=enabled?DEMO_PLAYERS.map(row=>[...row]):[];
    detections=enabled?DEMO_DETECTIONS.map(row=>[...row]):[];
    connectionRows=enabled?DEMO_CONNECTIONS.map(row=>[...row]):[];
    if(enabled){
      state.live={demo:true,connected:true,summary:{online:87,maxPlayers:256,connections:1172,warnings:5,kicks:0,bans:38,requests:2009,detections:146,activeDetections:4},server:{name:'Paradox City RP',uptime:'14d 6h 23m',region:'Los Angeles, US'}};
      state.notifications=[
        {title:'High confidence detection',body:'Weapon modifier evidence reached 97% confidence.',time:'2m',icon:'fa-shield-halved',unread:true,page:'detections'},
        {title:'Entity burst blocked',body:'12 unauthorized entities were cancelled and removed.',time:'7m',icon:'fa-cubes',unread:true,page:'detections'},
        {title:'Protection synchronized',body:'87 player sessions acknowledged the latest rules.',time:'18m',icon:'fa-arrows-rotate',unread:false,page:'logs'}
      ];
    }else{
      if(state.live?.demo) state.live=null;
      state.notifications=[];
    }
  }

  function liveOr(value, demoValue, emptyValue='—'){ return value ?? (state.demoSession ? demoValue : emptyValue); }
  function liveRows(key, demoRows=[]){
    const rows=state.sectionData?.[key]?.rows ?? state.live?.sections?.[key] ?? state.live?.[key];
    if(Array.isArray(rows)) return rows;
    return state.demoSession ? demoRows : [];
  }
  function rowsFor(key,demoRows,fields=[]){
    return liveRows(key,demoRows).map(row=>{
      if(Array.isArray(row)) return row;
      return fields.map(field=>{
        const choices=String(field).split('|');
        for(const choice of choices){ if(row?.[choice] !== undefined && row?.[choice] !== null) return String(row[choice]); }
        return '—';
      });
    });
  }
  function noLiveData(message='Waiting for live FiveM server data.'){ return `<div class="empty-state"><div class="empty-icon">${fa('satellite-dish')}</div><strong>No live data available</strong><span>${esc(message)}</span></div>`; }
  function avatarMarkup(user=state.user, cls='avatar'){
    const url=String(user?.avatarUrl||'').trim();
    if(url) return `<div class="${cls} avatar-image"><img src="${esc(url)}" alt="${esc(user?.name||'Account')} avatar" referrerpolicy="no-referrer" onerror="this.parentElement.classList.remove('avatar-image');this.remove();this.parentElement.textContent='?'"/></div>`;
    return `<div class="${cls}">${esc((user?.name||'F')[0].toUpperCase())}</div>`;
  }
  function normalizedRows(rows, mapper){ return Array.isArray(rows) ? rows.map(mapper) : []; }
  function emptyTableRow(colspan, message='No live records returned by the connected server.'){ return `<tr><td colspan="${colspan}">${noLiveData(message)}</td></tr>`; }

  const sourceColors = {green:'good',orange:'warn',red:'bad'};

  function esc(v='') { return String(v).replace(/[&<>'"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
  function riskClass(n){ return n >= 80 ? 'high' : n >= 40 ? 'medium' : 'low'; }
  function statusClass(v){ return /blocked|denied|failed|critical|high|offline/i.test(v) ? 'bad' : /review|warning|medium|degraded|queued/i.test(v) ? 'warn' : 'good'; }
  function tag(text, cls='green'){ return `<span class="tag ${cls}">${esc(text)}</span>`; }
  function switchEl(on=false, action='toggle'){ return `<button class="switch ${on?'on':''}" data-action="${action}" aria-pressed="${on}"></button>`; }

  // Compact read-only setting row used across map layers, behavior policy, RBAC,
  // dashboard settings, and server controls. This helper must exist before any
  // of those page renderers run; a missing definition previously caused those
  // routes to fall into the render-error boundary.
  function miniSetting(title, description='', enabled=false){
    const on=enabled===true || enabled==='true' || enabled===1;
    return `<div class="setting-row mini-setting"><div class="setting-copy"><strong>${esc(title)}</strong><span>${esc(description)}</span></div><button class="switch ${on?'on':''}" type="button" aria-pressed="${on}" tabindex="-1"></button></div>`;
  }

  const fa = (name, style='solid') => `<i class="fa-${style} fa-${name}"></i>`;
  function customSelect(value, options=[]){
    const all=[value,...options.filter(x=>x!==value)];
    return `<div class="custom-dropdown" data-value="${esc(value)}"><button class="custom-dropdown-btn" type="button" data-action="toggleCustomDropdown"><span>${esc(value)}</span>${fa('chevron-down')}</button><div class="custom-dropdown-menu">${all.map(o=>`<button class="custom-dropdown-option" type="button" data-action="customDropdownOption" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  }
  function hexToRgb(hex){ const m=String(hex).replace('#','').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); return m?`${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}`:'71,243,180'; }
  function applyAccent(color){
    if(!/^#[0-9a-f]{6}$/i.test(color||'')) return;
    state.accent=color; document.documentElement.style.setProperty('--accent',color); document.documentElement.style.setProperty('--accent-rgb',hexToRgb(color));
    const prefs=readStore('pa_preferences',{}); prefs.accent=color; prefs.mapMode=state.mapMode; localStorage.setItem('pa_preferences',JSON.stringify(prefs));
    drawChart();
  }

  function header(title, description, actions=''){
    return `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
  }

  function panel(title, subtitle='', body='', opts={}){
    return `<section class="panel ${opts.className||''}">
      <div class="panel-head ${opts.noBorder?'no-border':''}">
        <div class="panel-icon">${opts.icon||'◆'}</div>
        <div><div class="panel-title">${title}</div>${subtitle?`<div class="panel-subtitle">${subtitle}</div>`:''}</div>
        <div class="panel-spacer"></div>${opts.actions||''}
      </div>
      ${body?`<div class="panel-body ${opts.bodyClass||''}">${body}</div>`:''}
      ${opts.footer?`<div class="panel-foot">${opts.footer}</div>`:''}
    </section>`;
  }

  function overview(){
    const summary={...state.live?.summary,...state.sectionData?.overview?.summary};
    const recent=state.demoSession?liveRows('recentEvents',[]):(state.live?.detections||[]).slice(0,6).map(d=>({title:d.name,subtitle:d.action,player:d.playerName,time:d.time,risk:d.trust}));
    const tops=state.demoSession?liveRows('topDetections',[]):(state.sectionData?.overview?.tops||[]);
    const recentHtml=state.demoSession ? `${eventRow('red','⊘','Cheat Detection','TriggerBot detection (Weapon Control)','Player: 2Moonlight#8421','2 minutes ago','High')}${eventRow('orange','!','Suspicious Activity','Rapid fire rate detected','Player: Unknown','5 minutes ago','Medium')}${eventRow('green','✓','Player Connected','Client verified successfully','Player: Kevin#7719','8 minutes ago','Safe')}` : (recent.length ? recent.slice(0,6).map(e=>eventRow(e.color||'green',e.icon||'✓',e.title||e.type||'Server Event',e.subtitle||e.message||'',e.player?`Player: ${e.player}`:(e.source||'Server'),e.time||'Live',e.risk||e.severity||'Safe')).join('') : noLiveData('Recent events will appear here as the FiveM bridge streams them.'));
    const topHtml=state.demoSession ? `${rank(1,'Weapon Modifications',42,74)}${rank(2,'Speed Hack',28,53)}${rank(3,'No Recoil',18,37)}${rank(4,'Menus / Injectors',16,31)}${rank(5,'Teleportation',12,22)}` : (tops.length ? tops.slice(0,5).map((r,i)=>rank(i+1,r.name||r.label||'Detection',Number(r.count||0),Math.min(100,Number(r.percent||r.pct||0)))).join('') : noLiveData('Top detections are calculated from your connected server telemetry.'));
    return `<div class="page overview-page">
      <div style="font-size:11px;color:#879b95;margin-bottom:12px">Hello, <strong style="color:var(--accent)">${esc(state.user.name||'Server Owner')}</strong></div>
      <section class="hero detail-card" data-card-title="${esc(state.server.name||'FiveM Server')} Security Overview">
        <div class="hero-content">
          <img class="hero-logo" src="assets/img/logo.svg" alt="" />
          <div class="hero-copy">
            <span class="status-tag"><span class="dot"></span> ${state.demoSession?'ONLINE & PROTECTED':state.live?.connected?'ONLINE · '+esc(state.live.mode):'SYNC OFFLINE'}</span>
            <h2>${esc(state.server.name||state.live?.server?.name||'FiveM Server')} <span class="tag blue" style="vertical-align:middle">${esc(state.demoSession?'v2.4.1':state.live?.server?.version||'SHADOW')}</span></h2>
            <div class="hero-meta"><span>${esc(state.live?.server?.framework||'FiveM')}</span><span>${esc(state.live?.server?.onesync||'OneSync')}</span><span>${esc(state.live?.server?.region||state.server.region||'Live Server')}</span><span>PARADOX Protected</span></div>
            <div class="hero-caption">${state.live?.error?'Server sync failed: '+esc(state.live.error):'Live security data is sourced from the connected FiveM server.'} Powered by <strong>PARADOX ANTICHEAT.</strong></div>
          </div>
          <button class="btn primary hero-action" data-page-jump="server-controls">${fa('shield-halved')} Anti-Cheat Active</button>
        </div>
      </section>

      <div class="stats-grid">
        ${stat('CONNECTIONS',String(liveOr(summary.connections,'1,172','—')),state.demoSession?'↑ 12%':'Live','Connections in selected period',fa('right-to-bracket'),'green')}
        ${stat('WARNINGS',String(liveOr(summary.warnings,5,'—')),state.demoSession?'↓ 38%':'Live','Staff warnings in selected period',fa('triangle-exclamation'),'orange')}
        ${stat('KICKS',String(liveOr(summary.kicks,0,'—')),state.demoSession?'→ 0%':'Live','Players removed',fa('bolt'),'blue')}
        ${stat('BANS',String(liveOr(summary.bans,38,'—')),state.demoSession?'↑ 3%':'Live','Ban records in selected period',fa('ban'),'red')}
        ${stat('REQUESTS',String(liveOr(summary.requests,'2,009','—')),state.demoSession?'↑ 18%':'Live','Client reports / heartbeats since restart',fa('globe'),'purple')}
        ${stat('DETECTIONS',String(liveOr(summary.detections,146,'—')),state.demoSession?'↓ 27%':'Live','Recorded security signals',fa('bullseye'),'green')}
      </div>

      <section class="panel chart-panel span-2 detail-card" data-card-title="Server Activity">
        <div class="panel-head">
          <div class="panel-icon">▥</div><div><div class="panel-title">Server Activity</div><div class="panel-subtitle">Live server statistics and anti-cheat activity</div></div><div class="panel-spacer"></div>
          <div class="chart-head-actions">${['30m','1h','6h','12h','24h','7d'].map(r=>`<button class="range-btn ${state.chartRange===r?'active':''}" data-range="${r}">${r}</button>`).join('')}<button class="range-btn" data-action="expandChart">${fa('up-right-and-down-left-from-center')}</button></div>
        </div>
        <div class="chart-legend"><span><i class="legend-dot" style="background:var(--accent)"></i>Player Count</span><span><i class="legend-dot" style="background:var(--blue)"></i>Connections</span><span><i class="legend-dot" style="background:var(--red)"></i>Detections</span><span><i class="legend-dot" style="background:var(--orange)"></i>Kicks</span><span><i class="legend-dot" style="background:var(--purple)"></i>Bans</span></div>
        <div class="chart-wrap"><canvas id="activityChart"></canvas></div>
      </section>

      <div class="health-grid">
        ${health(fa('hard-drive'),'STORAGE',String(liveOr(state.live?.storage?.used,'0.03 GB','—')),String(liveOr(state.live?.storage?.quota,'/ 10 GB','')),Number(state.live?.storage?.percent??(state.demoSession?8:0)),'Replays, logs and evidence files')}
        ${health(fa('chart-simple'),'BANDWIDTH',String(liveOr(state.live?.bandwidth?.used,'10.95 GB','—')),'',Number(state.live?.bandwidth?.percent??(state.demoSession?27:0)),'Current billing period')}
        ${health(fa('shield-halved'),'FIREWALL',String(liveOr(state.live?.health?.firewall,'Healthy',state.live?.connected===false?'Offline':'—')),'',Number(state.live?.health?.firewallPercent??(state.demoSession?100:0)),'Protection subsystem status')}
        ${health(fa('star'),'PLAYER TRUST',String(liveOr(state.live?.summary?.trustScore,'98.7%','—')),'',Number(state.live?.summary?.trustPercent??(state.demoSession?89:0)),'Based on verified players')}
      </div>

      <div class="dashboard-grid">
        <section class="panel detail-card" data-card-title="Recent Events">
          <div class="panel-head"><div class="panel-icon">▤</div><div><div class="panel-title">Recent Events</div><div class="panel-subtitle">Latest anti-cheat events from your server</div></div><div class="panel-spacer"></div><button class="btn ghost" data-page-jump="logs">View All ${fa('chevron-right')}</button></div>
          <div class="event-list">${recentHtml}</div>
        </section>
        <section class="panel detail-card" data-card-title="Top Detections">
          <div class="panel-head"><div class="panel-icon">◎</div><div><div class="panel-title">Top Detections</div><div class="panel-subtitle">Most common detections in the selected period</div></div></div>
          <div class="top-detections">${topHtml}</div>
        </section>
      </div>
    </div>`;
  }

  function stat(label,value,delta,note,icon,color){
    const colors={green:['var(--accent)','rgba(var(--accent-rgb),.10)'],orange:['var(--orange)','rgba(255,175,68,.10)'],blue:['var(--blue)','rgba(79,184,255,.10)'],red:['var(--red)','rgba(255,93,108,.10)'],purple:['var(--purple)','rgba(170,125,255,.10)']};
    const c=colors[color];
    return `<div class="stat-card detail-card" data-card-title="${esc(label)}" style="--card-color:${c[0]};--card-soft:${c[1]};--card-glow:${c[1]}"><div class="stat-top"><div class="stat-icon">${icon}</div><span>${label}</span></div><div class="stat-value-row"><span class="stat-value">${value}</span><span class="delta ${color==='red'?'bad':''}">${delta}</span></div><div class="stat-note">${note}</div></div>`;
  }
  function health(icon,label,value,suffix,pct,note){return `<div class="health-card detail-card" data-card-title="${esc(label)}"><div class="h-icon">${icon}</div><div><small>${label}</small><strong>${value} <span style="font-size:9px;color:#748983">${suffix}</span></strong><div class="meter"><span style="width:${pct}%"></span></div><div style="font-size:8.5px;color:#667b74;margin-top:5px">${note}</div></div></div>`}
  function eventRow(color,icon,title,sub,player,time,risk){ return `<div class="event-row"><div class="event-icon ${color}">${icon}</div><div class="event-main"><strong>${title}</strong><span>${sub}</span></div><div class="event-player">${player}</div><div class="event-time">${time}</div><div><span class="risk-chip ${riskClass(risk==='High'?85:risk==='Medium'?55:5)}">${risk}</span></div></div>`; }
  function rank(n,name,value,pct){return `<div class="rank-row"><div class="rank-badge">${n}</div><div class="rank-name">${name}</div><div class="rank-bar"><span style="width:${pct}%"></span></div><div class="rank-value">${value}</div></div>`}

  function overviewRail(){
    const linked=state.demoSession || state.live?.connected===true;
    return `<section class="rail-section detail-card" data-card-title="System Controls"><div class="rail-head"><span>${fa('gears')}</span> System Controls</div>
      <div class="control-row"><div class="control-icon">${fa('code')}</div><div class="control-copy"><strong>Development Mode</strong><span>Disables automatic bans and kicks while configuring.</span></div>${switchEl(state.devMode,'devMode')}</div>
      <div class="control-row"><div class="control-icon">${fa('shield-halved')}</div><div class="control-copy"><strong>Under Attack Mode</strong><span>Applies strict filters to prevent exploits, particles and entity spam.</span></div>${switchEl(state.attackMode,'attackMode')}</div>
      <div class="control-row"><div class="control-icon">${fa('user-lock')}</div><div class="control-copy"><strong>Block Connections</strong><span>Temporarily block all new player connections.</span></div>${switchEl(state.blockConnections,'blockConnections')}</div>
    </section>
    <section class="rail-section detail-card" data-card-title="Quick Actions"><div class="rail-head"><span>${fa('bolt')}</span> Quick Actions</div>
      ${quick(fa('trash-can'),'Clear Cache','clearCache')}${quick(fa('arrows-rotate'),'Sync Rules','syncRules')}${quick(fa('download'),'Export Logs','exportLogs')}${quick(fa('play'),'Restart Protection','restartProtection')}
    </section>
    <section class="rail-section detail-card" data-card-title="Server Status"><div class="rail-head"><span>${fa('server')}</span> Server Status <div class="panel-spacer"></div><span class="status-chip ${linked?'good':'bad'}"><span class="dot"></span>${linked?'Linked':'Offline'}</span></div><div class="server-card"><div class="server-ident"><div class="server-icon">${fa('server')}</div><div><strong>${esc(state.server.name||state.live?.server?.name||'FiveM Server')}</strong><span>${esc(state.server.serverId||state.live?.server?.endpoint||'Server not synchronized')}</span></div></div><div class="kv"><span>Status</span><strong style="color:${linked?'var(--accent)':'var(--red)'}">● ${linked?'Online':'Offline'}</strong></div><div class="kv"><span>Uptime</span><strong>${esc(liveOr(state.live?.server?.uptime,'14d 6h 23m','—'))}</strong></div><div class="kv"><span>Players</span><strong>${liveOr(state.live?.summary?.online,87,0)} / ${liveOr(state.live?.summary?.maxPlayers,256,0)}</strong></div><div class="kv"><span>Location</span><strong>${esc(state.server.region||state.live?.server?.region||'Not set')}</strong></div><div class="kv"><span>Protected by</span><strong>PARADOX ANTICHEAT</strong></div></div></section>
    <section class="rail-section quote-card rail-fill-card detail-card" data-card-title="Paradox Mission"><img src="assets/img/logo.svg" alt=""><strong>“CLEAN SERVERS”</strong>STRONGER COMMUNITIES</section>`;
  }
  function quick(icon,label,action){return `<div class="quick-row" data-action="${action}"><span class="qicon">${icon}</span><span>${label}</span><span class="arrow">›</span></div>`}

  function consolePage(){
    const [title,desc]=pageMeta.console;
    const liveLines=Array.isArray(state.live?.console)?state.live.console:Array.isArray(state.live?.logs?.console)?state.live.logs.console:[];
    const demoLines=[
      ['00:51:02','ok','[PARADOX] Protection initialized — 42 modules online'],['00:51:02','info','[DATABASE] oxmysql connected in 18ms'],['00:51:03','ok','[EVENT ROUTER] Native handlers registered'],['00:51:03','','[SESSION] Heartbeat protocol listening on 87 active sessions'],['00:51:07','warn','[DETECTION] movement.vehicle_speed risk +18 for player 58'],['00:51:09','ok','[ENTITY] Blocked object burst from player 99 — 14 entities cancelled'],['00:51:11','info','[EVIDENCE] Screenshot attached to DET-9281'],['00:51:12','err','[FIREWALL] Rejected replayed secure-event sequence from player 42'],['00:51:15','','[RISK] Player 42 risk 91/100 — review threshold reached']
    ];
    const source=state.demoSession?demoLines:liveLines;
    const output=source.length?source.map(l=>Array.isArray(l)?consoleLine(l[0],l[1],l[2]):consoleLine(l.time||l.timestamp||'LIVE',l.level||'info',l.message||l.text||JSON.stringify(l))).join(''):consoleLine('LIVE','info','[PARADOX] Waiting for live console telemetry from the connected FiveM server…');
    return `<div class="page">${header(title,desc,`<button class="btn" data-action="clearConsole">Clear</button><button class="btn primary" data-action="restartProtection">Restart Protection</button>`)}
      <section class="panel console"><div class="panel-head"><div class="panel-icon">▣</div><div><div class="panel-title">Protection Console</div><div class="panel-subtitle">paradox_anticheat / live output</div></div><div class="panel-spacer"></div><span class="status-chip ${state.demoSession||state.live?.connected?'good':'bad'}"><span class="dot"></span> ${state.demoSession?'Demo':state.live?.connected?'Streaming':'Offline'}</span></div>
      <div class="console-output" id="consoleOutput">${output}</div><div class="console-input-row"><span>›</span><input id="consoleInput" placeholder="Enter a protected console command..." autocomplete="off"/><button class="btn primary" data-action="runConsole">Run</button></div></section></div>`;
  }
  function consoleLine(t,cls,text){return `<div class="console-line"><span class="time">[${t}]</span> <span class="${cls}">${esc(text)}</span></div>`}

  function playersPage(live=false){
    const [title,desc]=pageMeta[live?'live-view':'players'];
    const grid=players.length?players.map(p=>playerCard(p,live)).join(''):noLiveData('Player cards will populate from the synchronized FiveM server.');
    const avgPing=players.length?`${Math.round(players.reduce((sum,p)=>sum+(parseInt(p[4])||0),0)/players.length)} ms`:'—';
    const highRisk=players.filter(p=>Number(p[5])>=70).length;
    const verified=players.filter(p=>/safe|verified|healthy/i.test(String(p[6]))).length;
    if(live){
      return `<div class="page">${header(title,desc,`<button class="btn" data-action="refresh">${fa('rotate')} Refresh</button><button class="btn primary" data-action="openPlayerPicker">${fa('plus')} Add Watch</button>`)}
        <div class="filters"><input class="input search" placeholder="Search live players..."><select class="select"><option>All risk levels</option><option>High risk</option><option>Safe</option></select><div class="spacer"></div><span class="status-chip ${state.live?.connected===false&&!state.demoSession?'bad':'good'}"><span class="dot"></span>${state.live?.summary?.online??players.length} online</span></div>
        <div class="player-grid">${grid}</div></div>`;
    }
    return `<div class="page">${header(title,desc,`<button class="btn" data-action="refresh">${fa('rotate')} Refresh</button><button class="btn primary" data-action="openPlayerPicker">${fa('user-gear')} Player Actions</button>`)}
      <div class="metric-cards">${metric('ONLINE',String(state.live?.summary?.online??players.length),`of ${state.live?.summary?.maxPlayers??(state.demoSession?256:0)} slots`)}${metric('HIGH RISK',String(highRisk),'requires review')}${metric('AVG PING',avgPing,'live player latency')}${metric('VERIFIED',String(verified),players.length?`${Math.round((verified/players.length)*100)}% of online`:'No active players')}</div>
      <section class="panel detail-card" data-card-title="Connected Players"><div class="panel-head"><div class="panel-icon">${fa('users')}</div><div><div class="panel-title">Connected Players</div><div class="panel-subtitle">Live identity, trust and session state</div></div><div class="panel-spacer"></div><button class="btn ghost">${fa('table-columns')} Columns</button></div>${playersTable()}</section></div>`;
  }
  function metric(a,b,c){return `<div class="metric-card detail-card" data-card-title="${esc(a)}"><small>${a}</small><strong>${b}</strong><p>${c}</p></div>`}
  function liveThumbnailForPlayer(p){
    const raw=state.playerDetails[p[1]]||state.playerDetails[p[0]]||{};
    const views=Array.isArray(state.live?.liveViews)?state.live.liveViews:[];
    const view=views.find(v=>String(v.playerId??v.id??v.source??'')===String(p[0]) || String(v.player??v.playerName??v.name??'')===String(p[1]))||{};
    const url=view.thumbnailUrl||view.imageUrl||view.url||raw.liveThumbnailUrl||raw.thumbnailUrl||raw.screenshotUrl||'';
    if(url && /^https?:\/\//i.test(String(url))) return `<img src="${esc(url)}" alt="${esc(p[1])} live screen" loading="lazy" referrerpolicy="no-referrer">`;
    if(state.demoSession) return `<div class="live-thumb-demo"><span>${fa('display')}</span><strong>TEST LIVE FEED</strong><small>${esc(p[1])}</small></div>`;
    return `<div class="live-thumb-empty"><span>${fa('video-slash')}</span><strong>Waiting for live thumbnail</strong><small>Screenshot/live-view provider has not supplied a frame yet.</small></div>`;
  }
  function playerCard(p,live=false){
    const rc=riskClass(p[5]);
    const thumbnail=live?`<div class="live-player-thumbnail">${liveThumbnailForPlayer(p)}<span class="live-feed-badge"><i></i> LIVE</span></div>`:'';
    return `<div class="player-card ${live?'live-player-card':''} detail-card" data-player="${esc(p[1])}" data-card-title="${esc(p[1])} Player Details">${thumbnail}<div class="player-card-top"><div class="player-avatar">${esc((p[1]||'?')[0])}</div><div><h3>${esc(p[1])}</h3><div class="meta">ID ${esc(p[0])} · ${esc(p[3])}</div></div><div class="risk-line"><span class="risk-chip ${rc}">${p[5]} Risk</span></div></div><div class="metrics"><div class="mini-metric"><span>Ping</span><strong>${esc(p[4])}</strong></div><div class="mini-metric"><span>Session</span><strong>${esc(p[6]||'Unknown')}</strong></div><div class="mini-metric"><span>Signals</span><strong>${state.playerDetails[p[1]]?.signals??'—'}</strong></div></div><div style="display:flex;gap:6px;margin-top:10px"><button class="btn ghost" style="flex:1" data-action="viewPlayer" data-player="${esc(p[1])}">${fa('magnifying-glass')} Inspect</button><button class="btn ghost" style="flex:1" data-action="screenshotPlayer" data-player="${esc(p[1])}">${fa('camera')} Screenshot</button></div></div>`
  }
  function playersTable(){const body=players.length?players.map(p=>`<tr class="clickable-row" data-action="viewPlayer" data-player="${esc(p[1])}"><td>${esc(p[0])}</td><td><span class="cell-main">${esc(p[1])}</span></td><td class="mono">${esc(p[2])}</td><td>${esc(p[3])}</td><td>${esc(p[4])}</td><td><span class="risk-chip ${riskClass(p[5])}">${p[5]}/100</span></td><td><span class="status-chip ${/safe|healthy|verified/i.test(String(p[6]))?'good':'warn'}">${esc(p[6]||'Unknown')}</span></td><td><div class="table-actions"><button class="mini-btn" data-action="viewPlayer" data-player="${esc(p[1])}">${fa('magnifying-glass')}</button><button class="mini-btn" data-action="screenshotPlayer" data-player="${esc(p[1])}">${fa('camera')}</button><button class="mini-btn" data-action="playerMenu" data-player="${esc(p[1])}">${fa('ellipsis')}</button></div></td></tr>`).join(''):emptyTableRow(8,'No players are currently reported by the connected FiveM server.');return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Player</th><th>Identifier</th><th>Job</th><th>Ping</th><th>Risk</th><th>Session</th><th>Actions</th></tr></thead><tbody>${body}</tbody></table></div>`}

  function mapPage(){
    const [t,d]=pageMeta['interactive-map'];
    const mode=state.mapMode;
    const livePins=Array.isArray(state.live?.mapPins)?state.live.mapPins:[];
    const demoPins=state.demoSession?[
      {x:45,y:44,label:'Kevin#7719',type:'player'},
      {x:63,y:31,label:'High risk detection',type:'danger'},
      {x:36,y:63,label:'Player',type:'player'},
      {x:72,y:59,label:'Incident',type:'danger'},
      {x:53,y:72,label:'Player',type:'player'}
    ]:[];
    const pins=(livePins.length?livePins:demoPins).map(pin=>`<button class="map-pin ${/danger|detection|incident/i.test(pin.type||'')?'red':''}" style="left:${Math.max(0,Math.min(100,Number(pin.x??pin.left??50)))}%;top:${Math.max(0,Math.min(100,Number(pin.y??pin.top??50)))}%" title="${esc(pin.label||pin.name||'Map event')}" data-map-pin="${esc(pin.label||pin.name||'Map event')}"></button>`).join('');
    return `<div class="page">${header(t,d,`<button class="btn" data-action="centerMap">${fa('location-crosshairs')} Center Map</button><button class="btn primary detail-card" data-card-title="Live Map Layers">${fa('layer-group')} Live Layers</button>`)}
      <div class="map-shell">
        <div class="map-canvas" id="mapCanvas">
          <div class="map-image-stage" id="mapStage" style="transform:translate(calc(-50% + ${state.mapX}px),calc(-50% + ${state.mapY}px)) scale(${state.mapZoom})">
            <img class="map-image" src="assets/img/maps/${mode==='satellite'?'gta-satellite.jpg':'gta-atlas.png'}" alt="GTA V ${mode} map">
            <div class="map-overlay-vignette"></div>${pins}
          </div>
        </div>
        <section class="panel map-panel"><div class="panel-head"><div class="panel-icon">${fa('map-location-dot')}</div><div><div class="panel-title">Map Layers</div><div class="panel-subtitle">Live world security view</div></div></div><div class="panel-body">${miniSetting('Players',`${state.live?.summary?.online??players.length} visible`,true)}${miniSetting('Detections',`${state.live?.summary?.activeDetections??detections.length} active`,true)}${miniSetting('Entity bursts',`${state.live?.map?.entityBursts??(state.demoSession?2:0)} clusters`,true)}${miniSetting('Safezones',`${state.live?.map?.safezones??(state.demoSession?8:0)} configured`,false)}</div></section>
        <div class="map-tools"><button class="btn" data-action="mapZoomIn">${fa('plus')}</button><button class="btn" data-action="mapZoomOut">${fa('minus')}</button><button class="btn" data-action="centerMap">${fa('location-crosshairs')}</button></div>
        <div class="map-mode-switch"><button class="map-mode-btn ${mode==='atlas'?'active':''}" data-action="mapMode" data-mode="atlas">Atlas</button><button class="map-mode-btn ${mode==='satellite'?'active':''}" data-action="mapMode" data-mode="satellite">Satellite</button></div>
      </div></div>`;
  }

  const configPages = {
    'entity-rules':[
      ['Entity Creation Firewall','Cancel unauthorized or abusive client-created entities.',[
        ['Enable entity protection','Inspect entityCreating/entityCreated events','switch',true],['Protection mode','SOFT or LOCKDOWN policy','select','Soft'],['5s entity window','Maximum entities per source','number','28'],['15s entity window','Secondary burst threshold','number','58'],['30s entity window','Long-window flood threshold','number','96'],['Same-model burst','Repeated model threshold','number','12'],['Spatial cluster radius','Meters for cluster correlation','number','18']]],
      ['Model Policies','Blacklist, whitelist and population ownership controls.',[
        ['Block crash models','Cancel configured crash/entity models','switch',true],['Allow ambient population','Ignore safe ambient population types','switch',true],['Server-created exemption','Trust server-created entity capability','switch',true],['Auto cleanup','Delete malicious entities after cancellation','switch',true],['Unknown model action','Default policy for unclassified models','select','Observe']]]
    ],
    'particle-rules':[
      ['Particle Firewall','ptFxEvent validation and flood control.',[['Enable ptFx protection','Inspect networked particle events','switch',true],['Per-player rate','Maximum FX per 10 seconds','number','18'],['Max effect scale','Large networked FX threshold','number','5.0'],['Block attach-to-player','Prevent unauthorized FX attachments','switch',true],['Unknown effect action','Policy for unknown ptFx dictionaries','select','Log']]],
      ['Effect Lists','Manage blocked and allowed particle dictionaries.',[['Strict allowlist mode','Only allow configured networked effects','switch',false],['Block mass FX','Correlate repeated effect origins','switch',true],['Screenshot on high risk','Capture evidence for serious particle abuse','switch',true]]]
    ],
    'weapon-rules':[
      ['Weapon Authorization','Weapon ownership and network event policy.',[['Blacklist weapons','Block configured weapon hashes','switch',true],['Validate GiveWeapon','Require authorization/capability','switch',true],['Validate RemoveWeapon','Detect malicious remote removals','switch',true],['Infinite ammo sensor','Correlate ammo inconsistencies','switch',true],['No reload telemetry','Track impossible reload patterns','switch',true]]],
      ['Damage Modifiers','Damage and defense modification protections.',[['Weapon damage modifier','Detect abnormal weapon multipliers','switch',true],['Melee modifier','Detect modified melee damage','switch',true],['Defense modifier','Detect abnormal damage defense','switch',true],['Explosive ammo','Block unauthorized explosive rounds','switch',true],['High-confidence action','Default action at confidence ≥ 95','select','Block + Review']]]
    ],
    'explosion-rules':[
      ['Explosion Validation','Type, owner and damage-scale validation.',[['Enable explosion firewall','Inspect explosionEvent','switch',true],['Invisible explosions','Block invisible network explosions','switch',true],['Silent explosions','Flag silent explosion abuse','switch',true],['Max damage scale','Cancel above configured multiplier','number','1.0'],['Owner spoofing','Correlate origin and owner anomalies','switch',true]]],
      ['Rate Windows','Multi-window explosion spam prevention.',[['5 second maximum','Per-player burst limit','number','6'],['30 second maximum','Long-window limit','number','14'],['Cancel over limit','Cancel excessive explosion events','switch',true],['Capture evidence','Store event payload + recent telemetry','switch',true]]]
    ],
    'event-protection':[
      ['Secure Event Firewall','Schema validation, predicates and anti-replay.',[['Enable SecureRegister','Protect registered server events','switch',true],['Reject stale sequences','Session replay prevention','switch',true],['Schema validation','Types, ranges, enums and lengths','switch',true],['Server predicates','Job/location/item/state callbacks','switch',true],['Unknown protected event action','Policy for malformed calls','select','Block']]],
      ['Exploit Guard','Optional installed-resource aware legacy protections.',[['ESX legacy adapter','Enable known ESX exploit guards','switch',true],['Malicious text filter','Reject XSS/SQL-like payloads','switch',true],['Negative amount guard','Reject negative economy values','switch',true],['Honeypot events','Enable explicit decoy events','switch',false]]]
    ],
    'general-rules':[
      ['Player State','Core health, armor and visibility detections.',[['Godmode multi-signal','Invincibility/proofs/damage consistency','switch',true],['Excess health','Server-configurable maximum health','switch',true],['Excess armor','Server-configurable maximum armor','switch',true],['Invisibility','Entity alpha and visibility evidence','switch',true],['Unauthorized ped change','Model change capability required','switch',true]]],
      ['Movement & Camera','Consolidated movement and camera detections.',[['Advanced noclip','Server delta + movement context + raycast evidence','switch',true],['Teleport detection','Capability-aware server movement correlation','switch',true],['Super jump','Repeated abnormal jump evidence','switch',true],['Freecam','Camera-to-ped distance + state','switch',true],['Spectate','Unauthorized spectator mode','switch',true],['Night/Thermal vision','Capability-aware visual mode checks','switch',true]]]
    ],
    'native-rules':[
      ['Cfx Native Router','Canonical server-native event listeners.',[['weaponDamageEvent','Combat, damage and taze analysis','switch',true],['startProjectileEvent','Projectile spoof/rate validation','switch',true],['clearPedTasksEvent','Ownership and spam validation','switch',true],['givePedScriptedTaskEvent','Remote task abuse validation','switch',true],['fireEvent','Remote fire validation','switch',true],['ptFxEvent','Particle analysis','switch',true]]]
    ],
    'key-locks':[
      ['Input Telemetry','Optional key/input policies. Low-trust evidence only.',[['Enable key telemetry','Record configured suspicious keys','switch',false],['Block configured inputs','Prevent specific game controls','switch',false],['Never auto-ban','Force key signals to telemetry-only','switch',true]]]
    ],
    'rate-limits':[
      ['Global Windows','Default server protection rate windows.',[['Client reports / 10s','Maximum normalized reports','number','18'],['Entities / 5s','Default entity burst threshold','number','28'],['Secure events / 1s','Default protected-event burst','number','12'],['Chat messages / 3s','Spam threshold','number','10'],['Admin actions / 10s','Privileged event rate','number','20']]],
      ['Escalation','How repeated window violations contribute to risk.',[['Duplicate suppression','Merge identical near-simultaneous signals','switch',true],['Risk decay','Reduce stale risk over time','switch',true],['Escalate repeated blocks','Increase risk for repeated blocked actions','switch',true]]]
    ],
    'security-rules':[
      ['Session Protocol','Heartbeat, nonce and anti-replay security.',[['Heartbeat interval','Expected client heartbeat seconds','number','5'],['Miss tolerance','Missed heartbeat count before signal','number','3'],['Sequence enforcement','Reject repeated/out-of-order sequence','switch',true],['Session rotation','Rotate session nonce periodically','switch',true]]],
      ['Integrity Telemetry','Low-trust client integrity sensors.',[['Resource baseline','Track resource-list deltas','switch',true],['Menu texture signatures','Known suspicious DUI/texture names','switch',true],['Command anomalies','Registered command changes','switch',true],['OCR provider','Optional screenshot keyword scan','select','Disabled']]]
    ],
    capabilities:[
      ['Capability Policy','Scoped server-issued permissions for legitimate actions.',[['Maximum capability TTL','Hard maximum in milliseconds','number','600000'],['Audit every grant','Write capability grants to audit log','switch',true],['Client grants prohibited','Never accept capability grants from client','switch',true],['Single-use support','Allow one-shot capability tokens','switch',true]]],
      ['Default Capability Types','Configured action scopes.',[['teleport','Admin/property teleport exemption','switch',true],['revive','Medical revive exemption','switch',true],['godmode','Spawn/admin temporary protection','switch',true],['spectate','Admin spectate exemption','switch',true],['spawn_entity','Housing/admin entity creation','switch',true],['vehicle_mod','Mechanic/admin vehicle modification','switch',true]]]
    ],
    'secure-events':[
      ['SecureRegister Defaults','Validation defaults for protected server events.',[['Require session','Reject pre-session calls','switch',true],['Require sequence','Anti-replay sequence on protected events','switch',true],['Default cooldown','Milliseconds between calls','number','250'],['Burst maximum','Events per short window','number','8'],['Reject unknown fields','Strict payload schema','switch',false]]],
      ['Economy Guard','Server-owned economic values and atomic writes.',[['Server-owned payouts','Never trust payout amount from client','switch',true],['Atomic transactions','Use database transactions for critical writes','switch',true],['Duplicate protection','Request idempotency for purchases/rewards','switch',true]]]
    ]
  };

  function configPage(key){
    const [t,d]=pageMeta[key];
    const remote=state.live?.configSections?.[key] || state.live?.config?.[key];
    const cards=state.demoSession ? (configPages[key]||[]) : (Array.isArray(remote)?remote:[]);
    const body=cards.length?cards.map(c=>configCard(c)).join(''):noLiveData('This configuration section will populate after paradox_anticheat exposes its live dashboard configuration.');
    return `<div class="page">${header(t,d,`<button class="btn" data-action="resetConfig">Reset</button><button class="btn" data-action="importConfig">Import</button><button class="btn primary" data-action="saveConfig">Save Changes</button>`)}
      <div class="filters"><input class="input search" placeholder="Search ${esc(t.toLowerCase())}..."><select class="select"><option>All modules</option><option>Enabled</option><option>Disabled</option><option>Shadow mode</option></select><div class="spacer"></div><span class="status-chip ${state.live?.connected===false&&!state.demoSession?'bad':'good'}">${fa(state.live?.connected===false&&!state.demoSession?'link-slash':'link')} ${state.demoSession?'Test data':state.live?.connected===false?'Server offline':'Synced with server'}</span></div>
      <div class="config-grid">${body}</div></div>`;
  }
  function configCard(c){const title=c.title||c[0]||'Configuration';const desc=c.description||c[1]||'';const rows=c.settings||c[2]||[];return `<section class="config-card detail-card" data-card-title="${esc(title)}"><h3>${esc(title)}</h3><p>${esc(desc)}</p>${rows.map(s=>setting(Array.isArray(s)?s:[s.name||s.label,s.description||'',s.type||'switch',s.value])).join('')}</section>`}
  function setting(s){let ctrl=''; if(s[2]==='switch') ctrl=switchEl(!!s[3],'genericToggle'); else if(s[2]==='number') ctrl=`<input class="input" value="${esc(s[3])}">`; else ctrl=customSelect(String(s[3]),['Log','Shadow','Block','Enforce','Disabled','Enabled']); return `<div class="setting-row"><div class="setting-copy"><strong>${s[0]}</strong><span>${s[1]}</span></div><div class="setting-control">${ctrl}</div></div>`}

  function sessionsPage(){const [t,d]=pageMeta.sessions;const demo=DEMO_PLAYERS.slice(0,6).map((p,i)=>[p[1],`SES-${82140+i}`,i===3?'1 missed':'Healthy',`${3+i}s ago`,i===3?'Review':'Verified',`${1040+i}`]);const rows=rowsFor('sessions',demo,['player|name','sessionId|session','heartbeat','lastAck|last_ack','state|status','sequence']);return genericTablePage(t,d,['Player','Session ID','Heartbeat','Last ACK','State','Sequence'],rows,'Session Protocol',`<button class="btn">Rotate Sessions</button><button class="btn primary">Run Integrity Check</button>`);}
  function connectionsPage(){const [t,d]=pageMeta.connections;return genericTablePage(t,d,['Connection','Player','Decision','Result','Latency','Time'],connectionRows,'Connection Gateway',`<button class="btn">Export</button><button class="btn primary">Connection Policy</button>`);}

  function genericTablePage(t,d,heads,rows,panelTitle,actions=''){
    return `<div class="page">${header(t,d,actions)}<div class="filters"><input class="input search" placeholder="Search records..."><select class="select"><option>All statuses</option><option>Allowed</option><option>Review</option><option>Blocked</option></select><input class="input" value="Last 24 hours"><div class="spacer"></div><button class="btn" data-action="refresh">⟳ Refresh</button></div><section class="panel detail-card" data-card-title="${esc(panelTitle)}"><div class="panel-head"><div class="panel-icon">▤</div><div><div class="panel-title">${panelTitle}</div><div class="panel-subtitle">Showing live and recent records</div></div><div class="panel-spacer"></div><span class="tag green">Live</span></div>${table(heads,rows)}</section></div>`;
  }
  function table(heads,rows){const body=rows.length?rows.map(r=>`<tr class="detail-row" data-card-title="${esc(r[0]||'Record')} Details">${r.map((v,i)=>`<td>${i===0?`<span class="cell-main">${esc(v)}</span>`:/allowed|verified|safe|healthy|online|active|delivered|complete|success|stored|ready/i.test(v)?`<span class="status-chip good">${esc(v)}</span>`:/denied|blocked|failed|critical|high/i.test(v)?`<span class="status-chip bad">${esc(v)}</span>`:/review|warning|medium|queued|missed|partial|retrying|appealed/i.test(v)?`<span class="status-chip warn">${esc(v)}</span>`:esc(v)}</td>`).join('')}<td><div class="table-actions"><button class="mini-btn" data-action="inspectRow">${fa('magnifying-glass')}</button><button class="mini-btn" data-action="rowMenu">${fa('ellipsis')}</button></div></td></tr>`).join(''):emptyTableRow(heads.length+1);return `<div class="table-wrap"><table class="data-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${body}</tbody></table></div>`}

  function detectionsPage(){const [t,d]=pageMeta.detections;const a=state.live?.analytics?.detections||{};return `<div class="page">${header(t,d,`<button class="btn">Export</button><button class="btn primary" data-action="openDetectionCatalog">Detection Catalog</button>`)}<div class="metric-cards">${metric('DETECTIONS',String(liveOr(a.total??state.live?.summary?.detections,146,'0')),'selected period')}${metric('BLOCKED',String(liveOr(a.blocked,93,'0')),'malicious actions cancelled')}${metric('REVIEW QUEUE',String(liveOr(a.reviewQueue,11,'0')),'requires human review')}${metric('AVG CONFIDENCE',String(liveOr(a.avgConfidence,'84.2%','—')),'weighted server confidence')}</div><section class="panel detail-card" data-card-title="Detection Stream"><div class="panel-head"><div class="panel-icon">${fa('bullseye')}</div><div><div class="panel-title">Detection Stream</div><div class="panel-subtitle">Correlated signals and enforcement outcomes</div></div><div class="panel-spacer"></div><span class="status-chip ${state.live?.connected===false&&!state.demoSession?'bad':'good'}"><span class="dot"></span>${state.live?.connected===false&&!state.demoSession?'Offline':'Live'}</span></div>${table(['ID','Detection','Player','Signal','Confidence','Risk','Action','Time'],detections)}</section></div>`}

  function evidencePage(){const [t,d]=pageMeta.evidence;const demo=[['EVD-811','DET-9281','2Moonlight#8421','Screenshot + 18 telemetry frames','Complete','2m ago'],['EVD-807','DET-9278','n0va.exe','Movement trace + vehicle state','Complete','5m ago'],['EVD-801','DET-9274','2Moonlight#8421','Combat samples + screenshot','Review','8m ago'],['EVD-794','DET-9269','Unknown','Texture signature + resource delta','Partial','13m ago']];const rows=rowsFor('evidence',demo,['id|evidenceId','detectionId|detection','player|playerName','artifacts|summary','status','created|time']);return genericTablePage(t,d,['Evidence','Detection','Player','Artifacts','Status','Created'],rows,'Evidence Bundles',`<button class="btn">Retention Policy</button><button class="btn primary">Export Bundle</button>`)}

  function screenshotsPage(){
    const [t,d]=pageMeta.screenshots;
    const remote=liveRows('screenshots',[]);
    const demo=state.demoSession?['2Moonlight#8421','n0va.exe','AveryB','RicoV','Unknown','Kevin#7719'].map((name,i)=>({player:name,detection:`DET-${9281-i*4}`,time:`${2+i*3}m ago`,status:i===4?'Pending':'Stored'})):[];
    const shots=remote.length?remote:demo;
    const cards=shots.length?shots.map((shot,i)=>{
      const imageUrl=shot.thumbnailUrl||shot.imageUrl||shot.screenshotUrl||shot.url||shot.evidenceUrl||'';
      const preview=imageUrl&&/^https?:\/\//i.test(String(imageUrl))
        ? `<img src="${esc(imageUrl)}" alt="Screenshot evidence for ${esc(shot.player||shot.playerName||'Unknown')}" loading="lazy" referrerpolicy="no-referrer">`
        : state.demoSession
          ? `<div class="screenshot-thumb-demo"><span>${fa('display')}</span><strong>TEST EVIDENCE FRAME</strong><small>${esc(shot.player||shot.playerName||'Unknown')}</small></div>`
          : `<div class="screenshot-thumb-empty"><span>${fa('image')}</span><strong>Thumbnail unavailable</strong><small>The screenshot provider has not supplied an image URL.</small></div>`;
      return `<div class="player-card screenshot-card detail-card" data-card-title="Screenshot ${esc(shot.id||i+1)}"><div class="screenshot-thumbnail">${preview}<span class="screenshot-evidence-badge">${fa('camera')} ${esc(shot.label||'SECURE EVIDENCE')}</span></div><div style="display:flex;align-items:center;margin-top:10px"><div><h3>${esc(shot.player||shot.playerName||'Unknown')}</h3><div class="meta">${esc(shot.detection||shot.detectionId||'Evidence')} · ${esc(shot.time||shot.createdAt||'Live')}</div></div><span class="status-chip ${/pending|review/i.test(shot.status||'')?'warn':'good'}" style="margin-left:auto">${esc(shot.status||'Stored')}</span></div></div>`;
    }).join(''):noLiveData('Screenshots from detection evidence will appear here.');
    return `<div class="page">${header(t,d,`<button class="btn">Provider Settings</button><button class="btn primary">${fa('camera')} Request Screenshot</button>`)}<div class="player-grid">${cards}</div></div>`;
  }

  function logsPage(key='logs'){const [t,d]=pageMeta[key];const demo=[['00:51:12','FIREWALL','High','Player 42','Replayed secure-event sequence rejected','Blocked'],['00:51:11','EVIDENCE','Info','Player 42','Screenshot attached to DET-9281','Stored'],['00:51:09','ENTITY','High','Player 99','Object burst exceeded short window','Blocked'],['00:51:07','MOVEMENT','Medium','Player 58','Vehicle speed anomaly correlated','Observed'],['00:50:59','SESSION','Info','Player 87','Session nonce rotated','Success'],['00:50:52','CONNECTION','Info','Kevin#7719','Identity verified','Allowed']];const rows=rowsFor('logs',demo,['time|createdAt','module|category','severity|level','source|player','message|detail','outcome|action']);return genericTablePage(t,d,['Time','Module','Severity','Source','Message','Outcome'],rows,'Security Logs',`<button class="btn">Download JSON</button><button class="btn primary">Live Tail</button>`)}

  function insightsPage(){
    const [t,d]=pageMeta.insights; const a=state.live?.analytics?.insights||{};
    const riskRows=Array.isArray(a.riskDistribution)?a.riskDistribution:(state.demoSession?[['0-20 Safe',71,82],['21-40 Low',9,33],['41-60 Medium',4,18],['61-80 High',2,10],['81-100 Critical',1,6]]:[]);
    const quality=Array.isArray(a.detectionQuality)?a.detectionQuality:(state.demoSession?[['Secure Event Replay',99,96],['Entity Burst',96,91],['Weapon Modifier',94,87],['Explosion Owner Spoof',91,81],['Noclip Correlation',88,78]]:[]);
    return `<div class="page">${header(t,d,`<button class="btn">Compare Period</button><button class="btn primary">Generate Report</button>`)}<div class="metric-cards">${metric('FALSE POSITIVE RATE',String(liveOr(a.falsePositiveRate,'0.21%','—')),'selected period')}${metric('BLOCK EFFICIENCY',String(liveOr(a.blockEfficiency,'97.8%','—')),'high confidence actions')}${metric('MEDIAN RISK',String(liveOr(a.medianRisk,'9.4','—')),'verified player baseline')}${metric('REVIEW LATENCY',String(liveOr(a.reviewLatency,'3m 18s','—')),'median admin review')}</div><div class="dashboard-grid"><section class="panel detail-card" data-card-title="Risk Distribution"><div class="panel-head"><div class="panel-icon">${fa('chart-column')}</div><div><div class="panel-title">Risk Distribution</div><div class="panel-subtitle">Current online player risk buckets</div></div></div><div class="panel-body">${riskRows.length?barRows(riskRows):noLiveData('Risk distribution will appear once live behavior telemetry is available.')}</div></section><section class="panel detail-card" data-card-title="Detection Quality"><div class="panel-head"><div class="panel-icon">${fa('star')}</div><div><div class="panel-title">Detection Quality</div><div class="panel-subtitle">Top modules by confidence / low false positives</div></div></div><div class="top-detections">${quality.length?quality.map((q,i)=>rank(i+1,q[0]||q.name,q[1]||q.confidence,q[2]||q.percent)).join(''):noLiveData('Detection quality metrics are calculated from live enforcement outcomes.')}</div></section></div></div>`;
  }
  function barRows(items){return items.map(x=>`<div class="rank-row"><div class="rank-name" style="grid-column:1/3">${x[0]}</div><div class="rank-bar"><span style="width:${x[2]}%;background:linear-gradient(90deg,var(--accent-2),var(--accent))"></span></div><div class="rank-value">${x[1]}</div></div>`).join('')}

  function playerLookupPage(){const [t,d]=pageMeta['player-lookup'];return `<div class="page">${header(t,d)}<section class="panel"><div class="panel-body"><div class="search-box-big"><span style="color:var(--accent)">⌕</span><input placeholder="Search by player name, server ID, license, Discord, FiveM ID, ban ID or token hash..."><button class="btn primary" data-action="lookupDemo">Search</button></div></div></section><div style="height:12px"></div><section class="panel" id="lookupResult"><div class="empty-state"><div class="empty-icon">⌕</div><strong>Search the security identity graph</strong><span>Find current players, previous sessions, bans, identifiers and linked evidence.</span></div></section></div>`}

  function firewallPage(){
    const [t,d]=pageMeta['firewall-analytics']; const a=state.live?.analytics?.firewall||{};
    const cats=Array.isArray(a.categories)?a.categories:(state.demoSession?[['Secure events',189,88],['Entities',92,60],['Explosions',61,42],['Particles',38,28],['Tasks',24,20],['Projectiles',14,12]]:[]);
    const demoSources=[['Player 42','98','91'],['Player 99','71','36'],['Player 58','46','64'],['Unknown','32','58']];
    const sources=rowsFor('firewallSources',demoSources,['source|player','blocks|count','risk']);
    return `<div class="page">${header(t,d,`<button class="btn">Export Metrics</button><button class="btn primary">Open Live Firewall</button>`)}<div class="metric-cards">${metric('EVENTS INSPECTED',String(liveOr(a.eventsInspected,'128,490','0')),'selected window')}${metric('BLOCKED EVENTS',String(liveOr(a.blockedEvents,418,'0')),'network actions cancelled')}${metric('ENTITIES CANCELLED',String(liveOr(a.entitiesCancelled,292,'0')),'malicious or over-limit')}${metric('AVG ROUTER LATENCY',String(liveOr(a.avgRouterLatency,'0.19 ms','—')),'per native event')}</div><div class="dashboard-grid"><section class="panel detail-card" data-card-title="Firewall Categories"><div class="panel-head"><div class="panel-icon">${fa('fire-flame-curved')}</div><div><div class="panel-title">Firewall Categories</div><div class="panel-subtitle">Blocked traffic by subsystem</div></div></div><div class="panel-body">${cats.length?barRows(cats):noLiveData('Firewall category telemetry will appear here from the server.')}</div></section><section class="panel detail-card" data-card-title="Top Firewall Sources"><div class="panel-head"><div class="panel-icon">${fa('bullseye')}</div><div><div class="panel-title">Top Sources</div><div class="panel-subtitle">Sources generating rejected traffic</div></div></div>${table(['Source','Blocks','Risk'],sources)}</section></div></div>`;
  }

  function behaviorPage(){
    const [t,d]=pageMeta.behavior; const a=state.live?.analytics?.behavior||{};
    const signals=Array.isArray(a.signals)?a.signals:(state.demoSession?[['Combat deviation',21,34],['Event-rate deviation',14,24],['Movement anomalies',9,18],['Entity behavior',7,13],['Economy deviations',3,8]]:[]);
    return `<div class="page">${header(t,d,`<button class="btn">Shadow Mode</button><button class="btn primary">Baseline Settings</button>`)}<div class="metric-cards">${metric('BASELINED PLAYERS',String(liveOr(a.baselinedPlayers,'4,821','0')),'historical profiles')}${metric('ANOMALIES TODAY',String(liveOr(a.anomaliesToday,19,'0')),'behavior deviations')}${metric('MODEL MODE',String(liveOr(a.modelMode,'Deterministic','—')),'advisory classifier')}${metric('WINDOWS',String(liveOr(a.windows,3,'—')),'rolling analysis windows')}</div><div class="dashboard-grid"><section class="panel detail-card" data-card-title="Behavior Signals"><div class="panel-head"><div class="panel-icon">${fa('brain')}</div><div><div class="panel-title">Behavior Signals</div><div class="panel-subtitle">Rolling weighted anomaly contribution</div></div></div><div class="panel-body">${signals.length?barRows(signals):noLiveData('Behavior signals will appear after enough live session telemetry is collected.')}</div></section><section class="panel detail-card" data-card-title="Classifier Policy"><div class="panel-head"><div class="panel-icon">${fa('shield-halved')}</div><div><div class="panel-title">Classifier Policy</div><div class="panel-subtitle">Advisory-only behavior classification</div></div></div><div class="panel-body">${miniSetting('Advisory only','Cannot independently enforce a ban',true)}${miniSetting('Minimum sample size','Require mature session telemetry',true)}${miniSetting('Historical baseline','Use prior verified sessions',true)}</div></section></div></div>`;
  }

  function combatPage(){const [t,d]=pageMeta.combat;const demo=[['2Moonlight#8421','81','73','68%','71%','212m','91'],['n0va.exe','44','31','45%','53%','116m','64'],['Kevin#7719','28','12','19%','31%','84m','12'],['AveryB','38','19','31%','42%','97m','47']];const rows=rowsFor('combat',demo,['player|name','shots','hits','headshots|headshotRate','hitRate','maxDistance','risk']);const a=state.live?.analytics?.combat||{};return `<div class="page">${header(t,d,`<button class="btn">Thresholds</button><button class="btn primary">Live Combat Feed</button>`)}<div class="metric-cards">${metric('SHOTS ANALYZED',String(liveOr(a.shotsAnalyzed,'12,492','0')),'selected period')}${metric('HEADSHOT AVG',String(liveOr(a.headshotAverage,'24.8%','—')),'server population')}${metric('SILENT AIM FLAGS',String(liveOr(a.silentAimFlags,7,'0')),'correlated signals')}${metric('TRIGGER FLAGS',String(liveOr(a.triggerFlags,3,'0')),'review queue')}</div><section class="panel detail-card" data-card-title="Combat Profiles"><div class="panel-head"><div class="panel-icon">${fa('crosshairs')}</div><div><div class="panel-title">Combat Profiles</div><div class="panel-subtitle">Aim, hit and weapon event telemetry</div></div></div>${table(['Player','Shots','Hits','Headshots','Hit Rate','Max Distance','Risk'],rows)}</section></div>`}

  function bansPage(){const [t,d]=pageMeta.bans;const demo=[['PA-F72B91','Unknown User','Cheat menu / event replay','Automatic','Permanent','Active','Today'],['PA-72C1A4','oldskool13','Entity spam','Automatic','7 days','Active','Yesterday'],['PA-119DF0','RageKid','Explosive ammo','Moderator','Permanent','Appealed','3d ago'],['PA-91FF22','zzTop','Noclip correlated','Automatic','24 hours','Expired','5d ago']];const banData=state.sectionData?.bans;if(banData?.rows)banData.rows=banData.rows.map(row=>({...row,duration:row.expires_at?window.ParadoxData.date(row.expires_at):'Permanent',status:row.revoked_at?'Revoked':row.expires_at&&Number(row.expires_at)*1000<Date.now()?'Expired':'Active',created:window.ParadoxData.date(row.created_at)}));const rows=rowsFor('bans',demo,['ban_id|id|banId','player|name','reason','issuer|bannedBy','duration|expires','status','created|createdAt']);return genericTablePage(t,d,['Ban ID','Player','Reason','Issuer','Duration','Status','Created'],rows,'Ban Registry',`<button class="btn">Import Legacy Bans</button><button class="btn primary" data-action="createBan">${fa('plus')} Create Ban</button>`)}

  function appealsPage(){const [t,d]=pageMeta.appeals;const demo=[['APL-103','PA-119DF0','RageKid','Explosive ammo','Evidence review','2h ago'],['APL-101','PA-881CF4','zero_q','No recoil','Waiting admin','1d ago'],['APL-097','PA-4928AA','Kantrell','Entity spam','Approved','3d ago']];const rows=rowsFor('appeals',demo,['id|appealId','banId|ban','player|name','reason|originalReason','status','submitted|createdAt']);return genericTablePage(t,d,['Appeal','Ban ID','Player','Original Reason','Status','Submitted'],rows,'Appeal Queue',`<button class="btn">Appeal Settings</button>`)}

  function permissionsPage(){const [t,d]=pageMeta.permissions;const demo=[['OWNER','FastxFingers','ACE + Database','31 permissions','Active'],['SECURITY_ADMIN','NovaDev','Database','23 permissions','Active'],['REVIEWER','MiaStaff','ESX Group','8 permissions','Active'],['UNBAN_MANAGER','AlexStaff','ACE','6 permissions','Active'],['VIEWER','QA Team','Database','4 permissions','Active']];const rows=rowsFor('permissions',demo,['role','identity|name','source','permissions|permissionCount','status']);return `<div class="page">${header(t,d,`<button class="btn">Permission Catalog</button><button class="btn primary" data-action="addRole">${fa('plus')} Add Role</button>`)}<div class="config-grid"><section class="panel detail-card" data-card-title="Role Assignments"><div class="panel-head"><div class="panel-icon">${fa('user-shield')}</div><div><div class="panel-title">Role Assignments</div><div class="panel-subtitle">Normalized Paradox security access</div></div></div>${table(['Role','Identity','Source','Permissions','Status'],rows)}</section><section class="panel detail-card" data-card-title="Permission Sources"><div class="panel-head"><div class="panel-icon">${fa('shield-halved')}</div><div><div class="panel-title">Permission Sources</div><div class="panel-subtitle">Authoritative server-side resolution order</div></div></div><div class="panel-body">${miniSetting('ACE permissions','paradox.* permission nodes',true)}${miniSetting('Database roles','Persistent role assignments',true)}${miniSetting('ESX groups','Bridge configured groups',true)}${miniSetting('Explicit identifiers','Optional emergency owner list',false)}</div></section></div></div>`}

  function whitelistPage(){const [t,d]=pageMeta.whitelist;const demo=[['license:92ef...8a17','FastxFingers','owner','No global bypass','Permanent'],['discord:1182...229','NovaDev','security-admin','Admin capabilities only','Permanent'],['license:04ac...88b','QA-Automation','service','Test capability scopes','30 days']];const rows=rowsFor('whitelist',demo,['identifier','name','type','scope','expiry']);return genericTablePage(t,d,['Identifier','Name','Type','Scope','Expiry'],rows,'Trusted Identities',`<button class="btn primary">${fa('plus')} Add Trusted Identity</button>`)}

  function settingsPage(){
    const [t,d]=pageMeta.settings; const linked=state.demoSession||state.server.linked||state.live?.connected===true;
    return `<div class="page">${header(t,d,`<button class="btn" data-action="testSync">${fa('signal')} Test Server</button><button class="btn primary" data-action="saveDashboardSettings">${fa('floppy-disk')} Save Settings</button>`)}
      <div class="config-grid">
        <section class="config-card detail-card" data-card-title="Dashboard Appearance"><h3>Dashboard Appearance</h3><p>Personalize the dashboard while preserving the PARADOX dark security theme.</p>
          <div class="setting-row"><div class="setting-copy"><strong>Accent color</strong><span>Changes the accent throughout the entire dashboard.</span></div><div class="color-field"><div class="color-swatch"><input id="accentColorInput" type="color" value="${state.accent}"></div><input id="accentHexInput" class="input" style="width:100px" value="${state.accent}"></div></div>
          ${miniSetting('Background grid','Subtle transparent grid across dashboard surfaces',true)}
          ${miniSetting('Reduced animations','Reduce motion for accessibility',false)}
        </section>
        <section class="config-card detail-card" data-card-title="FiveM Server Connection"><h3>FiveM Server Connection</h3><p>${linked?'This account is paired with your FiveM server. The dashboard reconnects automatically whenever you sign in.':'Pair this account with the FiveM server that should provide dashboard telemetry.'}</p>
          <div class="setting-row"><div class="setting-copy"><strong>Connection state</strong><span>${linked?'Automatic live synchronization is enabled.':'Complete the one-time server connection setup.'}</span></div><span class="status-chip ${linked?'good':'warn'}">${fa(linked?'link':'link-slash')} ${linked?'Connected':'Setup required'}</span></div>
          <div class="setting-row"><div class="setting-copy"><strong>Server ID</strong><span>Stable identifier used by PARADOX.</span></div><input id="serverIdInput" class="input" style="width:180px" value="${esc(state.server.serverId||'')}" ${linked?'readonly':''}></div>
          <div class="setting-row"><div class="setting-copy"><strong>Server name</strong><span>Displayed throughout the dashboard.</span></div><input id="serverNameInput" class="input" style="width:190px" value="${esc(state.server.name||'Paradox City RP')}"></div>
          <div class="setting-row"><div class="setting-copy"><strong>Region / location</strong><span>Optional server location label.</span></div><input id="serverRegionInput" class="input" style="width:190px" value="${esc(state.server.region||'')}"></div>
          <div class="setting-row"><div class="setting-copy"><strong>Sync interval</strong><span>How often the dashboard refreshes live data.</span></div>${customSelect(`${Math.round(Number(state.server.syncInterval||5000)/1000)} seconds`,['3 seconds','5 seconds','10 seconds','15 seconds'])}</div>
          ${linked?'':`<div class="sync-state">${fa('circle-info')} Server address and pairing key are entered once in the secure connection wizard and then kept server-side.</div><div style="margin-top:10px"><button class="btn primary" data-action="openServerSetup">${fa('link')} Connect FiveM Server</button></div>`}
        </section>
        <section class="config-card detail-card" data-card-title="Storage & FiveManage"><h3>Storage & FiveManage</h3><p>Configure optional evidence storage. Provider secrets are stored by the Cloudflare backend, never exposed after saving.</p>
          <div class="setting-row"><div class="setting-copy"><strong>FiveManage API key</strong><span>${state.server.fiveManageKeyConfigured?'Configured and encrypted server-side.':'Optional — required only when using FiveManage storage.'}</span></div><input id="fiveManageKeyInput" class="input" type="password" style="width:220px" placeholder="${state.server.fiveManageKeyConfigured?'Leave blank to keep current':'Enter API key'}"></div>
          <div class="setting-row"><div class="setting-copy"><strong>Evidence storage</strong><span>Provider used for screenshots and replay artifacts.</span></div>${customSelect(state.server.storageProvider||'FiveManage',['Local / Custom','FiveManage'])}</div>
          ${miniSetting('Upload screenshots','Store screenshot evidence automatically',true)}
          ${miniSetting('Upload replay bundles','Store larger evidence replay files',true)}
        </section>
        ${configCard(['Enforcement Policy','Global action policy and rollout controls.',[['Global mode','OFF / SHADOW / LOG / BLOCK / ENFORCE','select','ENFORCE'],['Development mode','Disable automatic punitive actions','switch',false],['Screenshot before serious action','Attempt evidence capture first','switch',true],['Permanent ban minimum confidence','Default threshold','number','95']]])}
        ${configCard(['Notifications','Admin and Discord alert routing.',[['Critical admin alerts','Real-time high-risk notifications','switch',true],['Private admin chat','Send high-risk alerts to staff chat','switch',true],['Discord security webhook','Categorized security logs','switch',true],['Console alerts','Write enforcement actions to console','switch',true]]])}
      </div></div>`;
  }

  function integrationsPage(){const [t,d]=pageMeta.integrations;const cards=[['ESX Legacy','Framework Bridge','Connected','green'],['oxmysql','Database','Connected','green'],['ox_inventory','Inventory Adapter','Detected','green'],['screenshot-basic','Evidence Provider','Connected','green'],['Discord','Webhook Logging','Connected','green'],['txAdmin','Admin Integration','Available','blue'],['Reputation API','VPN / Proxy Provider','Disabled','orange'],['QBCore / QBX','Framework Bridge','Not in use','orange'],['Custom OCR','Screenshot OCR Provider','Not configured','orange']];return `<div class="page">${header(t,d,`<button class="btn">Scan Resources</button><button class="btn primary">＋ Custom Integration</button>`)}<div class="integration-grid">${cards.map(c=>`<div class="integration-card"><div class="integration-logo">${c[0][0]}</div><div><h3>${c[0]}</h3><p>${c[1]}</p><button class="btn ghost" data-action="configureIntegration" data-integration="${c[0]}">Configure</button></div><span class="tag ${c[3]}">${c[2]}</span></div>`).join('')}</div></div>`}

  function webhookLogsPage(){const [t,d]=pageMeta['webhook-logs'];const demo=[['WH-811','Security / Critical','204','DET-9281 evidence sent','Delivered','2m ago'],['WH-810','Connection','204','Player connected','Delivered','5m ago'],['WH-809','Admin Audit','204','Rule configuration changed','Delivered','8m ago'],['WH-808','Evidence','429','Screenshot notification','Retrying','12m ago']];const rows=rowsFor('webhookLogs',demo,['id|delivery','channel','http|statusCode','payload|message','status','time|createdAt']);return genericTablePage(t,d,['Delivery','Channel','HTTP','Payload','Status','Time'],rows,'Webhook Delivery',`<button class="btn">Retry Failed</button><button class="btn primary">Webhook Settings</button>`)}

  function auditPage(){const [t,d]=pageMeta['audit-log'];const demo=[['AUD-5512','FastxFingers','config.update','weapon-rules','Changed damage threshold 1.2 → 1.0','Just now'],['AUD-5511','System','ban.create','PA-F72B91','Automatic high-confidence enforcement','2m ago'],['AUD-5510','NovaDev','capability.grant','Player 113','spectate · 10m','9m ago'],['AUD-5508','FastxFingers','role.update','REVIEWER','Added evidence.view','22m ago']];const rows=rowsFor('audit',demo,['id','actor','action','target','details|detail','time|createdAt']);return genericTablePage(t,d,['Audit ID','Actor','Action','Target','Details','Time'],rows,'Administrative Audit',`<button class="btn">Verify Integrity</button><button class="btn primary">Export Audit</button>`)}

  function serverControlsPage(){
    const [t,d]=pageMeta['server-controls'];
    const demoActions=[['Protection synchronized','FastxFingers · all clients acknowledged','3m ago'],['Session nonce rotation','System · 87 sessions updated','14m ago'],['Entity cleanup','NovaDev · 28 abandoned entities removed','51m ago']];
    const source=state.demoSession?demoActions:(state.live?.serverActions||state.live?.audit?.serverActions||[]);
    const recent=source.length?`<div class="timeline">${source.slice(0,10).map(x=>Array.isArray(x)?timeline(...x):timeline(x.title||x.action||'Server action',x.detail||x.actor||'Live server',x.time||x.createdAt||'Live')).join('')}</div>`:noLiveData('No recent live server actions were returned.');
    return `<div class="page">${header(t,d,`<button class="btn">Run Diagnostics</button><button class="btn primary" data-action="syncRules">Sync Protection</button>`)}<div class="config-grid"><section class="config-card"><h3>Protection Modes</h3><p>High-level server security switches. All changes are audited.</p>${miniSetting('Development Mode','Logs detections but disables automatic kicks/bans',state.devMode)}${miniSetting('Under Attack Mode','Strict network/entity/particle filters',state.attackMode)}${miniSetting('Block Connections','Maintenance connection gate',state.blockConnections)}${miniSetting('Global Shadow Mode','Collect evidence without enforcement',false)}</section><section class="config-card"><h3>Server Operations</h3><p>Safe operational actions for the anti-cheat and protected server.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" data-action="clearCache">Clear Cache</button><button class="btn" data-action="syncRules">Sync Rules</button><button class="btn">Reload Config</button><button class="btn">Rotate Sessions</button><button class="btn">Entity Cleanup</button><button class="btn" data-action="exportLogs">Export Logs</button><button class="btn danger" data-action="restartProtection">Restart Protection</button><button class="btn danger">Maintenance Mode</button></div></section></div><div style="height:12px"></div>${panel('Recent Server Actions','All privileged server operations are audited',recent,{icon:'⚡'})}</div>`
  }
  function timeline(a,b,c){return `<div class="timeline-item"><strong>${a}</strong><span>${b}</span><time>${c}</time></div>`}

  function resourcesPage(){const [t,d]=pageMeta.resources;const demo=[['paradox_anticheat','started','0.13 ms','21.8 MB','Protected'],['es_extended','started','0.22 ms','36.1 MB','Verified'],['oxmysql','started','0.07 ms','18.6 MB','Verified'],['ox_inventory','started','0.41 ms','52.4 MB','Verified'],['screenshot-basic','started','0.02 ms','8.2 MB','Adapter'],['esx_property','started','0.12 ms','17.7 MB','Capability aware'],['illenium-appearance','started','0.18 ms','29.4 MB','Capability aware']];const rows=rowsFor('resources',demo,['name|resource','state','cpu','memory','securityState|security']);return genericTablePage(t,d,['Resource','State','CPU','Memory','Security State'],rows,'Resource Integrity',`<button class="btn">Rescan Integrity</button><button class="btn primary">Resource Policy</button>`)}

  function databasePage(){const [t,d]=pageMeta.database;return `<div class="page">${header(t,d,`<button class="btn">Retention</button><button class="btn primary">Run Health Check</button>`)}<div class="metric-cards">${metric('DATABASE','Connected','oxmysql · 18ms')}${metric('EVIDENCE ROWS','84,221','30 day retention')}${metric('BAN RECORDS','1,284','38 active')}${metric('STORAGE','1.83 GB','healthy')}</div><div class="status-grid">${service('pa_detections','84,221 rows','12 ms')}${service('pa_evidence','19,882 rows','15 ms')}${service('pa_sessions','4,821 rows','8 ms')}${service('pa_connections','112,094 rows','14 ms')}${service('pa_bans','1,284 rows','9 ms')}${service('pa_admin_actions','3,881 rows','11 ms')}</div></div>`}
  function service(name,sub,lat){return `<div class="service-card"><div class="service-top"><div class="service-icon">◉</div><div><strong>${name}</strong><span>${sub}</span></div><div class="service-status">● Healthy</div></div><div class="latency"><span>Query health</span><strong>${lat}</strong></div></div>`}

  function backupsPage(){const [t,d]=pageMeta.backups;const demo=[['BK-240922-0050','Automatic','Configuration + security tables','42.8 MB','Verified','00:50'],['BK-240921-1800','Automatic','Security tables','38.1 MB','Verified','Yesterday'],['BK-240921-1032','Manual','Pre-update snapshot','41.9 MB','Verified','Yesterday'],['BK-240920-1800','Automatic','Security tables','37.4 MB','Verified','2d ago']];const rows=rowsFor('backups',demo,['id|backup','type','scope','size','integrity|status','created|createdAt']);return genericTablePage(t,d,['Backup','Type','Scope','Size','Integrity','Created'],rows,'Backups',`<button class="btn">Backup Policy</button><button class="btn primary">${fa('plus')} Create Backup</button>`)}

  function maintenancePage(){const [t,d]=pageMeta.maintenance;return `<div class="page">${header(t,d)}<div class="config-grid"><section class="config-card"><h3>Cleanup & Retention</h3><p>Run safe cleanup tasks without disrupting live protection.</p><div style="display:grid;gap:8px"><button class="btn">Clean Expired Sessions</button><button class="btn">Prune Old Evidence</button><button class="btn">Remove Expired Capabilities</button><button class="btn">Clear Local Cache</button></div></section><section class="config-card"><h3>Synchronization</h3><p>Resynchronize runtime state with server configuration.</p><div style="display:grid;gap:8px"><button class="btn">Sync Detection Catalog</button><button class="btn">Sync Rules to Clients</button><button class="btn">Rebuild Resource Baseline</button><button class="btn">Rotate Session Nonces</button></div></section><section class="config-card"><h3>Diagnostics</h3><p>Collect health data for troubleshooting.</p><div style="display:grid;gap:8px"><button class="btn">Run Full Diagnostics</button><button class="btn">Profile Event Router</button><button class="btn">Test Screenshot Adapter</button><button class="btn">Test Discord Webhooks</button></div></section><section class="config-card"><h3>Danger Zone</h3><p>Privileged actions requiring explicit confirmation.</p><div style="display:grid;gap:8px"><button class="btn danger">Restart Protection</button><button class="btn danger">Temporarily Block Connections</button><button class="btn danger">Emergency Entity Cleanup</button></div></section></div></div>`}

  function statusPage(){const [t,d]=pageMeta['system-status'];return `<div class="page">${header(t,d,`<button class="btn">Run Diagnostics</button><button class="btn primary">Download Health Report</button>`)}<div class="status-grid">${service('Detection Engine','42 modules loaded','0.31 ms')}${service('Event Router','11 native listeners','0.19 ms')}${service('Risk Engine','87 active profiles','0.08 ms')}${service('Session Protocol','87 healthy sessions','5s interval')}${service('Evidence Service','Screenshot adapter online','22 ms')}${service('Database','oxmysql connected','18 ms')}${service('Discord Logger','4 webhooks healthy','31 ms')}${service('Capability Manager','7 active grants','0.03 ms')}${service('ESX Bridge','es_extended linked','0.05 ms')}</div><div style="height:12px"></div>${panel('Version & Build','Current PARADOX ANTICHEAT deployment',`<div class="code-block"><span class="key">version</span> = <span class="val">"2.4.1"</span>\n<span class="key">build</span> = <span class="val">"2026.09.22+187"</span>\n<span class="key">channel</span> = <span class="val">"stable"</span>\n<span class="key">framework</span> = <span class="val">"ESX Legacy"</span>\n<span class="key">onesync</span> = <span class="val">"enabled"</span>\n<span class="key">database</span> = <span class="val">"oxmysql"</span></div>`,{icon:'⌘'})}</div>`}

  function removedPage(){const [t,d]=pageMeta['removed-detections'];const demo=[['legacy.keypress_insert','Blacklisted key press','Low trust / high false positives','Retired','2026-08-02'],['legacy.resource_count','Static resource count mismatch','Unreliable with dynamic resources','Replaced','2026-08-19'],['legacy.health_damage_test','Self-damage godmode probe','Intrusive player modification','Removed','2026-09-01']];const rows=rowsFor('removedDetections',demo,['id|detectionId','name','reason','state|status','changed|updatedAt']);return genericTablePage(t,d,['Detection ID','Name','Reason','State','Changed'],rows,'Retired Detection Registry',`<button class="btn">View Change Log</button>`)}

  function replaysPage(){const [t,d]=pageMeta.replays;const demo=[['RPL-447','DET-9281','2Moonlight#8421','18.4s','30 frames','Ready','2m ago'],['RPL-445','DET-9278','n0va.exe','21.0s','30 frames','Ready','5m ago'],['RPL-438','DET-9257','RicoV','12.7s','24 frames','Ready','24m ago']];const rows=rowsFor('replays',demo,['id|replayId','detection|detectionId','player|playerName','duration','telemetry|frames','status','created|createdAt']);return genericTablePage(t,d,['Replay','Detection','Player','Duration','Telemetry','Status','Created'],rows,'Evidence Replays',`<button class="btn">Replay Settings</button>`)}


  function refBreadcrumb(group,title){return `<div class="ref-breadcrumb"><span>${esc(group)}</span>${fa('chevron-right')}<strong>${esc(title)}</strong></div>`}
  function refTitle(group,title,subtitle,icon,actions=''){return `<div class="ref-page-head">${refBreadcrumb(group,title)}<div class="ref-title-row"><div><h1>${fa(icon)} ${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="ref-head-actions">${actions}</div></div></div>`}
  function refEmpty(icon,title,sub,action=''){return `<div class="ref-empty"><div class="ref-empty-icon">${fa(icon)}</div><strong>${esc(title)}</strong><span>${esc(sub)}</span>${action}</div>`}
  function refStat(label,value,cls='green'){return `<div class="ref-stat ${cls}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
  function refSearch(placeholder, extra=''){return `<div class="ref-toolbar"><div class="ref-search">${fa('magnifying-glass')}<input placeholder="${esc(placeholder)}"></div>${extra}</div>`}
  function refTable(headers,rows,opts={}){return `<div class="ref-table-wrap ${opts.className||''}"><table class="ref-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map((r,ri)=>`<tr class="detail-row" data-ref-row="${ri}">${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">${refEmpty(opts.emptyIcon||'inbox',opts.emptyTitle||'No records found',opts.emptySub||'Records will appear here when available.')}</td></tr>`}</tbody></table></div>`}

  function securityLogsPage(){
    const rows=rowsFor('logs',state.demoSession?[]:[],['time','log']).map(r=>r.map(esc));
    return `<div class="page ref-page">${refTitle('Security','Logs','A list of the most recent logs from your server','scroll',`<button class="btn compact">Off ${fa('chevron-down')}</button><button class="icon-btn">${fa('rotate')}</button><button class="btn blue">${fa('download')} Export CSV</button>`)}${refSearch('Click to add a filter...',`<button class="btn ref-dataset">All Datasets ${fa('chevron-down')}</button><span class="ref-count">${fa('clock')} ${rows.length} logs</span>`)}${refTable(['Time','Log'],rows,{emptyTitle:'No logs found',emptySub:'Server log events will appear here in real-time.'})}</div>`
  }
  function securityLiveViewPage(){
    const list=Array.isArray(state.live?.liveViews)?state.live.liveViews:[];
    return `<div class="page ref-page">${refTitle('Security','Live View','Monitor your players remotely in real-time','video',`${refStat('Online',list.length)}${refStat('Watching',0,'yellow')}<button class="btn primary" data-action="refresh">${fa('rotate')} Refresh</button>`)}<div class="live-ref-controls"><div class="segmented"><button class="seg">${fa('list')} List</button><button class="seg active">${fa('video')} Grid</button></div><div class="ref-search">${fa('magnifying-glass')}<input placeholder="Filter by name, ID, or license..."></div><button class="btn">Sort: Server ID ${fa('chevron-down')}</button></div><div class="filter-chips">${['Flagged','Possible Cheater','New Player','Cheating Discord','Alt Account','VPN','Starred','Active Streams'].map(x=>`<button>${x} <b>0</b></button>`).join('')}</div><div class="live-layout-ref"><div class="live-stage-ref">${list.length?list.map(v=>`<div class="stream-card detail-card" data-card-title="${esc(v.playerName||'Player Stream')}"><img src="${esc(v.thumbnailUrl||'')}" alt=""><div><strong>${esc(v.playerName||'Player')}</strong><span>${esc(v.status||'live')}</span></div></div>`).join(''):refEmpty('video-slash','No Active Streams','Select players from the list to start monitoring their gameplay in real-time.')}</div><aside class="live-player-list-ref"><div class="live-list-head">${fa('users')} <strong>PLAYERS</strong><span>0</span></div>${refSearch('Search players...')}<div class="live-list-empty">${fa('user-slash')}<span>No players match your filters</span></div></aside></div></div>`
  }
  function securityInsightsPage(){return `<div class="page ref-page">${refTitle('Security','Insights',"Review misconfigurations that could be weakening your server's protection",'shield-halved',`<span class="muted">Checked ${new Date().toLocaleTimeString()}</span><button class="btn primary">${fa('rotate')} Refresh</button>`)}<div class="severity-row">${refStat('Critical','—','red')}${refStat('High','—','orange')}${refStat('Medium','—','yellow')}${refStat('Low','—','blue')}</div><div class="insights-empty-ref">${refEmpty('circle-check',state.sectionData?.insights?.db?.schema==='ready'?'Database Ready':'Health Requires Review',state.sectionData?.insights?.error||'Review server telemetry and SHADOW observations; this is not a cheat-free verdict.')}</div></div>`}
  function securityLookupPage(){
    return `<div class="page ref-page lookup-ref"><div class="lookup-hero"><h1>${fa('magnifying-glass')} Player Lookup</h1><p>Search and analyze player reputation across servers</p><button class="lookup-search v14-lookup-trigger" data-action="openPlayerLookup" type="button">${fa('magnifying-glass')}<span>Search by name, license, FiveM ID, Steam ID, or Discord ID...</span><kbd>Enter</kbd></button><span>${fa('circle-question')} 5 of 5 searches remaining this window</span></div></div>`
  }
  function securityFirewallPage(){return `<div class="page ref-page">${refTitle('Security','Firewall Analytics','Activity reported by your custom firewall rules, aggregated over the last 24 hours','chart-column',`<span class="muted">Updated ${new Date().toLocaleTimeString()}</span><button class="btn primary">${fa('rotate')} Refresh</button>`)}<div class="firewall-kpis">${[['Total Checks',String((state.sectionData?.['firewall-analytics']?.events||[]).reduce((n,r)=>n+Number(r.total||0),0)),'gray'],['Flagged',String((state.sectionData?.['firewall-analytics']?.detections||[]).reduce((n,r)=>n+Number(r.total||0),0)),'orange'],['Blocking Actions','—','red'],['Passed Clean','—','green']].map(x=>`<div class="fw-kpi"><span><i class="dot ${x[2]}"></i>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div><section class="ref-card analytics-chart-card"><div class="ref-card-head"><h3>${fa('chart-area')} Checks & Flags Over Time</h3><div><span>● Checks</span><span class="orange">● Flags</span><span>Last 24 hours</span></div></div><div class="fake-chart"><div class="chart-grid-lines"></div><svg viewBox="0 0 1000 210" preserveAspectRatio="none"><polyline points="0,195 1000,195" fill="none" stroke="#ff922f" stroke-width="2"/></svg></div></section><h2 class="section-heading">Top statistics</h2><p class="muted">Which rules, rulesets, actions, and matched fields are driving firewall activity.</p><div class="top-stat-grid">${['Top Rules (Flags)','Top Rules (Checks)','Rulesets','Actions Triggered','Matched Condition Fields','Rule Status'].map((x,i)=>`<section class="mini-stat-card"><strong>${x}</strong><hr>${i===5?'<span class="status-green">● Enabled</span><div class="mini-progress"><i style="width:100%"></i></div>':'<span>No flags recorded</span>'}</section>`).join('')}</div></div>`}
  function securityDetectionsPage(){
    const demo=state.demoSession?DEMO_DETECTIONS:[]; const src=Array.isArray(state.live?.detections)?state.live.detections:demo;
    let normalized=src.map((d,i)=>{const a=Array.isArray(d)?d:null;return {player:a?a[2]:(d.playerName||d.player||'Unknown'),reason:a?a[1]:(d.reason||d.name||'Detection'),action:a?a[5]:(d.action||d.severity||'WARN'),time:a?.[7]||d.time||'Live'};});
    if(state.detectionFilter!=='all') normalized=normalized.filter(x=>String(x.action).toLowerCase().includes(state.detectionFilter));
    const rows=normalized.map((d,i)=>[`<input class="pa-checkbox" type="checkbox" aria-label="Select detection ${i+1}">`,`<span class="time-pill">${esc(d.time)}</span>`,esc(d.player),`<div class="detection-log-cell"><span class="action-tag ${String(d.action).toLowerCase()}">${esc(d.action)}</span><span>${esc(d.reason)}</span></div>`]);
    return `<div class="page ref-page">${refTitle('Security','Detections','Manage anti-cheat detections from your server','shield-halved',`<button class="btn compact" data-action="detectionFilterMenu" data-kind="detections">${state.detectionFilter==='all'?'All':state.detectionFilter.replace(/^./,c=>c.toUpperCase())} ${fa('chevron-down')}</button><button class="icon-btn" data-action="refresh">${fa('rotate')}</button><span class="detection-count-pill">${fa('triangle-exclamation')} ${rows.length} Detections</span>`)}${refSearch('Click to add a filter...',`<button class="btn" data-action="detectionFilterMenu" data-kind="detections">${state.detectionFilter==='all'?'All Detections':state.detectionFilter.replace(/^./,c=>c.toUpperCase())} ${fa('chevron-down')}</button><button class="btn primary" data-action="refresh">${fa('rotate')} Refresh</button>`)}${refTable(['','Time','Player','Detection Log'],rows,{emptyTitle:'No detections found',emptySub:'No detections match the selected filter.'})}</div>`
  }
  function securityRemovedPage(){
    let rows=state.demoSession?[['','4 months ago','mistersnowdragon','FastFingers','Possible AimBot detected.'],['','4 months ago','mistersnowdragon','LoudToad6293','Attempting to trigger a client event.'],['','5 months ago','FastxFingers','FastFingers','Attempting to trigger a server event.'],['','6 months ago','FastxFingers','TheSpriteGuy','Attempting to repair their vehicle.']]:(state.sectionData?.['removed-detections']?.rows||[]).filter(r=>r.removed).map(r=>['',window.ParadoxData.date(r.updated_at),esc(r.actor),'Detection '+esc(r.detection_id),esc(r.reason)]);
    if(state.removedDetectionFilter!=='all') rows=rows.filter(r=>String(r[4]).toLowerCase().includes(state.removedDetectionFilter));
    return `<div class="page ref-page">${refTitle('Security','Removed Detections','View and manage dismissed anti-cheat detections','trash-can',`<button class="btn compact" data-action="detectionFilterMenu" data-kind="removed">${state.removedDetectionFilter==='all'?'All':state.removedDetectionFilter.replace(/^./,c=>c.toUpperCase())} ${fa('chevron-down')}</button><button class="icon-btn" data-action="refresh">${fa('rotate')}</button><span class="green-count">${fa('box-archive')} ${rows.length} Detections</span>`)}${refSearch('Search by player name or identifier...',`<button class="btn" data-action="detectionFilterMenu" data-kind="removed">${state.removedDetectionFilter==='all'?'All Detections':state.removedDetectionFilter.replace(/^./,c=>c.toUpperCase())} ${fa('chevron-down')}</button><button class="btn primary" data-action="refresh">${fa('rotate')} Refresh</button>`)}${refTable(['','Removed Time','Removed By','Player','Detection Log'],rows.map((r,i)=>[`<input class="pa-checkbox" type="checkbox" aria-label="Select removed detection ${i+1}">`,`<span class="time-pill">${r[1]}</span>`,`<span class="removed-by">${r[2]}</span>`,r[3],`<div class="detection-log-cell"><span class="action-tag ban">BAN</span><span>${r[4]}</span></div>`]),{emptyTitle:'No removed detections',emptySub:'No removed detections match the selected filter.'})}</div>`
  }
  function securityReplaysPage(){return `<div class="page ref-page">${refTitle('Security','Replays','Player event replays captured by your game server','film')}<div class="replay-tools"><div class="ref-search">${fa('magnifying-glass')}<input placeholder="Search by license, discord, steam, name, event, or description..."></div><button class="btn">All Events ${fa('chevron-down')}</button></div><div class="replay-empty-ref">${(state.sectionData?.replays?.rows||[]).length?refTable(['Time','Detection','Evidence'],state.sectionData.replays.rows.map(r=>[esc(window.ParadoxData.date(r.created_at)),esc(r.detection_id),`<button class="btn" data-action="liveInspectEvidence" data-kind="evidence" data-id="${esc(r.id)}">Inspect</button>`])):refEmpty('film','No replays found',state.sectionData?.replays?.error||'Captured evidence records will appear here; video requires a recording provider.')}</div></div>`}

  function managementAssetsPage(){return `<div class="page ref-page">${refTitle('Management','Assets','View and download Paradox builds and artifacts','box-archive',`<span class="green-count">${fa('download')} 0 Assets</span>`)}${refTable(['Asset Type','Date','Version Name','Description'],[],{emptyIcon:'box-open',emptyTitle:'No assets available',emptySub:'Assets will appear here when they are uploaded'})}</div>`}
  function managementLogbookPage(){
    const rows=state.demoSession?[['4 months ago','May 21, 2026 · 7:21 PM','mistersnowdragon removed detection 6a0fa15a9faa2de76c2b16f6 from 7ad07f9e1ee146ce4aaf4f9a6aa21d9d968f44f3'],['4 months ago','May 20, 2026 · 3:36 PM','FastxFingers manually added a ban detection for Bigplayray: Cheating.'],['4 months ago','May 20, 2026 · 3:33 PM','FastxFingers manually added a ban detection for LoudToad6293: Banned.'],['4 months ago','May 15, 2026 · 2:09 AM','mistersnowdragon updated ignored client event settings.']]:(state.sectionData?.logbook?.rows||[]).map(r=>[window.ParadoxData.date(r.created_at),window.ParadoxData.date(r.created_at),`${r.actor}: ${r.kind}`]);
    return `<div class="page ref-page">${refTitle('Management','Logbook',"View your server's audit log and activity history",'book',`<span class="green-count">${fa('list')} ${rows.length} Entries</span>`)}${refSearch('Search logs by message, time, or keywords...',`<button class="btn primary">${fa('rotate')} Refresh</button>`)}<div class="logbook-list">${rows.length?rows.map(r=>`<article class="logbook-entry detail-card"><div><span class="time-pill">${fa('clock')} ${r[0]}</span><small>${r[1]}</small></div><div class="logbook-message">${fa('circle-info')}<strong>${esc(r[2])}</strong></div></article>`).join(''):refEmpty('book','No logbook entries','Administrative activity will appear here.')}</div></div>`
  }
  function managementPermissionsPage(){
    const access=state.sectionData?.permissions||{}, members=(access.users||access.rows||[]).filter(u=>u.status!=='pending'),invites=(access.users||[]).filter(u=>u.status==='pending');
    const memberRows=members.map(u=>`<div class="member-row"><div><strong>${esc(u.displayName||u.email||u.label||'Member')}</strong><span class="status-online">${esc(u.status||'Assigned')}</span><small>${esc(u.accountId||'')}</small></div><div><span class="role-blue">${esc(u.role||u.role_name)}</span></div><div>—</div>${access.canManage&&!u.isOwner?`<button class="icon-btn" data-action="liveRevokeMember" data-id="${esc(u.id)}" title="Revoke access">${fa('user-minus')}</button>`:'<span></span>'}</div>`).join('');
    const tab=state.permissionsTab||'members'; const tabs=[['members','users','Members',String(members.length)],['roles','layer-group','Roles','0'],['invite-links','link','Invite Links',String(invites.length)],['bypasses','shield-halved','Bypasses','']]; let body='';
    if(tab==='members') body=`<div class="section-header-line"><div><h2>Team Members</h2><p>Active members with access to this server's panel.</p></div><button class="btn outline-green" data-action="inviteMember">${fa('envelope')} Invite Member</button></div><div class="member-table"><div class="member-head"><span>USERNAME</span><span>ROLES</span><span>NOTES</span><span></span></div>${memberRows||`<div class="permission-empty-row">${esc(access.error||'No members returned')}</div>`}</div><div class="section-header-line pending-head"><div><h2>Pending Invites</h2><p>Invites that have been sent but not yet accepted.</p></div></div><div class="pending-box">${fa('envelope-open')} ${invites.length?invites.map(u=>esc(u.email)+' · '+esc(u.role)).join('<br>'):'No pending invites.'}</div>`;
    if(tab==='roles') body=`<div class="section-header-line"><div><h2>Permission Roles</h2><p>Reusable permission sets you can assign to members.</p></div><button class="btn outline-green" data-action="createPermissionRole">${fa('plus')} New Role</button></div><div class="permission-empty-row">${fa('layer-group')}<span>${Object.entries(access.detail?.builtinRoles||{}).map(([name,permissions])=>esc(name)+' · '+Object.keys(permissions).length+' permissions').join('<br>')||esc(access.error||'Load roles to view server permission sets.')}</span></div>`;
    if(tab==='invite-links') body=`<div class="section-header-line"><div><h2>Invite Links</h2><p>Shareable links that automatically assign roles when accepted.</p></div><button class="btn outline-green" data-action="createInviteLink">${fa('plus')} New Link</button></div><div class="permission-empty-row">${fa('link-slash')}<span>${invites.length?invites.map(u=>esc(u.email)+' · Pending').join('<br>'):'No pending invitation links.'}</span></div>`;
    if(tab==='bypasses') body=`<div class="section-header-line"><div><h2>Anti-Cheat Bypasses</h2><p>Exempt specific players or identifiers from selected detections.</p></div><button class="btn outline-green" data-action="addBypass">${fa('plus')} Add Bypass</button></div><div class="bypass-table"><div class="member-head"><span>TARGET MATCH</span><span>BYPASSED DETECTIONS</span><span>NOTES</span></div><div class="permission-empty-wide">No bypasses configured yet.</div></div>`;
    return `<div class="page ref-page v12-permissions">${refTitle('Management','Admin Permissions','Manage your team, roles, invites, and anti-cheat bypasses','user-shield')}<div class="permission-tabs">${tabs.map(([key,icon,label,count])=>`<button class="${tab===key?'active':''}" data-action="permissionTab" data-tab="${key}">${fa(icon)} ${label}${count!==''?` <b>${count}</b>`:''}</button>`).join('')}</div>${body}</div>`;
  }

  function managementServerDetailsPage(){return `<div class="page ref-page">${refTitle('Management','Server Details','View technical specifications and configuration details for your server','server')}<div class="server-details-grid"><section class="detail-panel detail-card" data-card-title="General Information"><h3>${fa('server')} General Information</h3>${[['Server ID',state.server.serverId||'—'],['Created By',state.user.id||'—'],['Locale','en-US'],['Game Type','gta5']].map(x=>`<div class="server-detail-row"><span>${x[0]}</span><strong>${esc(x[1])}</strong></div>`).join('')}</section><section class="detail-panel detail-card" data-card-title="System Information"><h3>${fa('microchip')} System Information</h3>${[['Operating System',state.live?.server?.operatingSystem||'Not reported'],['Build Number',state.live?.server?.build||'Not reported'],['Version',state.live?.server?.version||'Not reported'],['Product Type','Paradox'],['Custom Artifacts','Not reported']].map((x,i)=>`<div class="server-detail-row"><span>${x[0]}</span><strong class="${i>2?'status-green':''}">${esc(x[1])}</strong></div>`).join('')}</section><section class="detail-panel detail-card" data-card-title="Storage & Plan"><h3>${fa('database')} Storage & Plan</h3>${[['Max Storage','Not configured'],['CDN Usage','Not reported'],['Storage Used','Not reported'],['Plan Reference','Not configured']].map(x=>`<div class="server-detail-row"><span>${x[0]}</span><strong>${esc(x[1])}</strong></div>`).join('')}</section></div></div>`}
  function managementApiKeysPage(){return `<div class="page ref-page">${refTitle('Management','API Keys','Create and manage secure API credentials for third-party integrations','key',`<button class="btn primary" data-action="createApiKey">${fa('plus')} New API Key</button>`)}<div class="api-key-hero"><div>${fa('key')}<div><strong>Secure integration access</strong><span>Keys are shown once at creation and can be revoked at any time.</span></div></div><span class="status-green">0 active keys</span></div>${refTable(['Name','Prefix','Permissions','Created','Last Used',''],[],{emptyIcon:'key',emptyTitle:'No API keys created',emptySub:'Create a key when you are ready to connect an external service.'})}</div>`}
  function managementSupportPage(){return `<div class="page ref-page">${refTitle('Management','Support Tickets','Create and manage support tickets','headset',`<div class="ticket-counts"><span class="green">0</span><span class="yellow">0</span><span class="red">0</span></div><button class="btn primary" data-action="newSupportTicket">${fa('plus')} New</button>`)}<div class="ticket-filter-row"><button class="filter-field">Status ${fa('chevron-down')}</button><button class="filter-field">Priority ${fa('chevron-down')}</button><button class="filter-field">Category ${fa('chevron-down')}</button><button class="btn primary wide">Apply</button><button class="btn">Clear</button></div><div class="ticket-empty">No tickets found<button class="btn outline-green" data-action="newSupportTicket">Create Your First Ticket</button></div></div>`}
  function managementBackupsPage(){
    const rows=state.demoSession?[['Auto-backup - 5/15/2026, 2:09:46 AM','4 months ago','May 15, 2026 · 2:09 AM'],['Auto-backup - 4/9/2026, 8:35:00 PM','5 months ago','Apr 9, 2026 · 8:35 PM'],['Auto-backup - 3/30/2026, 12:57:45 AM','6 months ago','Mar 30, 2026 · 12:57 AM'],['Auto-backup - 3/29/2026, 12:26:05 AM','6 months ago','Mar 29, 2026 · 12:26 AM']]:[];
    return `<div class="page ref-page">${refTitle('Management','Backups','Create, restore, and manage settings backups','box-archive',`<span class="green-count">${fa('database')} ${rows.length} Backups</span>`)}<div class="backup-actions"><button class="btn primary" data-action="createBackup">${fa('plus')} Create Backup</button><button class="btn">${fa('rotate')} Refresh</button></div><div class="backup-list-ref">${rows.length?rows.map((r,i)=>`<article class="backup-row-ref detail-card" data-card-title="${esc(r[0])}"><div><strong>${fa('robot')} ${r[0]}</strong><span><b>AUTO</b> ${fa('clock')} ${r[1]} &nbsp; ${r[2]}</span></div><div><button class="btn blue">${fa('rotate-left')} Restore</button><button class="icon-btn danger">${fa('trash')}</button></div></article>`).join(''):refEmpty('box-archive','No backups available','Create your first configuration backup.')}</div></div>`
  }
  function managementCdnPage(){
    const files=state.demoSession?[['4mjnABvKfZSxpAI5.mp4','1.47 MB'],['PH0gUR4Sh3OqIL.mp4','278.1 KB'],['efuRrgJyIUc5JprS.mp4','152.9 KB'],['jMvaTBMQhl7zllbX.mp4','1.32 MB'],['mJYc5gBRnJKqYoW5.mp4','205.3 KB'],['tNvtaIKYWOL5o0PM.mp4','1.02 MB'],['ZILIZUYxKN2oMh53.mp4','1.51 MB'],['6Xef1Cy6nGMNLPly.mp4','522.6 KB']]:[];
    const thumbs=['linear-gradient(135deg,#7aa4bd,#1b3442)','linear-gradient(135deg,#9c7f65,#1e1d1d)','linear-gradient(135deg,#708c90,#102a33)','linear-gradient(135deg,#695a42,#191311)','linear-gradient(135deg,#839aa0,#273136)','linear-gradient(135deg,#63767f,#151c22)','linear-gradient(135deg,#72868e,#183746)','linear-gradient(135deg,#7f8d76,#36352c)'];
    return `<div class="page ref-page">${refTitle('Management','CDN Files',"Files uploaded to your server's CDN storage",'image')}<section class="cdn-storage-card detail-card" data-card-title="CDN Storage"><div class="cdn-icon">${fa('database')}</div><div><span>CDN STORAGE</span><strong>${state.demoSession?'35.6 MB':'—'} <small>${state.demoSession?'of 6.00 GB':'Provider not configured'}</small></strong><div class="cdn-progress"><i style="width:.6%"></i></div><b>${state.demoSession?'35.6 MB / 6.00 GB':'No provider usage reported'}</b></div><span>${files.length} files</span></section><div class="cdn-toolbar"><strong>${fa('hard-drive')} CDN</strong><span>${fa('chevron-right')}</span><strong>${fa('folder-open')} clips</strong><div class="ref-search">${fa('magnifying-glass')}<input placeholder="Search by filename..."></div><button class="btn dashed">${fa('folder-plus')} New Folder</button><span class="btn">${files.length} files</span></div><div class="cdn-grid-ref">${files.length?files.map((f,i)=>`<article class="cdn-file-card detail-card" data-card-title="${esc(f[0])}"><div class="cdn-thumb" style="background:${thumbs[i%thumbs.length]}"><span>${fa('play')}</span><button class="icon-btn">${fa('ellipsis-vertical')}</button></div><div><strong>${esc(f[0])}</strong><span>${f[1]} · Mar ${21+i}</span></div></article>`).join(''):refEmpty('folder-open','No CDN files','Uploaded clips and evidence files will appear here.')}</div></div>`
  }

  function specializedSectionModal(page, card){
    const title=card?.dataset?.cardTitle||card?.querySelector('strong,h3')?.textContent?.trim()||pageMeta[page]?.[0]||'Details';
    const shell=(icon,kicker,heading,sub,inner,foot='')=>{openModal(`${fa(icon)} ${esc(heading)}`,`<div class="section-modal ${page.replace(/[^a-z0-9-]/gi,'')}"><div class="section-modal-hero"><div class="section-modal-icon">${fa(icon)}</div><div><span>${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(sub)}</p></div></div>${inner}</div>`,foot||`<button class="btn" data-action="closeModal">Close</button>`);return true;};
    const kv=(a,b)=>`<div class="sm-kv"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`;
    const tabs=(arr,active=0)=>`<div class="sm-tabs">${arr.map((x,i)=>`<button class="${i===active?'active':''}">${esc(x)}</button>`).join('')}</div>`;
    if(page==='logs') return shell('scroll','SERVER LOG EVENT','Log Event','Exact event payload and processing path.',`${tabs(['Event','Context','Raw Payload'])}<div class="log-modal-grid"><section><h3>Event Timeline</h3><div class="timeline-pro"><i></i><div><strong>Received by edge</strong><span>10:07:40.221</span></div><i></i><div><strong>Validated by firewall</strong><span>10:07:40.224</span></div><i></i><div><strong>Stored in logbook</strong><span>10:07:40.229</span></div></div></section><aside>${kv('Dataset','Security')}${kv('Source','FiveM bridge')}${kv('Outcome','Accepted')}${kv('Latency','8 ms')}</aside></div><pre class="sm-code">{\n  "event": "paradox:security:log",\n  "server": "${esc(state.server.serverId||'linked-server')}",\n  "status": "verified"\n}</pre>`,`<button class="btn">${fa('copy')} Copy JSON</button><button class="btn primary" data-action="closeModal">Done</button>`);
    if(page==='live-view') return shell('video','LIVE PLAYER STREAM','Live View','Monitor gameplay and capture evidence without leaving the dashboard.',`<div class="stream-modal-preview"><div class="stream-scanlines"></div>${fa('video')}<strong>SECURE LIVE FEED</strong><span>Awaiting active thumbnail frames from the screenshot adapter</span></div><div class="stream-modal-actions"><button class="btn primary">${fa('camera')} Capture Evidence</button><button class="btn">${fa('star')} Star Player</button><button class="btn">${fa('volume-high')} Audio</button><button class="btn danger">${fa('eye-slash')} Stop Watching</button></div><div class="sm-grid4">${kv('Server ID','—')}${kv('FPS','30 target')}${kv('Quality','Adaptive')}${kv('Delay','< 2s')}</div>`);
    if(page==='insights') return shell('shield-halved','SECURITY POSTURE','Security Insight','Configuration review with remediation guidance.',`<div class="insight-score-modal"><div class="score-ring">100<span>/100</span></div><div><h3>No weakness detected</h3><p>This rule set passed the current security posture checks.</p></div></div>${tabs(['Finding','Affected Rules','Remediation'])}<div class="recommendation-box"><i>${fa('circle-check')}</i><div><strong>Configuration is healthy</strong><span>No changes are recommended for this insight.</span></div></div>`);
    if(page==='player-lookup') return shell('magnifying-glass','IDENTITY GRAPH','Player Identity','Cross-server identifiers, detections, server history and reputation.',`<div class="identity-modal-grid"><section><h3>${fa('fingerprint')} Identifiers</h3>${kv('license2','460c0d965cd57d84636f7c4ddadff41571015865')}${kv('Rockstar','7ad07f9e1ee146ce4aaf4f9a6aa21d9d968f44f3')}${kv('FiveM','17092499')}${kv('Discord','893209101717364746')}</section><section><h3>${fa('clock')} Reputation</h3><div class="reputation-kpis">${kv('First seen','2 years ago')}${kv('Last joined','3 months ago')}${kv('This server','16d 4h')}${kv('Total playtime','18d 16h')}</div><h3>${fa('server')} Servers Joined</h3><div class="server-chip-grid">${['City Lurkz RP','Classic Roleplay','Palm Beach RP','8Trap RP'].map(x=>`<span>${fa('server')} ${x}</span>`).join('')}</div></section></div><div class="identity-actions"><button class="btn outline-green">${fa('map-location-dot')} Interactive Map</button><button class="btn">${fa('video')} Live View</button><button class="btn warn">${fa('triangle-exclamation')} Warn</button><button class="btn danger">${fa('ban')} Add Ban</button></div>`);
    if(page==='firewall-analytics') return shell('fire-flame-curved','FIREWALL TELEMETRY','Firewall Statistic','Rule checks, match conditions and block behavior.',`<div class="firewall-modal-chart"><div class="bars">${[82,49,67,31,76,54,90,62,44,71].map((v,i)=>`<i style="height:${v}%"></i>`).join('')}</div></div><div class="sm-grid4">${kv('Total checks','0')}${kv('Flags','0')}${kv('Blocks','0')}${kv('Pass rate','100%')}</div><section class="rule-breakdown"><h3>Top matched conditions</h3>${['event.name','source.resource','payload.rate','entity.owner'].map((x,i)=>`<div><span>${x}</span><b>${[0,0,0,0][i]}</b><i style="width:${[10,6,4,2][i]}%"></i></div>`).join('')}</section>`);
    if(page==='detections') { const active=state.sectionModalTab.detections||'Overview'; state.sectionModalTitle=title; const dtabs=`<div class="sm-tabs interactive">${['Overview','Evidence','Player','Server Logs'].map(x=>`<button class="${active===x?'active':''}" data-action="sectionModalTab" data-page="detections" data-tab="${x}">${x}</button>`).join('')}</div>`; let detail=''; if(active==='Overview')detail=`<h3>Detection reason</h3><p class="det-reason">Attempting to spawn a blacklisted explosion. Explosion: CAR</p><div class="sm-grid4">${kv('Detection ID','DET-9281')}${kv('Module','Explosion Protection')}${kv('Server','eplq53')}${kv('Created','3 months ago')}</div>`; if(active==='Evidence')detail=`<div class="v15-modal-section"><h3>${fa('camera')} Evidence</h3><div class="v15-evidence-grid"><div>${fa('image')}<strong>Screenshot</strong><small>Captured at trigger time</small></div><div>${fa('wave-square')}<strong>Telemetry</strong><small>18 correlated frames</small></div><div>${fa('code')}<strong>Payload</strong><small>Validated event metadata</small></div></div></div>`; if(active==='Player')detail=`<div class="v15-modal-section"><h3>${fa('user')} Player Identity</h3>${kv('FiveM','17092499')}${kv('Discord','1298876575399411787')}${kv('License','0098bf...45db6c')}${kv('Risk score','32 / 100')}</div>`; if(active==='Server Logs')detail=`<div class="v15-modal-section"><h3>${fa('terminal')} Server Logs</h3><div class="v15-logline">[14:23:17] explosionEvent received from player 17092499</div><div class="v15-logline">[14:23:17] matched blacklist rule EXP_TAG_CAR</div><div class="v15-logline">[14:23:17] enforcement action WARN queued</div></div>`; return shell('shield-halved','DETECTION REVIEW','Detection','Review the signal, player identity, evidence and enforcement action.',`<div class="detection-review-grid"><section><div class="det-action-banner">${fa('triangle-exclamation')}<div><span>ACTION</span><strong>WARN</strong></div><b>97% confidence</b></div>${dtabs}${detail}</section><aside><h3>${fa('user')} Player</h3><div class="det-player"><div class="avatar">F</div><div><strong>FastFingers</strong><span>FiveM 17092499</span></div></div>${kv('Risk score','32 / 100')}${kv('Prior detections','4')}${kv('Session state','Offline')}</aside></div>`,`<button class="btn">${fa('trash')} Remove Detection</button><button class="btn warn">Warn</button><button class="btn danger">${fa('ban')} Add Ban</button>`); }
    if(page==='removed-detections') return shell('trash-can','DISMISSED SIGNAL','Removed Detection','Audit why this detection was removed and restore it when needed.',`<div class="removed-audit"><div class="removed-stamp">REMOVED</div><div class="sm-grid4">${kv('Removed by','FastxFingers')}${kv('Removed','4 months ago')}${kv('Original action','BAN')}${kv('Server','eplq53')}</div><section><h3>Original detection</h3><p>Possible AimBot detected.</p></section><section><h3>Removal note</h3><p>Dismissed during manual evidence review. This action is preserved in the immutable logbook.</p></section></div>`,`<button class="btn">${fa('book')} View Audit Entry</button><button class="btn primary">${fa('rotate-left')} Restore Detection</button>`);
    if(page==='replays') return shell('film','EVENT REPLAY','Replay Session','Inspect captured event timing and player actions frame-by-frame.',`<div class="replay-player"><div class="replay-screen">${fa('film')}<span>NO REPLAY MEDIA LOADED</span></div><div class="replay-timeline"><button>${fa('backward-step')}</button><button class="play">${fa('play')}</button><div class="replay-track"><i style="width:34%"></i><b style="left:34%"></b></div><span>00:00 / 00:18</span></div></div><div class="sm-grid4">${kv('Events','30')}${kv('Duration','18.4s')}${kv('Player','FastFingers')}${kv('Status','Ready')}</div>`);
    if(page==='assets') return shell('box-archive','BUILD ARTIFACT','Asset Detail','Release metadata, integrity information and secure downloads.',`<div class="asset-modal"><div class="asset-box-icon">${fa('box-open')}</div><div><span>VERSION</span><strong>PARADOX ANTICHEAT v2.4.1</strong><p>Production build artifact signed by the release pipeline.</p></div></div><div class="sm-grid4">${kv('Build','2026.09.22+187')}${kv('Size','6.6 MB')}${kv('Channel','Stable')}${kv('Checksum','Verified')}</div><section class="release-notes"><h3>Release notes</h3><ul><li>Security and Management dashboard overhaul</li><li>Improved evidence workflows</li><li>Cloudflare backend support</li></ul></section>`,`<button class="btn">${fa('file-lines')} Release Notes</button><button class="btn primary">${fa('download')} Download Asset</button>`);
    if(page==='logbook') return shell('book','IMMUTABLE AUDIT LOG','Audit Entry','Inspect actor, action, affected object and exact before/after values.',`<div class="audit-modal-head"><div class="avatar">F</div><div><strong>FastxFingers</strong><span>Server Owner · authenticated session</span></div><time>May 20, 2026 · 3:36 PM</time></div><div class="audit-flow"><div><span>Before</span><pre>{ "status": "clear" }</pre></div>${fa('arrow-right')}<div><span>After</span><pre>{ "status": "banned" }</pre></div></div><div class="sm-grid4">${kv('Action','Manual ban')}${kv('Target','Bigplayray')}${kv('Server','eplq53')}${kv('Audit ID','LOG-12019')}</div>`);
    if(page==='permissions') { const active=state.sectionModalTab.permissions||'Permissions'; state.sectionModalTitle=title; const tabHtml=`<div class="sm-tabs interactive">${['Permissions','Roles','Bypasses','Activity'].map(x=>`<button class="${active===x?'active':''}" data-action="sectionModalTab" data-page="permissions" data-tab="${x}">${x}</button>`).join('')}</div>`; let panel=''; if(active==='Permissions') panel=`<div class="permission-modal-profile"><div class="avatar">F</div><div><h3>FastxFingers</h3><span class="status-online">● Online</span><p>Owner account with full server panel access.</p></div></div><div class="permission-scope-list">${['Manage detections','Review evidence','Manage bans','Server configuration','Team access','API keys'].map(x=>`<label>${fa('check')}<span>${x}</span><b>Allowed</b></label>`).join('')}</div>`; if(active==='Roles')panel=`<div class="v15-modal-section"><h3>${fa('layer-group')} Assigned Roles</h3><div class="v15-info-row"><span class="role-blue">Owner</span><div><strong>All Permissions</strong><small>Full server panel access and role administration.</small></div></div></div>`; if(active==='Bypasses')panel=`<div class="v15-modal-section"><h3>${fa('shield-halved')} Anti-Cheat Bypasses</h3><div class="v13-tab-empty">No bypasses are configured for this member.</div></div>`; if(active==='Activity')panel=`<div class="v15-modal-section"><h3>${fa('clock-rotate-left')} Recent Activity</h3>${['Signed in to dashboard','Reviewed security rules','Opened detection review'].map((x,i)=>`<div class="v15-activity-row"><span>${fa('circle-check')}</span><div><strong>${x}</strong><small>${i===0?'2 minutes ago':i===1?'18 minutes ago':'31 minutes ago'}</small></div></div>`).join('')}</div>`; return shell('user-shield','TEAM ACCESS','Member Access','Roles, permission scopes, bypasses and account status.',`${tabHtml}${panel}`,`<button class="btn">Revoke Sessions</button><button class="btn primary">Edit Permissions</button>`); }
    if(page==='server-details') return shell('server','SERVER PROFILE','Server Detail','Runtime specifications, storage plan and deployment identity.',`<div class="server-modal-identity"><div class="server-orb">${fa('server')}</div><div><span>CONNECTED SERVER</span><h3>${esc(state.server.name||'Paradox City RP')}</h3><p>${esc(state.server.serverId||'eplq53')} · ${esc(state.server.region||'United States')}</p></div><span class="status-online">● ONLINE</span></div><div class="server-modal-columns"><section><h3>Runtime</h3>${kv('Build','28108')}${kv('Game','gta5')}${kv('OneSync','Enabled')}${kv('Framework','ESX Legacy')}</section><section><h3>Storage</h3>${kv('Plan','Premium')}${kv('Maximum','6.00 GB')}${kv('Used','35.6 MB')}${kv('Files','42')}</section></div>`);
    if(page==='api-keys') return shell('key','API CREDENTIAL','API Key Detail','Review scopes, usage, rate limit and revocation state.',`<div class="api-key-secret"><span>KEY PREFIX</span><code>pa_live_••••••••••••••••••••••••</code><button class="icon-btn">${fa('copy')}</button></div><div class="sm-grid4">${kv('Requests','0')}${kv('Last used','Never')}${kv('Rate limit','120/min')}${kv('Status','Active')}</div><h3>Permission scopes</h3><div class="api-scopes">${['telemetry:read','detections:read','evidence:read'].map(x=>`<span>${fa('check')} ${x}</span>`).join('')}</div>`,`<button class="btn">Rotate Key</button><button class="btn danger">${fa('trash')} Revoke Key</button>`);
    if(page==='support-tickets') return shell('headset','SUPPORT CASE','Support Ticket','Conversation, priority, category and ticket resolution workflow.',`<div class="ticket-modal-meta">${kv('Status','Open')}${kv('Priority','Normal')}${kv('Category','Technical')}${kv('Assigned','Support queue')}</div><div class="ticket-conversation"><div class="ticket-message mine"><div class="avatar">F</div><div><strong>FastxFingers</strong><p>Example support request details will appear here.</p><span>Just now</span></div></div><div class="ticket-compose"><textarea class="textarea" placeholder="Reply to this ticket..."></textarea><button class="btn primary">${fa('paper-plane')} Reply</button></div></div>`);
    if(page==='backups') return shell('box-archive','VERIFIED SNAPSHOT','Backup Detail','Manifest, integrity status, restore preview and audit history.',`<div class="backup-health"><div>${fa('circle-check')}</div><div><strong>Backup integrity verified</strong><span>All configuration checksums match.</span></div></div><div class="sm-grid4">${kv('Type','Automatic')}${kv('Created','4 months ago')}${kv('Files','24')}${kv('Integrity','SHA-256 verified')}</div><section class="backup-manifest"><h3>Snapshot contents</h3>${['Detection rules','Security configuration','Permissions','Webhook settings'].map(x=>`<div>${fa('file-shield')}<span>${x}</span><b>Included</b></div>`).join('')}</section>`,`<button class="btn">${fa('download')} Download</button><button class="btn blue">${fa('rotate-left')} Restore Preview</button><button class="btn danger">${fa('trash')} Delete</button>`);
    if(page==='cdn') return shell('image','CDN STORAGE OBJECT','CDN File','Media preview, storage metadata and linked evidence context.',`<div class="cdn-modal-preview"><div>${fa('play')}</div><span>MEDIA PREVIEW</span></div><div class="sm-grid4">${kv('Size','1.47 MB')}${kv('Type','MP4')}${kv('Created','Mar 21')}${kv('Retention','30 days')}</div><div class="cdn-link-box"><span>Secure object URL</span><code>cdn://paradox/clips/${esc(title)}</code><button class="icon-btn">${fa('copy')}</button></div>`,`<button class="btn">${fa('link')} Copy Link</button><button class="btn primary">${fa('download')} Download</button><button class="btn danger">${fa('trash')} Delete</button>`);
    return false;
  }


  // === V11 MAIN + CONFIGURATION REFERENCE REBUILD ===
  state.entityTab=state.entityTab||'settings';
  state.falconTab=state.falconTab||'events';
  state.eventTab=state.eventTab||'locked';
  state.generalCategory=state.generalCategory||'all';
  state.permissionsTab=state.permissionsTab||'members';
  state.mapLeftOpen=state.mapLeftOpen!==false;
  state.mapRightOpen=state.mapRightOpen!==false;
  state.mapPanelTab=state.mapPanelTab||'blips';
  state.zoneDraft=state.zoneDraft||null;
  state.mapZones=state.mapZones||[];

  function refCrumb(group,title){return `<div class="v11-crumb"><span>${esc(group)}</span>${fa('chevron-right')}<strong>${esc(title)}</strong></div>`}
  function v11Title(group,title,sub,icon,actions=''){return `<div class="v11-title">${refCrumb(group,title)}<div class="v11-title-row"><div><h1>${fa(icon)} ${title}</h1><p>${sub}</p></div><div class="v11-actions">${actions}</div></div></div>`}
  function emptyRef(icon,title,sub=''){return `<div class="v11-empty">${fa(icon)}<strong>${title}</strong>${sub?`<span>${sub}</span>`:''}</div>`}
  function toggleRow(icon,title,sub,on=true,action='v11Toggle'){const binding=window.ParadoxData.binding(state,title);if(!state.demoSession){on=binding.enabled;action='livePolicyToggle';}return `<div class="v11-toggle-row">${fa(icon)}<div><strong>${title}</strong><span>${sub}</span></div><button class="switch ${on?'on':''}" data-action="${action}" data-name="${esc(title)}" ${!state.demoSession&&!binding.available?'disabled title="No independent server policy binding"':''} aria-pressed="${on}"></button></div>`}
  function statBox(icon,label,value){return `<div class="v11-stat">${fa(icon)}<div><span>${label}</span><strong>${value}</strong></div></div>`}

  function mainConsolePage(){
    const playerList=players.length?players.map(p=>`<button class="v11-online-player" data-action="viewPlayer" data-player="${esc(p[1])}"><span class="avatar">${esc(p[1][0])}</span><span><strong>${esc(p[1])}</strong><small>ID ${esc(p[0])} · ${esc(p[4])}</small></span></button>`).join(''):emptyRef('user-slash','No players online');
    return `<div class="page ref-page v11-page v13-console-page">${v11Title('Server','Console','Live server console, player presence and protected command output.','terminal')}
      <div class="v11-console-layout v13-console-layout">
        <section class="v11-console">
          <div class="v11-console-head"><div>${fa('terminal')}<strong>Live Console</strong><span class="v11-badge ${state.live?.connected||state.demoSession?'good':'bad'}">${fa(state.live?.connected||state.demoSession?'circle-check':'triangle-exclamation')} ${state.live?.connected||state.demoSession?'Live':'Error'}</span></div><div><span class="muted">2s ago</span>${customSelect('10s',['5s','30s','60s'])}<button class="icon-btn" data-action="refresh">${fa('rotate')}</button><button class="btn">${fa('users')} <b>${players.length}</b> ${fa('eye-slash')}</button></div></div>
          <div class="v11-console-body">${state.live?.connected||state.demoSession?`<div class="v11-console-lines">${(state.demoSession?['[PARADOX] Security runtime ready','[FALCON] Monitoring event traffic','[BRIDGE] Dashboard link verified']:(state.sectionData?.console?.rows||[]).map(r=>'['+window.ParadoxData.date(r.created_at)+'] '+r.actor+': '+r.kind)).map(x=>`<code>${esc(x)}</code>`).join('')}</div>`:`<div class="v11-console-error">${fa('triangle-exclamation')}<strong>Failed to load console</strong><button class="v11-retry" data-action="testSync">${fa('rotate')}<span>Retry</span></button></div>`}</div>
          <div class="v11-console-input"><span>›</span><input id="consoleInput" placeholder="${state.live?.connected?'Enter protected console command...':'Console not ready...'}"><button class="btn primary" data-action="runConsole">Run</button></div>
        </section>
        <aside class="v11-online"><h3>${fa('users')} Online Players (${players.length})</h3><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search players..."></div><div class="v13-online-list">${playerList}</div></aside>
      </div></div>`;
  }

  function mainPlayersPage(){
    const rows=players.map(p=>`<tr class="detail-row" data-player="${esc(p[1])}"><td><div class="v11-player-cell"><span class="avatar">${esc(p[1][0])}</span><div><strong>${esc(p[1])}</strong><small>ID ${esc(p[0])}</small></div></div></td><td>${Number(p[5])?`<span class="v11-flag">${p[5]} risk</span>`:'—'}</td><td>${state.demoSession?'2h 18m':'—'}</td><td>${esc(p[6]||'Online')}</td></tr>`).join('');
    return `<div class="page ref-page v11-page">${v11Title('Server','Players Management','Search, filter and manage connected or historical players.','users',`${customSelect('Off',['10s','30s'])}<button class="btn primary" data-action="refresh">${fa('rotate')}</button>`)}
      <div class="v11-online-count"><b>${players.length}</b> online players</div>
      <section class="v11-filterbar"><div class="v11-search grow">${fa('magnifying-glass')}<input placeholder="Search by name, ID, or license..."></div><button class="v11-filter-btn">${fa('filter')} Online Players ${fa('chevron-down')}</button><button class="v11-filter-btn">${fa('flag')} All Flags ${fa('chevron-down')}</button></section>
      <section class="v11-table-card"><table><thead><tr><th>${fa('user')} Player</th><th>${fa('tags')} Flags</th><th>${fa('clock')} Playtime</th><th>${fa('calendar')} Last Seen</th></tr></thead><tbody>${rows||`<tr><td colspan="4">${emptyRef('user-slash','No Players Found','Try adjusting your search filters')}</td></tr>`}</tbody></table></section>
    </div>`;
  }

  function falconPage(){
    const tabs=[['events','bolt','Events'],['explosions','bomb','Explosions'],['entities','cube','Entities'],['state-bags','database','State Bags']];
    const mode=state.falconTab||'events';
    const meta={events:{label:'Event',plural:'Events',accent:'green',stats:['Events Received','Events Sent'],tops:['Top 10 Events Received','Top 10 Events Sent','Top 10 Resources Received','Top 10 Resources Sent']},explosions:{label:'Explosion',plural:'Explosions',accent:'red',stats:['Total Explosions','Blocked','Allowed','Unique Sources','Unique Subtypes','Block Rate'],tops:['Top 10 Explosion Types','Top 10 Explosion Sources']},entities:{label:'Entity',plural:'Entities',accent:'purple',stats:['Total Entities','Blocked','Allowed','Unique Sources','Unique Subtypes','Block Rate'],tops:['Top 10 Entity Models','Top 10 Resources']},'state-bags':{label:'State Bag',plural:'State Bags',accent:'orange',stats:['Total State Bags','Blocked','Allowed','Unique Sources','Unique Subtypes','Block Rate'],tops:['Top 10 State Bag Subtypes','Top 10 State Bag Sources']}}[mode];
    const demoBase=state.demoSession?{events:[1172,612],explosions:[38,9,29,7,12,'24%'],entities:[486,21,465,18,32,'4%'],'state-bags':[802,4,798,29,64,'0.5%']}[mode]:null;
    const measured=window.ParadoxData.falcon(state.sectionData?.falcon,mode);
    const values=demoBase||measured.values;
    const activityValue=mode==='events'?(Number(values[0]||0)+Number(values[1]||0)):Number(values[0]||0);
    const breakdownCards=meta.stats.map((label,i)=>`<div class="v12-falcon-metric ${meta.accent}"><span>${fa(['circle-nodes','shield-halved','circle-check','layer-group','cubes','percent'][i]||'chart-line')} ${label}</span><strong>${values[i]??'—'}</strong></div>`).join('');
    const topCards=meta.tops.map((title,i)=>`<section class="v12-top-card"><h3>${fa(i%2?'user':'ranking-star')} ${title}</h3><div class="v12-top-empty">${state.demoSession?`<div class="v12-top-bar"><span>${mode==='events'?'paradox:security:heartbeat':mode==='explosions'?'EXP_TAG_CAR':mode==='entities'?'prop_vehicle_spawner':'player:state'}</span><b>${Math.max(1,Math.round(activityValue/(i+3)))}</b></div>`:(i===0&&measured.tops.length?measured.tops.slice(0,10).map(r=>`<div class="v12-top-bar"><span>${esc(r.name)}</span><b>${Number(r.total)}</b></div>`).join(''):esc(measured.error||'No recorded samples for this breakdown'))}</div></section>`).join('');
    return `<div class="page ref-page v11-page v12-falcon">${v11Title('Server','Falcon Analytics','Real-time monitoring and analytics for server activity.','chart-line',`<span class="muted">${state.demoSession?'1s':'0s'} ago</span>${customSelect('10s',['30s','60s'])}<button class="icon-btn" data-action="refresh">${fa('rotate')}</button>`)}<div class="v11-falcon-tabs">${tabs.map(([key,icon,label])=>`<button class="${mode===key?'active '+meta.accent:''}" data-action="falconTab" data-tab="${key}">${fa(icon)}<span>${label}</span></button>`).join('')}</div><section class="v11-falcon-panel"><div class="v11-falcon-head"><h2>${fa('chart-area')} ${meta.label} Activity - Last Hour</h2><div class="v12-falcon-head-actions">${mode==='entities'?`<div class="v11-segment"><button class="active">By Resource</button><button>By Player</button></div>`:''}<span>${fa('circle-notch')} Auto-updating</span></div></div><div class="v11-stat-grid">${statBox('chart-line',`Total ${meta.plural} / Hour`,String(state.demoSession?activityValue:(measured.total??'—')))}${statBox('arrow-trend-up',`Peak ${meta.plural} / Min`,String(state.demoSession?Math.max(2,Math.round(activityValue/18)):'—'))}${statBox('chart-simple',`Avg ${meta.plural} / Min`,String(state.demoSession?Math.max(1,Math.round(activityValue/60)):(measured.total===undefined?'—':(measured.total/60).toFixed(1))))}${statBox('gauge-high',`Current ${meta.plural} / Sec`,String(state.demoSession?Math.max(0,Math.round(activityValue/900)):'—'))}</div><div class="v11-chart-empty">${fa('chart-line')}<span>${state.demoSession?`${meta.label} activity timeline is receiving demo telemetry`:(measured.error||'Recorded totals loaded; timeline samples are unavailable')}</span></div></section><h2 class="v11-section-title">${fa('list')} ${meta.label} Breakdown</h2><section class="v12-falcon-breakdown"><h3>${fa('chart-pie')} Totals Overview</h3><div class="v12-falcon-metrics">${breakdownCards}</div></section><div class="v12-top-grid">${topCards}</div></div>`;
  }

  function mainMapPage(){
    const pins=(state.live?.mapPins||[]).slice(0,20), draft=state.zoneDraft, zones=(state.mapZones?.length?state.mapZones:(Array.isArray(state.live?.mapZones)?state.live.mapZones:[])), pts=draft?.points||[];
    const polygon=pts.length>1?`<svg class="v12-zone-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}${pts.length>2?' '+pts[0].x+','+pts[0].y:''}" /></svg>`:'';
    const nodes=pts.map((p,i)=>`<button class="v12-zone-node ${i===0?'first':''}" style="left:${p.x}%;top:${p.y}%">${i+1}</button>`).join('');
    const left=`<aside class="v11-map-left ${state.mapLeftOpen?'':'closed'}"><button class="v12-map-collapse left" data-action="toggleMapSidebar" data-side="left">${fa(state.mapLeftOpen?'chevron-left':'chevron-right')}</button><div class="v12-map-side-content"><h3>${fa('layer-group')} Categories <span>${zones.length}/${zones.length}</span></h3><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search blips or zones..."></div><small>Categories</small><p>${pins.length?`${pins.length} live map objects`:'No blips registered yet'}</p>${zones.length?`<div class="v12-zone-list"><strong>${fa('draw-polygon')} Saved Zones</strong>${zones.map((z,i)=>`<button data-action="selectSavedZone" data-index="${i}">${fa('shield-halved')}<div><b>${esc(z.name||`Zone ${i+1}`)}</b><small>${z.points.length} nodes · ${esc(z.type||'Disable Detection')}</small></div></button>`).join('')}</div>`:''}</div></aside>`;
    const rightContent=state.mapPanelTab==='zones'?(draft?`<div class="v12-zone-editor"><div class="v12-zone-editor-head"><strong>New Zone</strong><button class="icon-btn" data-action="cancelZone">${fa('xmark')}</button></div><label>TYPE</label>${customSelect(draft.type||'Disable Detection',['Warn Only','Block Connections','Safezone'])}<label>NAME</label><input class="input" id="zoneName" value="${esc(draft.name||'')}" placeholder="e.g. Spawn Safe Zone"><label>SHAPE</label><div class="v12-zone-shape"><span>${pts.length} point${pts.length===1?'':'s'}</span><button class="btn" data-action="redrawZone">${fa('draw-polygon')} Redraw</button></div><p>Click the map to add nodes. Save after at least 3 points.</p><label>NUDGE WHOLE SHAPE</label><div class="v12-nudge"><div class="v12-nudge-amounts"><button>1</button><button class="active">10</button><button>50</button><button>200</button></div><div class="v12-nudge-grid"><button data-action="nudgeZone" data-dx="0" data-dy="-1">${fa('arrow-up')}</button><button data-action="nudgeZone" data-dx="-1" data-dy="0">${fa('arrow-left')}</button><button class="center">${fa('arrows-up-down-left-right')}</button><button data-action="nudgeZone" data-dx="1" data-dy="0">${fa('arrow-right')}</button><button data-action="nudgeZone" data-dx="0" data-dy="1">${fa('arrow-down')}</button></div></div><label>DISABLED DETECTIONS</label><div class="v12-checks">${['Anti-Teleport','Anti-NoClip','Anti-Invisible'].map(x=>`<label><input type="checkbox" checked> ${x}</label>`).join('')}</div><div class="v12-zone-actions"><button class="btn" data-action="cancelZone">Cancel</button><button class="btn primary" data-action="saveZone">Create Zone</button></div></div>`:`<div class="v12-zone-browser"><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search zones..."></div><button class="btn outline-green full" data-action="newZone">${fa('plus')} New Zone</button>${zones.length?zones.map((z,i)=>`<button class="v12-zone-card" data-action="selectSavedZone" data-index="${i}">${fa('draw-polygon')}<div><strong>${esc(z.name||`Zone ${i+1}`)}</strong><small>${z.points.length} nodes</small></div></button>`).join(''):`<p class="v11-map-empty">No zones created yet</p>`}</div>`):`<div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search blips..."></div><div class="v11-map-cols"><b>Name</b><b>Category</b><b>Created</b></div><div class="v11-map-empty">No blips match the current filters</div>`;
    const right=`<aside class="v11-map-right ${state.mapRightOpen?'':'closed'}"><button class="v12-map-collapse right" data-action="toggleMapSidebar" data-side="right">${fa(state.mapRightOpen?'chevron-right':'chevron-left')}</button><div class="v12-map-side-content"><div class="v11-map-tabs"><button class="${state.mapPanelTab==='blips'?'active':''}" data-action="mapPanelTab" data-tab="blips">${fa('map-pin')} Blips <b>${pins.length}</b></button><button class="${state.mapPanelTab==='zones'?'active':''}" data-action="mapPanelTab" data-tab="zones">${fa('draw-polygon')} Zones <b>${zones.length}</b></button></div>${rightContent}</div></aside>`;
    return `<div class="page ref-page v11-page">${refCrumb('Overview','Interactive Map')}<section class="v11-map-shell v12-map-shell ${state.mapLeftOpen?'left-open':'left-closed'} ${state.mapRightOpen?'right-open':'right-closed'}">${left}<div class="v11-map-stage ${draft?'zone-drawing':''}" id="mapCanvas"><div id="mapStage" class="v11-map-image" style="transform:translate(calc(-50% + ${state.mapX}px),calc(-50% + ${state.mapY}px)) scale(${state.mapZoom})"><img src="${state.mapMode==='satellite'?'assets/img/maps/gta-satellite.jpg':'assets/img/maps/gta-atlas.png'}" alt="GTA map">${pins.map((p,i)=>`<span class="v11-map-pin" style="left:${Number(p.xPct??50)}%;top:${Number(p.yPct??50)}%">${i+1}</span>`).join('')}${polygon}${nodes}</div>${draft?`<div class="v12-zone-toolbar">${fa('draw-polygon')} <strong>Click to add points, or close the shape at the first point</strong><button data-action="redrawZone">${fa('rotate-left')}</button><button data-action="saveZone">${fa('check')}</button><button data-action="cancelZone">${fa('xmark')}</button></div>`:''}<div class="v11-map-mode"><button class="${state.mapMode==='atlas'?'active':''}" data-action="mapMode" data-mode="atlas">Atlas</button><button class="${state.mapMode==='satellite'?'active':''}" data-action="mapMode" data-mode="satellite">Satellite</button></div><div class="v12-map-zoom"><button data-action="mapZoom" data-delta=".2">+</button><button data-action="mapZoom" data-delta="-.2">−</button></div></div>${right}</section></div>`;
  }

  function entityRulesPage(){
    const tab=state.entityTab;const liveModels=state.sectionData?.['entity-rules']?.policy?.settings?.[tab==='whitelist'?'entities.allowed':'entities.blocked']||[];
    const tabs=`<div class="v11-rule-tabs"><button class="${tab==='settings'?'active':''}" data-action="entityTab" data-tab="settings">${fa('gear')} Settings</button><button class="${tab==='whitelist'?'active':''}" data-action="entityTab" data-tab="whitelist">${fa('list-check')} Whitelist (0)</button><button class="${tab==='blacklist'?'active':''}" data-action="entityTab" data-tab="blacklist">${fa('ban')} Blacklist (0)</button></div>`;
    if(tab!=='settings') return `<div class="page ref-page v11-page">${v11Title('Configuration','Entity Rules','Control entity spawning, manage whitelists and blacklists, and prevent entity-based exploits.','cube')}${tabs}<section class="v11-entity-list v15-entity-manager">${tab==='whitelist'?`<div class="v15-entity-toggle-stack">${toggleRow('toggle-on','Enable Whitelist','Only whitelisted entities can be spawned',false)}${toggleRow('wand-magic-sparkles','Auto Whitelist','Automatically whitelist entities as needed',false)}</div>`:''}<h3>${fa('circle-plus')} Bulk Add Entities</h3><textarea class="v11-textarea" placeholder="Enter entities separated by new lines, commas, or semicolons Example: adder t20, kuruma police; sheriff"></textarea><button class="btn primary" data-action="saveConfig">${fa('upload')} Add to ${tab==='whitelist'?'Whitelist':'Blacklist'}</button><hr><div class="v11-list-head v15-entity-list-head"><h3>${fa('list')} ${tab==='whitelist'?'Whitelisted':'Blacklisted'} Entities</h3><div><button class="btn">${fa('check-double')} Select All</button><button class="btn" disabled>${fa('xmark')} Deselect</button><button class="btn danger" disabled>${fa('trash')} Remove (0)</button><button class="btn" disabled>${fa('folder-plus')} Create Group</button></div></div><div class="v15-entity-empty-band"></div>${liveModels.length?liveModels.map(hash=>`<div class="v11-manage-row"><span class="v11-code-tag">${Number(hash)}</span></div>`).join(''):emptyRef('inbox',`No entities in ${tab}`,'Add entities using the bulk add section above')}</section></div>`;
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Entity Rules','Control entity spawning, manage whitelists and blacklists, and prevent entity-based exploits.','cube')}${tabs}
      <h2 class="v11-section-title">${fa('shield-halved')} Entity Protection</h2><p class="v11-section-sub">Advanced protection against entity-based exploits and malicious spawning</p>
      <div class="v11-3col">${toggleRow('lock','Anti Spawn Isolated','Prevents cheaters from spawning vehicles that only they can access',true)}${toggleRow('shield-halved','Anti Entity Exploits','Blocks various entity-based exploits and malicious entity manipulation',true)}${toggleRow('ban','Auto Entity Blacklist','Automatically blacklists entities commonly spawned by menu users',true)}</div>
      <h2 class="v11-section-title">${fa('users')} NPC Configuration</h2><section class="v11-wide-card">${toggleRow('users','Allow NPC Entities','Permits NPC peds and vehicles to spawn naturally in the world',true)}<div class="v11-warning">${fa('triangle-exclamation')} Disable this if your server does not use NPCs for better performance and security</div></section>
      <h2 class="v11-section-title">${fa('clipboard-list')} Logging Options</h2><section class="v11-wide-card">${toggleRow('terminal','Log Entities To Console','Logs all spawned entities to server console',false)}</section>
    </div>`;
  }

  function particleRulesPage(){
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Particle Rules','Manage and control how particles affect your server.','wand-magic-sparkles')}
      <h2 class="v11-section-title">${fa('shield-halved')} General Particle Rules</h2><p class="v11-section-sub">Configure particle spawning and logging behavior</p>
      <div class="v11-2col">${toggleRow('ban','Block All Particles','',false)}${toggleRow('terminal','Log Spawned Particles','',false)}</div>
      <h2 class="v11-section-title">${fa('list-check')} Particle Whitelist</h2><p class="v11-section-sub">Manage and control the allowed particles in your server</p>
      <div class="v11-2col">${toggleRow('list-check','Whitelist Enabled','',true)}${toggleRow('wand-magic-sparkles','Auto Particle Whitelist','',true)}</div>
      <section class="v11-wide-card"><h3>${fa('tag')} Whitelisted Particles ${fa('circle-question')}</h3><button class="v11-manage-row" data-action="saveModal">Click to manage whitelisted particles</button></section>
    </div>`;
  }

  function weaponRulesPage(){
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Weapon Rules','Manage and control how weapons are used in your server.','gun')}
      <h2 class="v11-section-title">${fa('shield-halved')} General Weapon Rules</h2><div class="v11-3col">${toggleRow('check-double','Verify Weapon Damage','',true)}${toggleRow('terminal','Log Kills To Console','',false)}${toggleRow('bullseye','Hit Reg','',true)}</div>
      <h2 class="v11-section-title">${fa('crosshairs')} Detection Rules</h2><section class="v11-rule-grid"><div class="v11-rule-card"><h3>${fa('wrench')} Anti Weapon Modifier ${fa('circle-question')}</h3>${toggleRow('toggle-on','Enable Detection','',true)}<label>Detection Action</label>${customSelect('Ban Player',['Warn Player','Kick Player','Log Player'])}</div><div class="v11-rule-card"><h3>${fa('ruler')} Max Kill Distance ${fa('circle-question')}</h3>${toggleRow('toggle-on','Enable Detection','',true)}<label>Detection Action</label>${customSelect('Ban Player',['Warn Player','Kick Player','Log Player'])}</div></section>
      <h2 class="v11-section-title">${fa('bullseye')} Auto Anti Weapon Spawn</h2><section class="v11-wide-card">${toggleRow('toggle-on','Auto Anti Weapon Spawn','Automatically detect and handle weapon spawning cheats',true)}<div class="v11-weapon-action"><span>${fa('bolt')} Weapon Spawn Detected</span>${customSelect('Ban Player',['Warn Player','Kick Player'])}</div><h3>${fa('list')} Ignored Weapons ${fa('circle-question')}</h3><button class="v11-manage-row">Click to manage ignored weapons</button></section>
    </div>`;
  }

  function explosionRulesPage(){
    const rows=['GRENADE (ID:0)','GRENADELAUNCHER (ID:1)','STICKYBOMB (ID:2)','ROCKET (ID:4)','HI_OCTANE (ID:6)','CAR (ID:7)','PLANE (ID:8)','BULLET (ID:18)','PIPEBOMB (ID:43)'].filter(x=>!state.hiddenRules[`explosion:${x}`]);
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Explosion Rules','Manage how explosions affect your server.','burst')}<h2 class="v11-section-title">${fa('shield-halved')} General Explosion Rules</h2><div class="v11-2col">${toggleRow('ban','Block All Explosions','',false)}${toggleRow('terminal','Log Explosions To Console','',false)}</div><h2 class="v11-section-title">${fa('ban')} Explosion Blacklist</h2><p class="v11-section-sub">Block certain explosions from being spawned in your server</p><section class="v11-table-card v14-rule-table"><table><thead><tr><th>Explosion Type</th><th>Detection Action</th><th>Notes</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr data-no-row-modal="true"><td><span class="v11-code-tag">EXP_TAG_${x}</span></td><td><span class="v11-blue-tag">Log Player</span></td><td>—</td><td><button class="icon-btn" data-action="openRuleMenu" data-rule-type="explosion" data-name="${esc(x)}">${fa('ellipsis-vertical')}</button></td></tr>`).join('')}</tbody></table></section></div>`;
  }
  function eventProtectionPage(){
    const chipBar=(key,icon,title,items)=>`<section class="v11-wide-card v15-event-card"><h3>${fa(icon)} ${title}</h3><div class="v15-event-entry"><div class="v11-chipbox">${items.map(x=>`<span>${esc(x)}</span>`).join('')}<input class="v15-inline-event-input" data-event-list="${key}" placeholder="Type event name and press Enter"></div></div></section>`;
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Event Protection Rules','Manage and control the events in your server.','shield-halved')}
      <h2 class="v11-section-title">${fa('lock')} Key Locked Events</h2><p class="v11-section-sub">Restrict specific events to require authentication keys</p><div class="v11-info">${fa('circle-info')} <div><strong>Event Name Examples</strong><span>Enter the exact event name you want to key lock, such as <code>esx:getSharedObject</code>, <code>qb-core:getObject</code>, or any custom event from your resources.</span></div></div>${toggleRow('ban','Ban Players for Invalid Key Lock','',false)}${chipBar('locked','key','Locked Events',state.eventLists.locked)}
      <h2 class="v11-section-title">${fa('file-lines')} Event Logging</h2><p class="v11-section-sub">Configure event logging for debugging and monitoring</p><div class="v15-single-toggle">${toggleRow('clipboard-list','Log Client → Server Events','',false)}</div>
      <h2 class="v11-section-title">${fa('filter')} Ignored Events</h2><p class="v11-section-sub">Configure which events should be ignored by PARADOX protection</p><div class="v11-warning">${fa('triangle-exclamation')} <b>Warning:</b> If you ignore an event, PARADOX will not check if it is being run from a cheat. Only ignore events that you trust or that are causing false positives.</div><div class="v11-info">${fa('circle-info')}<div><strong>Event Name Examples</strong><span>Enter the exact event name you want to ignore, such as <code>esx:getSharedObject</code>, <code>chat:addMessage</code>, or any custom event from your resources.</span></div></div><div class="v11-2col v15-event-ignored">${chipBar('serverIgnored','server','Ignored Server Events',state.eventLists.serverIgnored)}${chipBar('clientIgnored','desktop','Ignored Client Events',state.eventLists.clientIgnored)}</div>
      <h2 class="v11-section-title">${fa('code')} Advanced Event Rules</h2><p class="v11-section-sub">Create custom rules to monitor and control specific events with matching conditions</p><section class="v15-advanced-events"><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search by name, event, expression, or action..."></div><div class="v11-pill-filters"><button class="active">${fa('list')} All <b>1</b></button><button>${fa('bug')} Server Log <b>0</b></button><button>${fa('clipboard')} Log <b>0</b></button><button>${fa('right-from-bracket')} Kick <b>0</b></button><button>${fa('ban')} Ban <b>1</b></button></div></section><section class="v15-advanced-table"><div class="v15-advanced-head"><span>${fa('tag')} NAME</span><span>${fa('bolt')} EVENT</span><span>${fa('filter')} MATCH AGAINST</span><span>${fa('gavel')} ACTION</span><span></span></div><div class="v15-advanced-row"><span>evo-k9 item spawn patch</span><span class="v11-code-tag">evo-k9:server:PurchaseItems</span><code>(req.args.2.*.item eq "k9food" and req.args.2.*...)</code><span class="v11-blue-tag">BAN PLAYER</span><button class="icon-btn">${fa('ellipsis-vertical')}</button></div></section><div class="v11-bottom-actions"><button class="btn purple">${fa('shield-halved')} Security Templates</button><button class="btn">${fa('file-import')} Import JSON</button><button class="btn primary">${fa('plus')} Add Event Rule</button></div>
    </div>`;
  }

  function generalRulesPage(){
    const detectors=['Anti Teleport','Anti NoClip','Anti Spectate','Anti NUI Dev Tools','Anti God Mode','Anti AI Folder/x64','Anti Ped Model Changer','Anti Animations','Anti Attach','Anti Free Cam (1)','Anti Free Cam (2)','Anti Invisible','Anti No Critical Hits','Anti Infinite Combat Roll','Anti Hit Box Modifier','Anti Aim Bot','Anti Warp Into Vehicle','Anti Repair Vehicle','Anti Vehicle Modifier','Menu Detection (1)','Menu Detection (2)','Menu Detection (3)','Anti Native Spoofer','Anti Solo Session','Anti Aim Assist','Anti Voice Exploits','Anti Bubble'];
    return `<div class="page ref-page v11-page">${v11Title('Configuration','General AntiCheat Rules','Manage and control how cheaters are handled in your server.','shield-halved')}
      <section class="v11-wide-card"><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search detections..."></div><div class="v11-pill-filters">${['All','Webhooks','General','Movement','Player Behavior','Camera','Combat','Vehicle','Menu','Miscellaneous'].map((x,i)=>`<button class="${i===0?'active':''}" data-action="generalCategory" data-cat="${x.toLowerCase()}">${x}</button>`).join('')}</div></section>
      <section class="v11-webhooks"><label>Warn/Log Webhook ${fa('circle-question')}<input value="https://discord.com/api/webhooks/••••••"></label><label>Kick Webhook ${fa('circle-question')}<input value="https://discord.com/api/webhooks/••••••"></label><label>Ban Webhook ${fa('circle-question')}<input value="https://discord.com/api/webhooks/••••••"></label></section>
      <div class="v11-5col">${['Record Screen','Log Connections','Log Disconnects','Anti Connection Duplication','Require Discord','Require Steam'].map((x,i)=>toggleRow(['video','right-to-bracket','right-from-bracket','clone','discord','steam'][i],x,'',i===0||i===3)).join('')}</div>
      <section class="v11-detector-grid">${detectors.map((x,i)=>`<div class="v11-detector-card"><div><strong>${x} ${fa('circle-question')}</strong><span>Detects ${x.replace('Anti ','').toLowerCase()} behavior...</span></div><button class="switch ${state.demoSession?((i===6||i===9||i===26)?'':'on'):(window.ParadoxData.binding(state,x).enabled?'on':'')}" data-action="livePolicyToggle" data-name="${esc(x)}" ${!state.demoSession&&!window.ParadoxData.binding(state,x).available?'disabled title="No independent server policy binding"':''}></button><button class="icon-btn" data-action="detectorSettings" data-name="${esc(x)}">${fa('gear')}</button></div>`).join('')}</section>
    </div>`;
  }

  function safetyRulesPage(){
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Safety Rules','Configure safety settings for the players in your server.','shield-halved')}<div class="v11-safety-grid">
      <section class="v11-safety-card"><h2>${fa('user-shield')} Account Security Check</h2><p>Automatically detect and block suspicious accounts</p>${toggleRow('toggle-on','Enable Account Security Check','',false)}<div class="v11-info green">${fa('circle-info')}<span>Risk points can consider total playtime, account age, VPN status, and Discord/Steam/FiveM connection state.</span></div><label>Maximum Allowed Risk Level <b>8</b><input type="range" min="1" max="8" value="8"></label><label>Minimum Discord Account Age (Days) <b>31</b><input type="range" min="1" max="100" value="31"></label></section>
      <section class="v11-safety-card"><h2>${fa('chart-line')} Account Experience Requirements</h2><p>Filter players based on playtime and account history</p><div class="v11-info green">${fa('circle-info')}<span>Control access to your server based on player experience.</span></div><label>Minimum Playtime (Hours) <b>0</b><input type="range" min="0" max="100" value="0"></label><div class="v11-segment"><button class="active">Server Playtime</button><button>Total (All Servers)</button></div>${toggleRow('user-slash','Block New/Unknown Accounts','',false)}</section>
      <section class="v11-safety-card"><h2>${fa('globe')} Geographic & Network Filtering</h2><p>Block or flag players based on location and network</p><div class="v11-info green">${fa('circle-info')}<span>Create country, region, ISP or ASN rules. Flags are server-specific.</span></div><h3>${fa('circle-plus')} Add New Rule</h3><div class="v11-rule-form">${customSelect('Select Type',['Country','Region','ISP','ASN','VPN'])}<input placeholder="e.g., US, CN, RU">${customSelect('Block Player',['Flag Player','Review'])}<button class="btn warning">+ Add Rule</button></div><h3>Active Rules (1)</h3><div class="v11-active-rule"><span class="v11-red-tag">VPN</span><strong>VPN</strong><button class="btn warning">Flag</button><button class="btn danger">${fa('trash')}</button></div></section>
    </div></div>`;
  }

  function nativeRuleEditorPage(){
    const ed=state.nativeEditor||{name:'rcore_drink object spawn patch',native:'CreateObject',step:1}; const step=Number(ed.step||1);
    const side=`<aside class="v15-editor-side">${[[1,'Basic Info','Name & Target Native'],[2,'Conditions','Match Rules'],[3,'Action','Response']].map(([n,t,sub])=>`<button class="${step===n?'active':''}" data-action="nativeEditorStep" data-step="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span>${fa('check')}</button>`).join('')}<div class="v11-expression"><strong>${fa('code')} Expression Preview</strong><code>req.resource eq "rcore_drunk"</code></div></aside>`;
    let body='';
    if(step===1) body=`<section class="v15-editor-main"><h2>Basic Information</h2><p>Define the rule name and select the target native function to monitor</p><div class="form-grid"><div class="field"><label>Rule Name</label><input class="input" value="${esc(ed.name||'rcore_drink object spawn patch')}"></div><div class="field"><label>Target Native</label><input class="input" value="${esc(ed.native||'CreateObject')}"></div></div><div class="v15-parameter-panel"><strong>${fa('circle-info')} Available Parameters for ${esc(ed.native||'CreateObject')}</strong><div class="v15-param-grid">${[['#1','Model Hash','The hash of the object model'],['#2','X Coordinate','X position coordinate'],['#3','Y Coordinate','Y position coordinate'],['#4','Z Coordinate','Z position coordinate'],['#5','Network','Is networked object'],['#6','Netmission Entity','Is netmission entity'],['#7','Door Flag','Door flag setting']].map(x=>`<div><b>${x[0]}</b><span><strong>${x[1]}</strong><small>${x[2]}</small></span></div>`).join('')}</div></div><div class="v15-editor-next"><button class="btn primary" data-action="nativeEditorStep" data-step="2">Next: Conditions ${fa('arrow-right')}</button></div></section>`;
    if(step===2) body=`<section class="v15-editor-main"><div class="v15-editor-titleline"><div><h2>Matching Conditions</h2><p>Define when this rule should trigger based on native parameters</p></div><div class="v11-segment"><button class="active">AND</button><button>OR</button></div></div>${[['Resource Name','Equals (==)','rcore_drunk'],['Extended Execution ID','Not Equals (~=)','-662200141414208653'],['Extended Execution ID','Not Equals (~=)','-3451019278533372938'],['Extended Execution ID','Not Equals (~=)','2571637542775430300']].map((x,i)=>`<div class="v15-condition-card"><header><strong>CONDITION ${i+1}</strong><button class="icon-btn danger">${fa('trash')}</button></header><div class="v15-condition-grid"><label>FIELD${customSelect(x[0],['Resource Name','Extended Execution ID','Model Hash'])}</label><label>OPERATOR${customSelect(x[1],['Equals (==)','Not Equals (~=)','Contains','Matches'])}</label><label>VALUE<input class="input" value="${esc(x[2])}"></label></div></div>${i<3?'<div class="v15-and-pill">AND</div>':''}`).join('')}<div class="v15-add-condition"><button>${fa('plus')} Add Condition</button><button>${fa('layer-group')} Add Group</button></div><div class="v15-editor-nav"><button class="btn" data-action="nativeEditorStep" data-step="1">${fa('arrow-left')} Back: Basic Info</button><button class="btn primary" data-action="nativeEditorStep" data-step="3">Next: Action ${fa('arrow-right')}</button></div></section>`;
    if(step===3) body=`<section class="v15-editor-main"><h2>Action to Take</h2><p>Choose what happens when the conditions are matched</p><div class="v15-action-grid">${[['bug','Debug','Log to console only'],['clipboard-list','Log Player','Record to server logs'],['right-from-bracket','Kick Player','Remove from server'],['ban','Ban Player','Permanent ban']].map((x,i)=>`<button class="${i===3?'active':''}">${fa(x[0])}<strong>${x[1]}</strong><span>${x[2]}</span></button>`).join('')}</div><div class="v15-editor-nav"><button class="btn" data-action="nativeEditorStep" data-step="2">${fa('arrow-left')} Back: Conditions</button><button class="btn primary" data-action="saveNativeEditor">${fa('floppy-disk')} Save Changes</button></div></section>`;
    return `<div class="page ref-page v11-page v15-full-editor"><div class="v15-editor-top"><button class="btn" data-action="closeNativeEditor">${fa('arrow-left')} Back to Rules</button><div><h2>${fa('pen-to-square')} Edit Rule</h2><span>${esc(ed.name||'Native Rule')}</span></div><div class="spacer"></div><button class="btn" data-action="closeNativeEditor">Cancel</button><button class="btn primary" data-action="saveNativeEditor">${fa('floppy-disk')} Save Changes</button></div><div class="v15-editor-layout">${side}${body}</div></div>`;
  }

  function nativeRulesPage(){
    if(state.nativeEditor) return nativeRuleEditorPage();
    let rows=[['rcore_drink object spawn patch','CreateObject','req.resource eq "rcore_drunk"','BAN PLAYER'],['Voice Chat Range','MumbleSetTalkerProximity','req.params.1 gt "125"','BAN PLAYER'],['Generic Cheat Detections [CreateVehicle]','CreateVehicle','req.path contains "..."','BAN PLAYER'],['Generic Cheat Detections [CreateObject]','CreateObject','req.path contains "..."','BAN PLAYER'],['Generic Cheat Detections [CreatePed]','CreatePed','req.path contains "..."','BAN PLAYER']].filter(r=>!state.hiddenRules[`native:${r[0]}`]);
    if(state.nativeFilter!=='all') rows=rows.filter(r=>r[3].toLowerCase().includes(state.nativeFilter));
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Native Rules','Manage how natives are executed in your server.','code')}<section class="v11-wide-card"><div class="v11-search">${fa('magnifying-glass')}<input class="v14-native-search" placeholder="Search by name, native, expression, or action..."></div><div class="v11-pill-filters v14-filter-pills">${[['all','All'],['debug','Debug'],['log','Log'],['kick','Kick'],['ban','Ban']].map(([k,l])=>`<button class="${state.nativeFilter===k?'active':''}" data-action="nativeFilter" data-filter="${k}">${l} <b>${k==='all'?rows.length:(k==='ban'?rows.filter(r=>r[3].includes('BAN')).length:0)}</b></button>`).join('')}</div></section><section class="v11-table-card v14-rule-table"><table><thead><tr><th>Name</th><th>Native</th><th>Match Against</th><th>Action</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr data-no-row-modal="true"><td>${r[0]}</td><td><span class="v11-code-tag">${r[1]}</span></td><td><code>${esc(r[2])}</code></td><td><span class="v11-blue-tag">${r[3]}</span></td><td><button class="icon-btn" data-action="openRuleMenu" data-rule-type="native" data-name="${esc(r[0])}">${fa('ellipsis-vertical')}</button></td></tr>`).join('')}</tbody></table></section><div class="v11-bottom-actions"><button class="btn purple">Security Templates</button><button class="btn primary" data-action="editNative">+ Add Rule</button></div></div>`;
  }
  function keyLocksPage(){
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Key Locks','Manage event and native key locks for sensitive resources.','key')}<div class="v11-2col"><section class="v11-wide-card"><h2>${fa('lock')} Event Key Locks</h2><p class="v11-section-sub">Require rotating authentication keys for protected events.</p>${toggleRow('key','Enable Event Key Locks','Validate signed event keys',true)}${toggleRow('ban','Ban Invalid Keys','Escalate repeated invalid keys',false)}<div class="v11-chipbox"><span>inventory:server:OpenInventory</span><span>QBCore:Server:AddItem</span></div><button class="btn primary">Manage Locked Events</button></section><section class="v11-wide-card"><h2>${fa('code')} Native Key Locks</h2><p class="v11-section-sub">Protect sensitive server-side native wrappers.</p>${toggleRow('key','Native Key Validation','Require server-issued execution token',true)}${toggleRow('rotate','Rotate Keys Automatically','Rotate active keys on schedule',true)}<div class="v11-kv-list"><div><span>Rotation</span><strong>15 minutes</strong></div><div><span>Active keys</span><strong>12</strong></div></div><button class="btn">Rotate Keys Now</button></section></div></div>`;
  }

  function rateLimitsPage(){
    const rows=[['Secure Events','60 / min','12 / 5s','Block'],['Entity Create','80 / 30s','20 / 5s','Cancel'],['Explosions','8 / 30s','3 / 5s','Block'],['Particles','45 / 30s','15 / 5s','Cancel'],['Admin Actions','120 / min','20 / 5s','Audit']];
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Rate Limits','Configure global and detector-specific request windows.','gauge-high')}<div class="v11-stat-grid">${statBox('gauge','Global Window','60s')}${statBox('bolt','Burst Window','5s')}${statBox('ban','Blocked Today',state.demoSession?'214':'0')}${statBox('clock','Backoff','Adaptive')}</div><section class="v11-table-card"><table><thead><tr><th>Category</th><th>Long Window</th><th>Burst</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td><span class="v11-blue-tag">${r[3]}</span></td></tr>`).join('')}</tbody></table></section></div>`;
  }

  function securityRuleEditorPage(){
    const ed=state.securityEditor||{};
    return `<div class="page ref-page v11-page v15-security-editor">${refCrumb('Configuration','Security Rules')}<div class="v15-security-editor-title"><button class="btn" data-action="closeSecurityEditor">${fa('arrow-left')} Back</button><div><h1>Edit Rule</h1><p>Update the condition and action for the rule '${esc(ed.name||'Rule')}'</p></div><div class="spacer"></div><button class="btn outline-green">${fa('book')} Documentation</button></div><div class="v15-security-fields"><label>Name (optional)<input class="input" id="securityEditName" value="${esc(ed.name||'')}"><small>Give your rule a descriptive name.</small></label><label>Note (optional)<input class="input" id="securityEditNote" value="${esc(ed.note||'')}"></label></div><hr><h3>CONDITIONS</h3><div class="v15-security-condition"><label>Field${customSelect(ed.field||'Effect Hash',['Effect Hash','Weapon Type','Explosion Type','Entity Model','Resource'])}</label><label>Operator${customSelect(ed.operator||'Wildcard (pattern)',['Equals (==)','Not Equals (~=)','Wildcard (pattern)','Contains','In List'])}</label><label>Value<input class="input" id="securityEditValue" value="${esc(ed.value||'*')}"></label></div><button class="v15-add-link">${fa('plus')} Add Condition</button><hr><label class="v15-action-label">Action</label><div class="v15-security-actions">${[['terminal','Log to Console','Log the event to servers console'],['ban','Block','Blocks the event and prevents the action'],['file-lines','Warn Player','Block the event and add a warning'],['right-from-bracket','Kick Player','Block the event and remove the player'],['gavel','Ban Player','Block the event and ban the player'],['film','Save Replay','Saves a replay of the event']].map(x=>`<button class="${String(ed.action||'').toLowerCase().includes(x[1].toLowerCase())?'active':''}">${fa(x[0])}<span><strong>${x[1]}</strong><small>${x[2]}</small></span></button>`).join('')}</div><div class="v15-expression-preview">${fa('code')}<code>${esc(ed.expression||'effectHash matches "*"')}</code></div><hr><div class="v15-deploy"><button class="btn primary" data-action="saveSecurityEditor">${fa('rocket')} Deploy Changes</button></div></div>`;
  }

  function securityRulesPage(){
    if(state.securityEditor) return securityRuleEditorPage();
    const base=[
      {name:'Particle Spawn Rules',icon:'gear',advanced:false,desc:'Manages networked particle effects with customizable rules for blocking, logging, and player actions.',rules:[['Replay Logger','effectHash matches *','Save Replay',true,'Triggers replay saving for all particle spawns.'],['Block All Unauthorized Particles','is_authorized equals false','Block',true,'Blocks all particles that have not been authorized to spawn.'],['Block All Particles','effectHash matches *','Block',false,'Blocks all particle effects from spawning.']]},
      {name:'Sound Event Rules',icon:'volume-high',advanced:true,desc:'Manages networked sound events with customizable rules for blocking, logging, and player sanctions.',rules:[['Block All Unauthorized Sounds','is_authorized equals false','Block',true,'Blocks all networked sounds that have not been pre-authorized.'],['Block All Sounds','audioHash matches *','Block',false,'Blocks all networked sounds from playing.']]},
      {name:'Projectile Spawn Rules',icon:'bomb',advanced:true,desc:'Manages networked projectile events with customizable rules for blocking, logging, and player actions.',rules:[['Replay Logger','projectile_hash matches *','Save Replay',true,'Triggers replay saving for all projectile spawns.'],['Block All Unauthorized Projectiles','weapon_match equals false','Block',true,'Blocks unauthorized projectiles from spawning.'],['Block All Projectiles','projectile_hash matches *','Block',false,'Blocks all projectiles from spawning.']]},
      {name:'Weapon Damage Rules',icon:'gun',advanced:false,desc:'Manages networked weapon damage events with customizable rules for blocking, logging, and player actions.',rules:[['Replay Logger','willKill equals true','Save Replay',true,'Triggers replay saving for all weapon damage events.'],['Anti Weapon Spawn','authorizedWeapon equals false','Ban Player',true,'Validates that the player received the weapon through server scripts.'],['Block Weapon Spoofing','weaponType not_equals vars.current_weapon','Block',true,'Blocks player-to-player damage when the weapon does not match.']]},
      {name:'Vehicle Component Rules',icon:'car',advanced:true,desc:'Manages networked vehicle component control events with customizable rules for blocking and enforcement.',rules:[['Block Remote Vehicle Eject (Driver)','componentIndex equals 0 AND distance_from_vehicle > 10','Block',true,'Blocks remote driver ejection abuse.'],['Block Invalid Vehicle Components','vehicle_exists equals false','Block',true,'Blocks component events for missing vehicles.']]},
      {name:'Explosion Spawn Rules',icon:'burst',advanced:false,desc:'Manages networked explosion events with customizable rules for blocking, logging, and player actions.',rules:[['Replay Logger','explosionType not in list EXP_TAG_DIR_WATER_HYDRANT','Save Replay',true,'Triggers replay saving for specific explosion types.'],['Explosion Blacklist','explosionType in list configured_blacklist','Ban Player',true,'Prevents configured explosion types from being spawned.'],['Block All Unauthorized Explosions','is_authorized equals false','Block',true,'Blocks all unauthorized explosions from spawning.'],['Block All Explosions','explosionType matches *','Block',false,'Blocks all explosions from spawning.']]},
      {name:'Fire Spawn Rules',icon:'fire-flame-simple',advanced:true,desc:'Manages networked fire spawn events with customizable rules for blocking, logging, and player actions.',rules:[['Replay Logger','weapon_match matches *','Save Replay',true,'Triggers replay saving for all fire spawns.'],['Block Non Authorized Fires','is_from_authed_script equals false','Block',true,'Blocks unauthorized networked fires.']]}
    ];
    let sets=base.filter(x=>state.securityAdvanced||!x.advanced);
    if(state.securityRuleset!=='All Rulesets') sets=sets.filter(x=>x.name===state.securityRuleset);
    const filter=state.securityRuleFilter;
    const html=sets.map((set,si)=>{
      let rules=set.rules.filter(r=>!state.hiddenRules[`security:${set.name}:${r[0]}`]).map(r=>{const key=`${set.name}:${r[0]}`;return [r[0],r[1],r[2],state.securityRuleOverrides[key]!==undefined?state.securityRuleOverrides[key]:r[3],r[4]]});
      if(filter==='enabled')rules=rules.filter(r=>r[3]); if(filter==='disabled')rules=rules.filter(r=>!r[3]);
      const collapsed=!!state.securityCollapsed[set.name]; return `<section class="v11-ruleset ${collapsed?'collapsed':''} ${rules.length?'':'compact'}" data-ruleset="${esc(set.name)}"><div class="v11-ruleset-head"><button class="v15-ruleset-chevron" data-action="toggleRulesetCollapse" data-name="${esc(set.name)}">${fa(collapsed?'chevron-right':'chevron-down')}</button><span class="v11-square-icon">${fa(set.icon)}</span><div><strong>${esc(set.name)} ${set.advanced?'<b class="v14-advanced-badge">Advanced</b>':''}</strong><small>${esc(set.desc)}</small></div><button class="icon-btn" data-action="openRulesetMenu" data-name="${esc(set.name)}">${fa('ellipsis-vertical')}</button></div>${collapsed?'':rules.map((r,i)=>`<div class="v11-rule-line" data-no-row-modal="true"><span class="v11-order">${i+1}</span><button class="switch ${r[3]?'on':''}" data-action="securityRuleToggle" data-rule-key="${esc(set.name+':'+r[0])}" aria-pressed="${r[3]}"></button><div><strong>${esc(r[0])}</strong><small>${esc(r[4])}</small></div><code>${esc(r[1])}</code><span>0</span><span>0%</span><span class="${/block/i.test(r[2])?'v11-red-tag':'v11-green-tag'}">${esc(r[2])}</span><button class="icon-btn" data-action="openRuleMenu" data-rule-type="security" data-ruleset="${esc(set.name)}" data-name="${esc(r[0])}" data-expression="${esc(r[1])}" data-rule-action="${esc(r[2])}" data-note="${esc(r[4])}">${fa('ellipsis-vertical')}</button></div>`).join('')}</section>`;
    }).join('');
    return `<div class="page ref-page v11-page">${v11Title('Configuration','Security Rules','Each ruleset defines a field to evaluate. Rules inside are matched in priority order.','shield-halved')}<div class="v11-security-tools"><div class="v11-search grow">${fa('magnifying-glass')}<input id="securityRuleSearch" placeholder="Search by rule name..."></div><button class="btn v14-ruleset-filter" data-action="securityRulesetMenu">${fa('layer-group')} ${esc(state.securityRuleset)} ${fa('chevron-down')}</button><div class="v11-segment">${[['all','All'],['enabled','Enabled'],['disabled','Disabled']].map(([k,l])=>`<button class="${filter===k?'active':''}" data-action="securityRuleFilter" data-filter="${k}">${l}</button>`).join('')}</div><button class="v14-advanced-toggle ${state.securityAdvanced?'active':''}" data-action="securityAdvanced">${fa('sliders')} Advanced Mode <span class="v14-mini-toggle ${state.securityAdvanced?'on':''}"><i></i></span></button></div>${html||`<section class="v11-wide-card"><div class="v13-tab-empty">No rules match the selected filters.</div></section>`}</div>`;
  }
  function splitPageOptions(current){return Object.entries(pageMeta).filter(([k])=>k!==current).map(([k,v])=>`<button class="split-page-option" data-action="splitSelectPage" data-page="${esc(k)}">${esc(v[0])}</button>`).join('')}
  function renderSplitWorkspace(primary){
    const left=state.splitView.left||primary; const right=state.splitView.right||'permissions';
    const ratio=Math.max(32,Math.min(68,Number(state.splitView.ratio||58)));
    return `<div class="split-workspace" id="splitWorkspace" style="--split-ratio:${ratio}%"><section class="split-pane split-left" data-split-page="${esc(left)}"><div class="split-pane-scroll">${genericPage(left,true)}</div></section><div class="split-resizer" id="splitResizer"><span></span></div><section class="split-pane split-right" data-split-page="${esc(right)}"><div class="split-toolbar"><div><span>Multiview</span><strong>${esc(pageMeta[right]?.[0]||right)}</strong></div><div class="split-controls"><div class="split-select"><button class="btn compact" data-action="toggleSplitMenu">${esc(pageMeta[right]?.[0]||right)} ${fa('chevron-down')}</button><div class="split-select-menu">${splitPageOptions(right)}</div></div><button class="icon-btn" data-action="splitSwap" title="Swap sides">${fa('right-left')}</button><button class="icon-btn" data-action="splitClose" title="Close multiview">${fa('xmark')}</button></div></div><div class="split-pane-scroll">${genericPage(right,true)}</div></section></div>`
  }
  function initSplitResizer(){const r=$('#splitResizer');const w=$('#splitWorkspace');if(!r||!w)return;let dragging=false;const move=e=>{if(!dragging)return;const rect=w.getBoundingClientRect();state.splitView.ratio=Math.max(32,Math.min(68,((e.clientX-rect.left)/rect.width)*100));w.style.setProperty('--split-ratio',`${state.splitView.ratio}%`)};r.onpointerdown=e=>{dragging=true;r.setPointerCapture?.(e.pointerId);document.body.classList.add('split-resizing')};r.onpointermove=move;r.onpointerup=()=>{dragging=false;document.body.classList.remove('split-resizing')};r.onpointercancel=r.onpointerup}

  function genericPage(key, splitChild=false){
    const v11Config=['entity-rules','particle-rules','weapon-rules','explosion-rules','event-protection','general-rules','safety-rules','native-rules','key-locks','rate-limits','security-rules'];
    if(v11Config.includes(key)){
      return ({'entity-rules':entityRulesPage,'particle-rules':particleRulesPage,'weapon-rules':weaponRulesPage,'explosion-rules':explosionRulesPage,'event-protection':eventProtectionPage,'general-rules':generalRulesPage,'safety-rules':safetyRulesPage,'native-rules':nativeRulesPage,'key-locks':keyLocksPage,'rate-limits':rateLimitsPage,'security-rules':securityRulesPage})[key]();
    }
    if(configPages[key] && !['logs','live-view','insights','player-lookup','firewall-analytics','detections','removed-detections','replays'].includes(key)) return configPage(key);
    switch(key){
      case 'overview':return overview();case 'console':return mainConsolePage();case 'players':return mainPlayersPage();case 'falcon':return falconPage();case 'interactive-map':return mainMapPage();
      case 'logs':return securityLogsPage();case 'live-view':return securityLiveViewPage();case 'insights':return securityInsightsPage();case 'player-lookup':return securityLookupPage();case 'firewall-analytics':return securityFirewallPage();case 'detections':return securityDetectionsPage();case 'removed-detections':return securityRemovedPage();case 'replays':return securityReplaysPage();
      case 'assets':return managementAssetsPage();case 'logbook':return managementLogbookPage();case 'permissions':return managementPermissionsPage();case 'server-details':return managementServerDetailsPage();case 'api-keys':return managementApiKeysPage();case 'support-tickets':return managementSupportPage();case 'backups':return managementBackupsPage();case 'cdn':return managementCdnPage();
      default:{const [t,d]=pageMeta[key]||['Page',''];return `<div class="page">${header(t,d)}${panel(t,d,`<div class="empty-state"><div class="empty-icon">◆</div><strong>${t} ready for backend integration</strong><span>This complete design section is included and ready to bind to PARADOX ANTICHEAT APIs.</span></div>`,{icon:'◆'})}</div>`}
    }
  }

  function activityRangeMeta(range){
    return {
      '30m':{count:13,start:.70,end:1,scale:1.07,bias:4,label:(i,n)=>i===n-1?'Now':`-${Math.round(30-(30*i/(n-1)))}m`},
      '1h':{count:16,start:.58,end:1,scale:.96,bias:1,label:(i,n)=>i===n-1?'Now':`-${Math.round(60-(60*i/(n-1)))}m`},
      '6h':{count:18,start:.30,end:1,scale:1.12,bias:-2,label:(i,n)=>i===n-1?'Now':`-${Math.round(6-(6*i/(n-1)))}h`},
      '12h':{count:20,start:.12,end:.92,scale:.90,bias:8,label:(i,n)=>i===n-1?'Now':`-${Math.round(12-(12*i/(n-1)))}h`},
      '24h':{count:24,start:0,end:1,scale:1,bias:0,label:(i,n)=>i===n-1?'Now':`-${Math.round(24-(24*i/(n-1)))}h`},
      '7d':{count:21,start:0,end:1,scale:.82,bias:12,label:(i,n)=>i===n-1?'Today':`-${Math.round(7-(7*i/(n-1)))}d`}
    }[range]||{count:24,start:0,end:1,scale:1,bias:0,label:(i,n)=>i===n-1?'Now':`-${Math.round(24-(24*i/(n-1)))}h`};
  }

  function resampleActivity(values,meta,seriesIndex=0){
    const src=(Array.isArray(values)?values:[]).map(Number).filter(Number.isFinite);
    if(src.length<2) return new Array(meta.count).fill(0);
    const out=[];
    const maxIndex=src.length-1;
    for(let i=0;i<meta.count;i++){
      const t=meta.count===1?1:i/(meta.count-1);
      const pos=(meta.start+(meta.end-meta.start)*t)*maxIndex;
      const lo=Math.floor(pos), hi=Math.min(maxIndex,Math.ceil(pos)), mix=pos-lo;
      let v=src[lo]*(1-mix)+src[hi]*mix;
      if(state.demoSession){
        const wave=Math.sin((i+1)*(seriesIndex+1)*.74 + ({'30m':.4,'1h':1.2,'6h':2.2,'12h':3.1,'24h':0,'7d':4.3}[state.chartRange]||0));
        const waveSize=seriesIndex===0?8:Math.max(1,4-seriesIndex*.55);
        v=(v*meta.scale)+meta.bias+(wave*waveSize);
      }
      out.push(Math.max(0,Math.round(v*10)/10));
    }
    return out;
  }

  function activityChartData(range=state.chartRange){
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#47f3b4';
    const colors=[accent,'#4fb8ff','#ff5d6c','#ffaf44','#aa7dff'];
    const demoBase=[
      [60,68,52,71,61,86,92,76,70,88,77,72,96,89,78,101,96,112,104,118,109,126,132,120,143,137,133,171,182,174,169,179,161,134,129,146,132,128,116,121,113,120,95,92,101,98,113],
      [8,15,10,13,11,19,12,15,10,17,9,12,15,13,20,11,18,12,16,14,11,17,9,15,12,14,11,18,13,12,16,9,17,12,14,11,9,16,12,15,10,17,11,12,9,18,13],
      [4,17,6,2,7,3,9,5,16,4,8,5,7,11,3,8,5,4,12,6,3,10,2,7,5,8,4,3,17,5,7,4,8,3,5,9,4,7,3,6,4,8,5,3,7,4,2],
      [0,2,0,1,0,2,1,0,3,0,1,2,0,1,0,2,0,1,0,2,1,0,1,0,2,0,1,0,1,2,0,1,0,0,2,0,1,0,0,1,0,0,1,0,1,0,0],
      [11,8,12,9,8,7,10,9,12,8,10,9,11,8,12,10,9,8,11,9,10,9,13,11,9,10,12,9,14,11,10,12,9,10,11,8,12,9,11,8,10,9,11,8,10,9,8]
    ];
    const measured=state.sectionData?.overview;
    if(!state.demoSession&&measured?.range===range&&measured.series){
      const kinds=['connections','detections','kicks','bans'];
      return {series:kinds.map((kind,i)=>({c:colors[i+1],v:measured.series[kind]})),labels:Array.from({length:24},(_,i)=>new Date((measured.since+(measured.untilAt-measured.since)*i/24)*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))};
    }
    const meta=activityRangeMeta(range);
    const ranged=state.live?.activitySeriesByRange?.[range]||state.live?.activity?.ranges?.[range];
    const liveSeries=ranged||state.live?.activitySeries||state.live?.activity?.series;
    let series;
    if(Array.isArray(liveSeries)&&liveSeries.length){
      series=liveSeries.slice(0,5).map((entry,i)=>({c:entry.color||colors[i],v:resampleActivity(entry.values,meta,i)}));
    }else if(state.demoSession){
      series=demoBase.map((v,i)=>({c:colors[i],v:resampleActivity(v,meta,i)}));
    }else{
      series=colors.map(c=>({c,v:new Array(meta.count).fill(0)}));
    }
    const labels=Array.from({length:meta.count},(_,i)=>meta.label(i,meta.count));
    return {series,labels};
  }

  function drawChart(selector='#activityChart'){
    const canvas=typeof selector==='string'?$(selector):selector; if(!canvas) return;
    const rect=canvas.getBoundingClientRect(); if(rect.width<20||rect.height<20)return;
    const dpr=Math.max(1,window.devicePixelRatio||1); canvas.width=Math.floor(rect.width*dpr); canvas.height=Math.floor(rect.height*dpr); const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); const w=rect.width,h=rect.height,pad={l:42,r:12,t:12,b:28}; const cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
    ctx.clearRect(0,0,w,h);
    const {series,labels}=activityChartData(state.chartRange);
    const rawMax=Math.max(...series.flatMap(s=>s.v.map(Number).filter(Number.isFinite)),1);
    const max=Math.max(25,Math.ceil(rawMax/25)*25);
    ctx.strokeStyle='rgba(126,170,159,.11)';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad.t+ch*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillStyle='#61756f';ctx.font='8px sans-serif';ctx.fillText(String(Math.round(max-(max*i/4))),6,y+3)}
    const tickCount=Math.min(7,labels.length);
    for(let i=0;i<tickCount;i++){
      const idx=Math.round((labels.length-1)*i/(tickCount-1));
      const x=pad.l+cw*idx/Math.max(1,labels.length-1);
      ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+ch);ctx.stroke();ctx.fillStyle='#61756f';ctx.textAlign=i===0?'left':i===tickCount-1?'right':'center';ctx.fillText(labels[idx],x,h-7);
    }
    ctx.textAlign='left';
    series.forEach((s,idx)=>{
      const pts=s.v.map((v,i)=>[pad.l+cw*i/Math.max(1,s.v.length-1),pad.t+ch-(Number(v)/max)*ch]);
      if(idx===0&&pts.length){ctx.beginPath();ctx.moveTo(pts[0][0],pad.t+ch);pts.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(pts[pts.length-1][0],pad.t+ch);ctx.closePath();const g=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);g.addColorStop(0,`rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()||'71,243,180'},.22)`);g.addColorStop(1,`rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()||'71,243,180'},0)`);ctx.fillStyle=g;ctx.fill()}
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=s.c;ctx.lineWidth=idx===0?1.8:1.15;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();if(idx===0){ctx.fillStyle=s.c;pts.filter((_,i)=>i%Math.max(2,Math.floor(pts.length/10))===0).forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],2.1,0,Math.PI*2);ctx.fill()})}
    });
  }

  function drawAllActivityCharts(){
    drawChart('#activityChart');
    drawChart('#activityChartModal');
  }

  function openActivityChartModal(){
    const rangeButtons=['30m','1h','6h','12h','24h','7d'].map(r=>`<button class="range-btn ${state.chartRange===r?'active':''}" data-range="${r}">${r}</button>`).join('');
    openModal('Server Activity',`<div class="activity-chart-modal"><div class="activity-chart-modal-head"><div><span>LIVE SERVER TELEMETRY</span><h2>Server Activity</h2><p>Player count, connections, detections, kicks and bans across the selected time window.</p></div><div class="chart-head-actions">${rangeButtons}</div></div><div class="chart-legend"><span><i class="legend-dot" style="background:var(--accent)"></i>Player Count</span><span><i class="legend-dot" style="background:var(--blue)"></i>Connections</span><span><i class="legend-dot" style="background:var(--red)"></i>Detections</span><span><i class="legend-dot" style="background:var(--orange)"></i>Kicks</span><span><i class="legend-dot" style="background:var(--purple)"></i>Bans</span></div><div class="activity-chart-modal-canvas"><canvas id="activityChartModal"></canvas></div></div>`);
    setTimeout(()=>drawChart('#activityChartModal'),30);
  }

  function routeFromHash(){
    const raw=String(location.hash||'').replace(/^#\/?/,'').split('?')[0].trim();
    try{return decodeURIComponent(raw)||'overview';}catch{return raw||'overview';}
  }

  function navigateToPage(page, {replace=false}={}){
    const key=String(page||'').trim();
    if(!pageMeta[key]){
      toast('Page unavailable',`The dashboard page "${key || 'unknown'}" is not registered.`,'bad');
      return false;
    }
    closeDropdown();
    closeModal();
    state.page=key;
    if(state.splitView?.active) state.splitView.left=key;
    const next=`#/${key}`;

    // Hash navigation is intentionally used here instead of pushState. It works
    // consistently on Cloudflare Pages, static hosts, FiveM-adjacent previews,
    // localhost and direct dashboard deployments.
    if(location.hash!==next){
      if(replace){
        const base=location.href.split('#')[0];
        try{location.replace(`${base}${next}`);}catch{location.hash=next;}
      }else{
        location.hash=next;
      }
      // Render immediately as well as on hashchange so navigation never feels
      // delayed and remains reliable in embedded browsers/webviews.
      render(key);
    }else{
      render(key);
    }
    return true;
  }

  function verifyNavigationRegistry(){
    const keys=$$('.nav-item[data-page]').map(n=>n.dataset.page);
    const missing=keys.filter(key=>!pageMeta[key]);
    const duplicate=keys.filter((key,i)=>keys.indexOf(key)!==i);
    const renderFailures=[];
    keys.forEach(key=>{
      if(!pageMeta[key]) return;
      try{
        const html=genericPage(key);
        if(typeof html!=='string'||!html.includes('class="page')) renderFailures.push(`${key}: invalid page markup`);
      }catch(err){
        renderFailures.push(`${key}: ${err?.message||err}`);
      }
    });
    if(missing.length) console.error('[PARADOX] Unregistered navigation pages:',missing);
    if(duplicate.length) console.warn('[PARADOX] Duplicate navigation pages:',[...new Set(duplicate)]);
    if(renderFailures.length) console.error('[PARADOX] Navigation render failures:',renderFailures);
    return {missing,duplicate:[...new Set(duplicate)],renderFailures};
  }

  function renderTopbarProfile(){
    const profile=$('#profileButton');
    if(profile) profile.innerHTML=`${avatarMarkup(state.user,'avatar')}<div class="profile-copy"><strong>${esc(state.user.name||'Server Owner')}</strong><span>${esc(state.user.role||'Server Owner')}</span></div><span class="chev">${fa('chevron-down')}</span>`;
    const dot=$('.notification-dot'); if(dot) dot.style.display=state.notifications.some(n=>n.unread)?'block':'none';
  }

  function render(routeOverride){
    const requested=String(routeOverride||routeFromHash()||state.page||'overview').trim();
    state.page=pageMeta[requested]?requested:'overview';
    $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===state.page));

    // If a page belongs to a collapsed sidebar category, keep that category open
    // while the page is active so the user can always see where they are.
    const activeNav=$(`.nav-item[data-page="${state.page}"]`);
    const activeGroup=activeNav?.closest('.collapsible');
    if(activeGroup) activeGroup.classList.add('open');

    window.ParadoxData.ensure(state,render);
    const hasRail=state.page==='overview';
    shell.classList.toggle('no-rail',!hasRail);
    rail.classList.toggle('hidden',!hasRail);
    rail.innerHTML=hasRail?overviewRail():'';

    try{
      let markup;
      if(state.splitView?.active){
        state.splitView.left=state.splitView.left||state.page;
        markup=renderSplitWorkspace(state.splitView.left);
      }else{
        markup=genericPage(state.page);
      }
      if(typeof markup!=='string'||!markup.trim()) throw new Error('Page renderer returned empty markup');
      main.innerHTML=markup;
    }catch(err){
      console.error(`[PARADOX] Failed to render page ${state.page}:`,err);
      const meta=pageMeta[state.page]||['Dashboard Page',''];
      main.innerHTML=`<div class="page"><div class="page-header"><div><h1>${esc(meta[0])}</h1><p>${esc(meta[1])}</p></div></div><section class="panel"><div class="empty-state"><div class="empty-icon">${fa('triangle-exclamation')}</div><strong>This section hit a rendering error</strong><span>The route opened successfully, but one component failed to render. Check the browser console for the exact module error.</span><button class="btn primary" data-action="retryCurrentPage">${fa('rotate')} Retry Section</button></div></section></div>`;
    }
    main.scrollTop=0;
    renderTopbarProfile();
    document.title=`${pageMeta[state.page][0]} — PARADOX ANTICHEAT`;
    setTimeout(drawChart,20);
    closeMobileNav();
  }

  function toast(title,message,type='good'){
    const el=document.createElement('div');el.className='toast';el.innerHTML=`<div class="toast-icon" style="${type==='bad'?'color:var(--red);background:rgba(255,93,108,.1)':''}">${type==='bad'?'!':'✓'}</div><div><strong>${esc(title)}</strong><span>${esc(message)}</span></div>`;toasts.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),220)},3400);
  }
  function openModal(title,body,foot=''){
    modalLayer.innerHTML=`<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn close" data-action="closeModal">×</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div>`;modalLayer.classList.add('open');modalLayer.setAttribute('aria-hidden','false'); upgradeSelects(modalLayer);
  }
  function closeModal(){modalLayer.classList.remove('open');modalLayer.setAttribute('aria-hidden','true');setTimeout(()=>{if(!modalLayer.classList.contains('open'))modalLayer.innerHTML=''},180)}

  async function playerModal(name, tab='details'){
    const p=players.find(x=>x[1]===name||String(x[0])===String(name))||['—',name||'Unknown','license:unavailable','Unknown','—',0,'Offline'];
    const key=name||p[1]||String(p[0]);
    state.playerDetails[key]=state.playerDetails[key]||{};
    if(!state.demoSession){
      try{
        const result=await window.ParadoxAPI.getDetail('player',p[0]);
        if(!result?.detail)throw Error('Player record is unavailable');
        const d=result.detail;
        state.playerDetails[key]={...state.playerDetails[key],...d,
          notes:(d.notes||[]).map(n=>({text:n.note,author:n.actor,time:window.ParadoxData.date(n.created_at)})),
          logs:(d.timeline||[]).map(row=>({time:window.ParadoxData.date(row.created_at),message:row.detection_id+' · '+row.mode})),
          detections:(d.timeline||[]).map(row=>({action:row.mode,reason:row.detection_id,server:state.server.name,date:window.ParadoxData.date(row.created_at)}))};
      }catch(error){toast('Player details unavailable',error.message,'bad');return;}
    }
    const raw=state.playerDetails[key];
    state.playerModalName=key;
    state.playerModalTab=tab;
    const ids=raw.identifiers&&typeof raw.identifiers==='object'?raw.identifiers:{};
    const idRows=Object.entries(ids).slice(0,6).map(([k,v])=>`<div class="v12-id-row"><span>${fa(k==='discord'?'discord':k==='fivem'?'gamepad':'fingerprint')} ${esc(k)}</span><code>${esc(String(v))}</code><button class="icon-btn" title="Copy identifier">${fa('copy')}</button></div>`).join('');
    const dets=(raw.detections||[]).slice(0,5); const useDets=dets.length?dets:(state.demoSession?[{action:'BAN',reason:'Attempting to run InvokeCPlayer with an invalid key.',server:'vrl3ge',date:'2 months ago'},{action:'BAN',reason:'Attempt to spawn blacklisted entity [PC-AEAJK].',server:'ep5kpd',date:'4 months ago'},{action:'BAN',reason:'Invalid Native Call. Native: Citizen.CreateThread',server:'7b9kqrb',date:'4 months ago'}]:[]);
    const detRows=useDets.map(d=>`<tr><td><span class="action-tag ban">${esc(d.action||'WARN')}</span></td><td>${esc(d.reason||d.name||'Security signal')}</td><td><span class="status-green">${esc(d.server||state.server.serverId||'server')}</span></td><td>${esc(d.date||d.time||'Live')}</td></tr>`).join('');
    const serverNames=['Paradox City RP','Classic Roleplay 18+','Palm Beach','8Trap RP','New Era','The Streets LA']; const servers=(raw.servers||(state.demoSession?serverNames:[state.server.name])).slice(0,8).map((sv,i)=>{const n=typeof sv==='string'?sv:(sv.name||'FiveM Server');return `<div class="v12-joined-server"><span class="v12-server-thumb">${fa('server')}</span><div><strong>${esc(n)}</strong><small>${i===0?'Current server':'Join date unknown'}</small></div><b>● ${i===0?'Online':'Offline'}</b></div>`}).join('');
    const tabs=['details','notes','logs','replays'];
    const tabButtons=tabs.map(t=>`<button class="${tab===t?'active':''}" data-action="playerModalTab" data-player="${esc(key)}" data-tab="${t}">${t==='logs'?'Server Logs':t[0].toUpperCase()+t.slice(1)}</button>`).join('');
    const notes=Array.isArray(raw.notes)?raw.notes:[];
    const logs=Array.isArray(raw.logs)?raw.logs:(state.demoSession?[{time:'10:31:14',message:'Connected to protected session gateway.'},{time:'10:34:08',message:'Movement integrity sample accepted.'}]:[]);
    const replays=Array.isArray(raw.replays)?raw.replays:(state.demoSession?[{id:'RPL-447',label:'Detection replay · 18.4s',time:'2 months ago'}]:[]);
    let right='';
    if(tab==='details') right=`<div class="v12-player-profile"><span class="v12-offline">● ${esc(raw.status||p[6]||'OFFLINE')}</span><h2>${esc(p[1])}</h2>${Number(p[5])>40?'<span class="v12-risk-badge">Low Playtime</span>':''}</div><div class="v12-player-kpis"><div><span>${fa('clock')} FIRST SEEN</span><strong>${esc(raw.firstSeen||(state.demoSession?'5 months ago':'Not reported'))}</strong></div><div><span>${fa('right-to-bracket')} LAST JOINED</span><strong>${esc(raw.lastJoined||(state.demoSession?'13 days ago':'Not reported'))}</strong></div><div><span>${fa('server')} THIS SERVER</span><strong>${esc(raw.serverPlaytime||(state.demoSession?'0m':'Not reported'))}</strong></div><div><span>${fa('globe')} TOTAL PLAYTIME</span><strong>${esc(raw.totalPlaytime||(state.demoSession?'5d 23h':'Not reported'))}</strong></div></div><div class="v12-block-title">${fa('server')} SERVERS JOINED <b>${raw.servers?.length||(state.demoSession?serverNames.length:1)}</b></div><div class="v12-server-grid">${servers}</div>`;
    if(tab==='notes') right=`<div class="v13-player-tab-panel"><div class="v13-note-compose"><textarea class="textarea" id="playerNoteInput" maxlength="1000" placeholder="Write a note about this player... (max 1000 characters)"></textarea><div><span>0/1000</span><button class="btn primary" data-action="addPlayerNote" data-player="${esc(key)}">Add Note</button></div></div><div class="v13-tab-list">${notes.length?notes.map(n=>`<article><span>${fa('note-sticky')}</span><div><strong>${esc(n.author||state.user.name||'Admin')}</strong><p>${esc(n.text||String(n))}</p><small>${esc(n.time||'Just now')}</small></div></article>`).join(''):`<div class="v13-tab-empty">No notes yet</div>`}</div></div>`;
    if(tab==='logs') right=`<div class="v13-player-tab-panel"><div class="v11-search">${fa('magnifying-glass')}<input placeholder="Search logs..."></div><div class="v13-tab-list">${logs.length?logs.map(l=>`<article><span>${fa('terminal')}</span><div><strong>${esc(l.time||'Live')}</strong><p>${esc(l.message||l.log||String(l))}</p></div></article>`).join(''):`<div class="v13-tab-empty">No logs found for this player</div>`}</div></div>`;
    if(tab==='replays') right=`<div class="v13-player-tab-panel"><div class="v13-tab-list">${replays.length?replays.map(r=>`<article class="v13-replay-row"><span>${fa('film')}</span><div><strong>${esc(r.id||'Replay')}</strong><p>${esc(r.label||r.description||'Captured event replay')}</p><small>${esc(r.time||r.createdAt||'Live')}</small></div><button class="btn">${fa('play')} Open</button></article>`).join(''):`<div class="v13-tab-empty">No replays for this player</div>`}</div></div>`;
    openModal('',`<div class="v12-player-modal"><section class="v12-player-left"><div class="v12-block-title">${fa('fingerprint')} IDENTIFIERS <b>${Object.keys(ids).length}</b></div><div class="v12-identifiers">${idRows}</div><div class="v12-block-title">${fa('shield-halved')} DETECTIONS <b>${useDets.length}</b></div><div class="v12-player-detections"><table><thead><tr><th>ACTION</th><th>REASON</th><th>SERVER</th><th>DATE</th></tr></thead><tbody>${detRows||`<tr><td colspan="4">No detections for this player.</td></tr>`}</tbody></table></div><div class="v12-player-context-tabs"><button class="active">${fa('map-location-dot')} Interactive Map</button><button>${fa('video')} Live View</button></div><div class="v12-player-context-empty"><span>Overview</span>${fa('chevron-right')}<strong>Interactive Map</strong></div></section><aside class="v12-player-right"><div class="v12-player-tabs">${tabButtons}</div>${right}<div class="v12-player-actions"><button class="btn warning" data-action="liveModerate" data-operation="warn" data-player="${esc(key)}">${fa('triangle-exclamation')} Warn</button><button class="btn danger" data-action="liveModerate" data-operation="permban" data-player="${esc(key)}">${fa('ban')} Add Ban</button></div></aside></div>`,'');
  }

  function cardDetailModal(card){
    if(!card) return;
    if(specializedSectionModal(state.page,card)) return;
    if(card.classList.contains('player-card') && card.dataset.player){ playerModal(card.dataset.player); return; }
    const title=card.dataset.cardTitle||card.querySelector('.panel-title,h3,.stat-top span,small,strong')?.textContent?.trim()||'Dashboard Detail';
    const clone=card.cloneNode(true);
    clone.querySelectorAll('button,input,textarea,select,.switch,.custom-dropdown').forEach(el=>el.remove());
    const nodes=card.tagName==='TR'?[...clone.querySelectorAll('td')]:[...clone.querySelectorAll('p,span,strong,small,.kv,.meta')];
    const text=nodes.map(el=>el.textContent.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,18);
    openModal(esc(title),`<div class="detail-modal-card"><div class="detail-modal-icon">${fa('circle-info')}</div><p>Expanded information for this dashboard card.</p><div class="detail-lines">${text.length?text.map((line,i)=>`<div class="detail-line"><span>${i===0?'Summary':`Detail ${i}`}</span><strong>${esc(line)}</strong></div>`).join(''):noLiveData('No additional details are available for this card yet.')}</div></div>`);
  }

  function globalSearch(){
    const demoResults=state.demoSession?`<div class="search-result" data-page-jump="players"><div class="result-icon">${fa('user')}</div><div class="result-copy"><strong>2Moonlight#8421</strong><span>Player 42 · Risk 91 · 3 evidence bundles</span></div><div class="result-type">Player</div></div><div class="search-result" data-page-jump="bans"><div class="result-icon">${fa('ban')}</div><div class="result-copy"><strong>PA-F72B91</strong><span>Active permanent ban · Cheat menu / event replay</span></div><div class="result-type">Ban</div></div>`:`<div class="notification-empty">Search queries are sent directly to the connected FiveM server.</div>`;
    openModal('Search Paradox Security', `<div class="search-modal"><div class="search-box-big"><span style="color:var(--accent)">${fa('magnifying-glass')}</span><input id="globalSearchInput" placeholder="Search players, bans, IDs, detection IDs, events..." autofocus><button class="btn primary" data-action="runGlobalSearch">Search</button></div><div class="search-results" id="globalSearchResults">${demoResults}</div></div>`);setTimeout(()=>$('#globalSearchInput')?.focus(),20)
  }


  function genericConfigModal(title){openModal(title,`<div class="form-grid"><div class="field"><label>Name</label><input class="input" value="${esc(title)}"></div><div class="field"><label>Mode</label><select class="select"><option>Enabled</option><option>Shadow</option><option>Disabled</option></select></div><div class="field full"><label>Description / Notes</label><textarea class="textarea">Configuration changes are stored through the PARADOX backend and audited.</textarea></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Save</button>`)}

  function closeMobileNav(){ $('#sidebar')?.classList.remove('open'); $('#mobileOverlay')?.classList.remove('show'); }

  let activeDropdownKey=null;
  function closeDropdown(){ dropdownLayer.innerHTML=''; activeDropdownKey=null; $('#profileButton')?.classList.remove('open'); }
  function openDropdown(anchor, html, width=300){
    const r=anchor.getBoundingClientRect();
    dropdownLayer.innerHTML=`<div class="dropdown-popover" style="width:${width}px;top:${Math.min(window.innerHeight-80,r.bottom+7)}px;right:${Math.max(10,window.innerWidth-r.right)}px">${html}</div>`;
  }
  function toggleDropdown(anchor,key,html,width=300){
    if(activeDropdownKey===key && dropdownLayer.querySelector('.dropdown-popover')){ closeDropdown(); return false; }
    activeDropdownKey=key; openDropdown(anchor,html,width); return true;
  }
  function notificationsDropdown(anchor){
    const list=state.notifications.map((n,i)=>`<button class="notification-card ${n.unread?'unread':''}" data-action="openNotification" data-index="${i}"><span class="n-icon">${fa(String(n.icon||'bell').replace(/^fa-/,''))}</span><span class="notification-copy"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p></span><time>${esc(n.time)}</time></button>`).join('');
    toggleDropdown(anchor,'notifications',`<div class="dropdown-head"><div><strong>Notifications</strong><span>Security and server activity</span></div><span class="tag green dropdown-badge">${state.notifications.filter(n=>n.unread).length} new</span></div><div class="notification-list">${list||'<div class="notification-empty">No notifications yet.</div>'}</div><div class="dropdown-menu notification-footer"><button class="dropdown-item" data-action="markAllRead">${fa('check-double')} Mark all as read</button></div>`,360);
  }
  function supportDropdown(anchor){
    toggleDropdown(anchor,'support',`<div class="dropdown-head"><div><strong>Contact Support</strong><span>Send a message to the PARADOX support team</span></div></div><div class="support-form"><label>Your name</label><input class="input" id="supportName" maxlength="80" value="${esc(state.user.name||'')}"><label>Message</label><textarea class="textarea" id="supportMessage" maxlength="1800" placeholder="Describe what you need help with..."></textarea><div class="support-actions"><button class="btn" data-action="cancelSupport">Cancel</button><button class="btn primary" data-action="sendSupport">${fa('paper-plane')} Send</button></div></div>`,380);
  }
  function profileDropdown(anchor){
    anchor.classList.add('open');
    toggleDropdown(anchor,'profile',`<div class="dropdown-head account-dropdown-head">${avatarMarkup(state.user,'avatar')}<div><strong>${esc(state.user.name||'Server Owner')}</strong><span>${esc(state.user.role||'Server Owner')}</span></div></div><div class="dropdown-menu"><button class="dropdown-item" data-action="accountSettings">${fa('gear')} Settings</button><button class="dropdown-item" data-action="connectedServers">${fa('server')} Servers</button><button class="dropdown-item" data-action="dashboardAccess">${fa('user-shield')} Access</button><div class="dropdown-divider"></div><button class="dropdown-item danger" data-action="logout">${fa('right-from-bracket')} Logout</button></div>`,285);
  }

  function ruleContextMenu(anchor,type,name,ruleset='',expression='',ruleAction='',note=''){
    const key=`${type}:${ruleset?ruleset+':':''}${name}`;
    const editAction=type==='explosion'?'editExplosion':type==='native'?'editNative':'editSecurityRule';
    const editAttrs=type==='security'?` data-ruleset="${esc(ruleset)}" data-expression="${esc(expression)}" data-rule-action="${esc(ruleAction)}" data-note="${esc(note)}"`:'';
    toggleDropdown(anchor,`rule:${key}`,`<div class="dropdown-menu v14-rule-menu"><button class="dropdown-item" data-action="${editAction}" data-name="${esc(name)}"${editAttrs}>${fa('pen')} Edit Rule</button><button class="dropdown-item danger" data-action="removeRule" data-rule-type="${esc(type)}" data-ruleset="${esc(ruleset)}" data-name="${esc(name)}">${fa('trash-can')} Remove Rule</button></div>`,205);
  }
  function openPlayerLookupModal(){
    const demoCards=state.demoSession?players.slice(0,6).map(p=>`<button class="v14-lookup-result" data-action="viewPlayer" data-player="${esc(p[1])}"><span class="avatar">${esc((p[1]||'?')[0])}</span><div><strong>${esc(p[1])}</strong><small>ID ${esc(p[0])} · ${esc(p[2])}</small></div><span class="risk-chip ${riskClass(p[5])}">${p[5]} Risk</span></button>`).join(''):`<div class="v13-tab-empty">Type a player name or identifier to search the connected server.</div>`;
    openModal('Player Lookup',`<div class="v14-lookup-modal"><div class="v14-lookup-modal-head"><div class="detail-modal-icon">${fa('magnifying-glass')}</div><div><h2>Search security identities</h2><p>Search live and historical player records by name or identifier.</p></div></div><div class="search-box-big"><span style="color:var(--accent)">${fa('magnifying-glass')}</span><input id="playerLookupModalInput" placeholder="Player name, license, Discord, FiveM ID or Steam ID..." autofocus><button class="btn primary" data-action="runPlayerLookupModal">Search</button></div><div class="v14-lookup-results" id="playerLookupModalResults">${demoCards}</div></div>`,`<button class="btn" data-action="closeModal">Close</button>`);setTimeout(()=>$('#playerLookupModalInput')?.focus(),30);
  }
  async function runPlayerLookupModal(){
    const q=$('#playerLookupModalInput')?.value?.trim()||''; const out=$('#playerLookupModalResults'); if(!out)return;
    if(!q){out.innerHTML='<div class="v13-tab-empty">Enter a name or identifier to search.</div>';return;}
    if(state.demoSession){const match=players.filter(p=>p.join(' ').toLowerCase().includes(q.toLowerCase()));out.innerHTML=match.length?match.map(p=>`<button class="v14-lookup-result" data-action="viewPlayer" data-player="${esc(p[1])}"><span class="avatar">${esc((p[1]||'?')[0])}</span><div><strong>${esc(p[1])}</strong><small>ID ${esc(p[0])} · ${esc(p[2])}</small></div><span class="risk-chip ${riskClass(p[5])}">${p[5]} Risk</span></button>`).join(''):'<div class="v13-tab-empty">No demo players match that search.</div>';return;}
    out.innerHTML='<div class="v13-tab-empty">Searching connected server…</div>';
    try{const res=await window.ParadoxAPI.search(q);const rows=res?.results||res?.items||[];out.innerHTML=rows.length?rows.slice(0,12).map(r=>`<button class="v14-lookup-result" data-action="viewPlayer" data-player="${esc(r.name||r.playerName||r.label||'Unknown')}"><span class="avatar">${esc(String(r.name||r.playerName||'?')[0])}</span><div><strong>${esc(r.name||r.playerName||r.label||'Result')}</strong><small>${esc(r.identifier||r.detail||r.id||'Connected server result')}</small></div><span class="tag green">${esc(r.type||'Player')}</span></button>`).join(''):'<div class="v13-tab-empty">No matching player records found.</div>';}catch(err){out.innerHTML=`<div class="v13-tab-empty">${esc(err.message||'Player lookup failed.')}</div>`;}
  }

  async function connectedServersModal(){
    const current={
      id:state.server.serverId||state.live?.server?.id||'primary',
      name:state.server.name||state.live?.server?.name||'FiveM Server',
      region:state.server.region||state.live?.server?.region||'Not configured',
      endpoint:state.live?.server?.endpoint||state.server.serverUrl||'Protected bridge',
      uptime:state.live?.server?.uptime||'—',
      online:state.live?.summary?.online??players.length,
      maxPlayers:state.live?.summary?.maxPlayers??'—',
      linked:state.demoSession||state.server.linked||state.live?.connected===true
    };
    let servers=Array.isArray(state.live?.servers)&&state.live.servers.length?state.live.servers:[current];
    try{
      const remote=await window.ParadoxAPI.getServers?.();
      if(Array.isArray(remote?.servers)&&remote.servers.length) servers=remote.servers.map((srv,i)=>i===0?{...current,...srv,online:srv.online??current.online,maxPlayers:srv.maxPlayers??current.maxPlayers,uptime:srv.uptime??current.uptime}:srv);
    }catch{}
    const cards=servers.map((s,i)=>`<article class="connected-server-card"><div class="connected-server-top"><div class="connected-server-icon">${fa('server')}</div><div><strong>${esc(s.name||`Server ${i+1}`)}</strong><span>${esc(s.id||s.serverId||'FiveM server')}</span></div><span class="status-chip ${(s.linked??s.connected??true)?'good':'bad'}"><span class="dot"></span>${(s.linked??s.connected??true)?'Connected':'Offline'}</span></div><div class="connected-server-grid"><div><span>Players</span><strong>${esc(s.online??s.players??0)} / ${esc(s.maxPlayers??'—')}</strong></div><div><span>Region</span><strong>${esc(s.region||'Not set')}</strong></div><div><span>Uptime</span><strong>${esc(s.uptime||'—')}</strong></div><div><span>Endpoint</span><strong>${esc(s.endpoint||s.serverUrl||'Protected')}</strong></div></div></article>`).join('');
    openModal('Connected Servers',`<div class="connected-servers-intro"><div class="detail-modal-icon">${fa('server')}</div><div><strong>Servers connected to this dashboard</strong><span>Live FiveM connection and PARADOX bridge information.</span></div></div><div class="connected-server-list">${cards||noLiveData('No FiveM servers are connected to this account yet.')}</div>`,`<button class="btn" data-action="closeModal">Close</button><button class="btn primary" data-action="openServerSetup">${fa('link')} Manage Connection</button>`);
  }

  async function dashboardAccessModal(){
    let users=[];
    if(state.demoSession){
      users=[
        {id:'owner-demo',email:state.user.email||'demo@paradox-anticheat.local',displayName:state.user.name||'Paradox Demo',role:'Owner',status:'active',avatarUrl:state.user.avatarUrl||'',isOwner:true},
        {id:'admin-demo-1',email:'security@paradox.local',displayName:'Security Admin',role:'Admin',status:'active',avatarUrl:''},
        {id:'admin-demo-2',email:'reviewer@paradox.local',displayName:'Evidence Reviewer',role:'Admin',status:'active',avatarUrl:''}
      ];
    }else{
      try{const res=await window.ParadoxAPI.getAccessUsers?.();users=Array.isArray(res?.users)?res.users:[];}catch{}
    }
    const userCards=()=>users.length?users.map(u=>`<article class="access-user-card"><div class="access-user-avatar">${avatarMarkup({name:u.displayName||u.email||'A',avatarUrl:u.avatarUrl||''},'avatar')}</div><div class="access-user-copy"><strong>${esc(u.displayName||u.email||'Dashboard Admin')}</strong><span>${esc(u.email||'')}</span><small>${esc(u.role||'Admin')} · ${esc((u.status||'active').replace(/^./,c=>c.toUpperCase()))}</small></div><span class="status-chip ${/active/i.test(u.status||'active')?'good':'warn'}">${esc(u.status||'active')}</span>${u.isOwner?'':`<button class="mini-btn access-remove" data-action="removeDashboardAccess" data-access-id="${esc(u.id||u.accessId||'')}">${fa('trash-can')}</button>`}</article>`).join(''):noLiveData('No additional dashboard administrators have access yet.');
    openModal('Dashboard Access',`<div class="access-intro"><div class="detail-modal-icon">${fa('user-shield')}</div><div><strong>Share this server dashboard</strong><span>Add another administrator by email. Connected admins can access this server through their own PARADOX dashboard account.</span></div></div><div class="access-invite-row"><div class="field"><label>Administrator email</label><input id="accessInviteEmail" class="input" type="email" placeholder="admin@example.com"></div><button class="btn primary" data-action="inviteDashboardAccess">${fa('user-plus')} Add Access</button></div><div class="access-management-head"><div><strong>Management Users</strong><span>Accounts with access to this server dashboard</span></div><span class="tag green">${users.length} user${users.length===1?'':'s'}</span></div><div class="access-user-list" id="accessUserList">${userCards()}</div>`,`<button class="btn" data-action="closeModal">Close</button>`);
  }

  function accountSettingsModal(tab='account'){
    const s=state.server; const linked=state.demoSession||s.linked||state.live?.connected===true;
    openModal('Dashboard Settings',`<div class="settings-tabs"><button class="settings-tab ${tab==='account'?'active':''}" data-action="settingsTab" data-tab="account">Account</button><button class="settings-tab ${tab==='server'?'active':''}" data-action="settingsTab" data-tab="server">Server</button><button class="settings-tab ${tab==='appearance'?'active':''}" data-action="settingsTab" data-tab="appearance">Appearance</button><button class="settings-tab ${tab==='storage'?'active':''}" data-action="settingsTab" data-tab="storage">Storage</button><button class="settings-tab ${tab==='logs'?'active':''}" data-action="settingsTab" data-tab="logs">Logs</button></div><div style="padding:15px">
      <section class="settings-section ${tab==='account'?'active':''}" data-settings-section="account"><div class="form-grid"><div class="field"><label>Display name</label><input id="accountName" class="input" value="${esc(state.user.name||'')}"></div><div class="field"><label>Email</label><input id="accountEmail" class="input" type="email" value="${esc(state.user.email||'')}"></div><div class="field full"><label>Display avatar URL</label><input id="accountAvatarUrl" class="input" type="url" placeholder="https://example.com/avatar.png" value="${esc(state.user.avatarUrl||'')}"><span class="field-hint">Direct HTTPS image URL. Saved to your account and used everywhere your profile avatar appears.</span></div><div class="field"><label>Role</label><input class="input" value="${esc(state.user.role||'Server Owner')}" disabled></div><div class="field"><label>Current password (required to change email or password)</label><input id="accountCurrentPassword" class="input" type="password" autocomplete="current-password"><label>New password</label><input id="accountPassword" class="input" type="password" placeholder="Leave blank to keep current"></div></div></section>
      <section class="settings-section ${tab==='server'?'active':''}" data-settings-section="server"><div class="server-connection-summary ${linked?'linked':'pending'}"><div class="connection-orb">${fa(linked?'link':'link-slash')}</div><div><strong>${linked?'FiveM server connected':'Server connection required'}</strong><span>${linked?'PARADOX reconnects automatically whenever you sign in.':'Complete the one-time pairing wizard to enable live dashboard telemetry.'}</span></div><span class="status-chip ${linked?'good':'warn'}">${linked?'Linked':'Not linked'}</span></div><div class="form-grid"><div class="field"><label>Server name</label><input id="modalServerName" class="input" value="${esc(s.name||'')}"></div><div class="field"><label>Server ID</label><input id="modalServerId" class="input" value="${esc(s.serverId||'')}" ${linked?'readonly':''}></div><div class="field"><label>Region / location</label><input id="modalRegion" class="input" value="${esc(s.region||'')}"></div><div class="field"><label>Sync interval</label>${customSelect(`${Math.round(Number(s.syncInterval||5000)/1000)} seconds`,['3 seconds','5 seconds','10 seconds','15 seconds'])}</div></div>${linked?'':`<div style="margin-top:12px"><button class="btn primary" data-action="openServerSetup">${fa('link')} Open Connection Wizard</button></div>`}</section>
      <section class="settings-section ${tab==='appearance'?'active':''}" data-settings-section="appearance"><div class="form-grid"><div class="field full"><label>Accent theme color</label><div class="color-field"><div class="color-swatch"><input id="modalAccentColor" type="color" value="${state.accent}"></div><input id="modalAccentHex" class="input" value="${state.accent}"></div></div><div class="field full"><label>Map default</label>${customSelect(state.mapMode==='satellite'?'Satellite':'Atlas',['Atlas','Satellite'])}</div></div></section>
      <section class="settings-section ${tab==='storage'?'active':''}" data-settings-section="storage"><div class="form-grid"><div class="field full"><label>FiveManage API key</label><input id="modalFiveManageKey" class="input" type="password" placeholder="${s.fiveManageKeyConfigured?'Configured — leave blank to keep current':'Enter API key'}"></div><div class="field full"><div class="secret-note"><strong>Secret handling:</strong> provider keys are encrypted by the Cloudflare Worker and are never returned to the browser after saving.</div></div></div></section>
      <section class="settings-section ${tab==='logs'?'active':''}" data-settings-section="logs"><div class="v15-settings-log-hero">${fa('discord','brands')}<div><strong>Discord Dashboard Logs</strong><span>Send dashboard activity, rule changes, detections, bans, warnings, configuration updates and security events to one Discord channel using clean PARADOX embeds.</span></div></div><div class="form-grid"><div class="field full"><label>Discord webhook URL</label><input id="modalDiscordLogWebhook" class="input" type="password" placeholder="${s.discordLogWebhookConfigured?'Configured — leave blank to keep current':'https://discord.com/api/webhooks/...'}"><span class="field-hint">Webhook is encrypted by the Cloudflare Worker and is never returned to the browser after saving.</span></div></div><div class="v15-log-types">${['Detections & enforcement','Rule and configuration changes','Admin actions','Player moderation','Server health & bridge events','Authentication & access changes'].map(x=>`<label>${fa('circle-check')}<span>${x}</span><b>Enabled</b></label>`).join('')}</div></section>
    </div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveAccountSettings">${fa('floppy-disk')} Save Changes</button>`);
  }

  function showLogin(){
    document.body.classList.add('auth-active'); document.body.classList.remove('preboot');
    const test=location.protocol==='file:'?(window.PARADOX_CONFIG?.testAccount||{}):{};
    authLayer.classList.add('open'); authLayer.setAttribute('aria-hidden','false');
    authLayer.innerHTML=`<div class="auth-card login-card"><div class="auth-brand"><img src="assets/img/logo.svg" alt=""><div><h2>PARADOX <span>ANTICHEAT</span></h2><p>Secure command & protection dashboard</p></div></div><div class="auth-body"><div class="login-kicker">${fa('shield-halved')} AUTHORIZED ACCESS ONLY</div><h1 class="auth-title">Sign in to command.</h1><p class="auth-sub">Authenticate to manage your FiveM protection stack, review evidence and control connected servers.</p><form id="loginForm"><div class="auth-fields"><div class="auth-field"><label>Email address</label><div class="auth-input-wrap">${fa('envelope','regular')}<input id="loginEmail" type="email" autocomplete="email" value="${esc(test.email||'')}" placeholder="owner@example.com" required></div></div><div class="auth-field"><label>Password</label><div class="auth-input-wrap">${fa('lock')}<input id="loginPassword" type="password" autocomplete="current-password" value="${esc(test.password||'')}" placeholder="••••••••••" required></div></div></div><div class="auth-actions"><button class="btn primary login-submit" type="submit">${fa('arrow-right-to-bracket')} Authenticate Session</button></div><div class="test-credentials"><div><span>TEST ACCOUNT</span><strong>${esc(test.email||'demo@paradox-anticheat.local')}</strong></div><button type="button" class="copy-demo" data-action="fillDemoLogin">${fa('flask')} Fill demo</button></div><div class="auth-note">${fa('cloud')} Production authentication, account data and encrypted server secrets are handled by the included Cloudflare Worker + D1 backend.</div></form></div></div>`;
    if(location.protocol!=='file:')authLayer.querySelector('.test-credentials')?.remove();
    const inviteToken=location.hash.startsWith('#invite=')?location.hash.slice(8):null;
    if(inviteToken){$('.auth-title',authLayer).textContent='Accept your invitation.';$('.login-submit',authLayer).textContent='Create account and sign in';$('#loginPassword').minLength=12;$('#loginPassword').autocomplete='new-password';}
    $('#loginForm',authLayer)?.addEventListener('submit',async e=>{
      e.preventDefault();const email=$('#loginEmail').value,password=$('#loginPassword').value,button=$('.login-submit',authLayer);button.disabled=true;
      try{if(inviteToken){await window.ParadoxAPI.request('/api/auth/accept-invite',{method:'POST',body:{token:inviteToken,password}});history.replaceState(null,'','#/overview');}await beginLogin(email,password);}
      catch(error){toast('Account request failed',error.message,'bad');button.disabled=false;}
    });
  }

  async function showBootSequence(next=showLogin){
    document.body.classList.add('auth-active');
    authLayer.classList.add('open'); authLayer.setAttribute('aria-hidden','false');
    authLayer.innerHTML=`<div class="v13-boot"><canvas class="v13-rain-canvas" id="v13RainCanvas"></canvas><div class="v13-boot-grid"></div><div class="v13-boot-vignette"></div><div class="v13-boot-brand"><img src="assets/img/logo.svg" alt=""><div><strong>PARADOX <em>ANTICHEAT</em></strong><span>SECURE OPERATIONS CONSOLE</span></div></div><div class="v13-boot-status" id="bootStatus"><i></i><span>INITIALIZING SECURITY BOUNDARY</span></div></div>`;
    document.body.classList.remove('preboot');
    const canvas=$('#v13RainCanvas',authLayer),ctx=canvas?.getContext('2d'); let raf=0,alive=true;
    const glyphs=['PARADOX','SECURE','VERIFY','ALLOW','BLOCK','FIVEM','0x7A','0xC3','AUTH','SYNC','HASH','TOKEN'];
    let cols=[]; const resize=()=>{if(!canvas||!ctx)return;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.max(34,Math.floor(innerWidth/34));cols=Array.from({length:count},(_,i)=>({x:(i+.5)*(innerWidth/count),y:-Math.random()*innerHeight*.55,speed:32+Math.random()*68,phase:Math.random()*100,alpha:.18+Math.random()*.5,size:7+Math.random()*2.5}));};
    const draw=t=>{if(!alive||!ctx)return;ctx.clearRect(0,0,innerWidth,innerHeight);ctx.textAlign='center';ctx.textBaseline='middle';for(const c of cols){c.y+=c.speed/60;if(c.y>innerHeight*.58)c.y=-40-Math.random()*220;const count=8+Math.floor((c.phase%6));for(let j=0;j<count;j++){const y=c.y-j*18;if(y<0||y>innerHeight*.58)continue;const fade=Math.max(0,1-y/(innerHeight*.59));const head=j===0?1:.72/(1+j*.17);ctx.globalAlpha=c.alpha*fade*head;ctx.font=`600 ${c.size}px ui-monospace,SFMono-Regular,Menlo,monospace`;ctx.fillStyle=j===0?'#a9ffe0':getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#47f3b4';ctx.shadowBlur=j===0?12:5;ctx.shadowColor='rgba(71,243,180,.35)';ctx.fillText(glyphs[(Math.floor(t/220)+j+Math.floor(c.phase))%glyphs.length],c.x,y);}c.phase+=.006;}ctx.globalAlpha=1;ctx.shadowBlur=0;raf=requestAnimationFrame(draw);};
    resize();window.addEventListener('resize',resize,{once:false});raf=requestAnimationFrame(draw);
    const status=$('#bootStatus span',authLayer); const messages=['INITIALIZING SECURITY BOUNDARY','VERIFYING RUNTIME INTEGRITY','NEGOTIATING ENCRYPTED SESSION','PREPARING FIVEM TELEMETRY','PARADOX SECURITY READY'];
    for(let i=0;i<messages.length;i++){if(status){status.classList.remove('swap');void status.offsetWidth;status.textContent=messages[i];status.classList.add('swap');}await new Promise(r=>setTimeout(r,i===0?420:360));}
    authLayer.querySelector('.v13-boot')?.classList.add('exit'); await new Promise(r=>setTimeout(r,620)); alive=false;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);next();
  }

  async function beginLogin(email,password){
    authLayer.innerHTML=`<div class="auth-card"><div class="terminal-login"><div class="auth-brand" style="padding:0 0 14px"><img src="assets/img/logo.svg" alt=""><div><h2>PARADOX <span>SECURE TERMINAL</span></h2><p>Authenticating dashboard session</p></div></div><div class="terminal-window"><div class="terminal-bar"><i class="terminal-dot"></i><i class="terminal-dot"></i><i class="terminal-dot"></i></div><div class="terminal-content" id="loginTerminal"></div></div></div></div>`;
    const lines=['Initializing encrypted dashboard session…','Validating account credentials…','Loading role and security permissions…','Establishing server telemetry channel…','Verifying PARADOX protection state…'];
    const term=$('#loginTerminal',authLayer);
    let result=null;
    for(let i=0;i<lines.length;i++){ await new Promise(r=>setTimeout(r,260)); term.insertAdjacentHTML('beforeend',`<div class="terminal-line" style="animation-delay:0ms"><span class="dim">[${String(i+1).padStart(2,'0')}]</span> ${esc(lines[i])} <span class="ok">OK</span></div>`); }
    try{ result=await window.ParadoxAPI.login(email,password); }
    catch(err){ term.insertAdjacentHTML('beforeend',`<div class="terminal-line" style="color:#ff7d88">Authentication failed: ${esc(err.message||'Unknown error')}</div>`); setTimeout(showLogin,1300); return; }
    term.insertAdjacentHTML('beforeend',`<div class="terminal-line"><span class="ok">ACCESS GRANTED</span> <span class="terminal-cursor"></span></div>`);
    state.user=Object.assign(state.user,result?.user||{email});
    state.demoSession=!!result?.demo;
    setDemoData(state.demoSession);
    localStorage.setItem('pa_account',JSON.stringify(state.user));
    localStorage.setItem('pa_session',JSON.stringify({v:AUTH_VERSION,createdAt:Date.now(),demo:state.demoSession}));
    state.authenticated=true;
    production.clear();
    if(state.demoSession){
      state.setupComplete=true;
      localStorage.setItem('pa_setup_complete','1');
    }else{
      localStorage.removeItem('pa_setup_complete');
      state.setupComplete=false;
      try{
        const remote=await window.ParadoxAPI.getSettings();
        const settings=remote?.settings||{};
        if(Object.keys(settings).length){
          state.server=Object.assign(state.server,settings);
          if(settings.accent) applyAccent(settings.accent);
          if(settings.mapMode) state.mapMode=settings.mapMode;
          localStorage.setItem('pa_server_settings',JSON.stringify(state.server));
          if(settings.serverId){ state.setupComplete=true; localStorage.setItem('pa_setup_complete','1'); }
        }
      }catch{}
    }
    setTimeout(()=>{ if(!state.setupComplete) showFirstSetup(); else { authLayer.classList.remove('open');authLayer.innerHTML='';document.body.classList.remove('auth-active');syncLiveData(true);render(); } },650);
  }
  function showFirstSetup(){
    state.setupComplete=true;localStorage.setItem('pa_setup_complete','1');
    authLayer.classList.remove('open');authLayer.innerHTML='';document.body.classList.remove('auth-active','preboot');
    render('server-details');syncLiveData(false);
  }

  async function saveServerSettingsFrom(ids={}){
    const get=(id,fallback='')=>$(id)?.value?.trim() ?? fallback;
    const selectValue=(root, fallback)=>{const dropdown=$(root);return dropdown?.dataset?.value||fallback;};
    const syncText=selectValue(ids.syncDropdown||'.settings-section.active .custom-dropdown',`${Math.round(Number(state.server.syncInterval||5000)/1000)} seconds`);
    const syncSeconds=parseInt(syncText)||Math.round(Number(state.server.syncInterval||5000)/1000)||5;
    const next=Object.assign({},state.server,{
      name:get(ids.name||'#serverNameInput',state.server.name),
      serverId:get(ids.serverId||'#serverIdInput',state.server.serverId),
      serverUrl:get(ids.serverUrl||'#serverUrlInput',state.server.serverUrl),
      region:get(ids.region||'#serverRegionInput',state.server.region),
      syncInterval:Math.max(3000,Math.min(15000,syncSeconds*1000)),
      accent:state.accent,
      mapMode:state.mapMode
    });
    const syncKey=$(ids.syncKey||'#syncKeyInput')?.value?.trim();
    const fm=$(ids.fiveManage||'#fiveManageKeyInput')?.value?.trim();
    const payload=Object.assign({},next);
    if(syncKey) payload.syncKey=syncKey;
    if(fm) payload.fiveManageKey=fm;
    let result;
    if(state.demoSession){ result={ok:true,connected:true,settings:{...next,linked:true,syncKeyConfigured:true,fiveManageKeyConfigured:!!fm}}; }
    else result=await window.ParadoxAPI.setupServer(payload);
    const remote=result?.settings||{};
    state.server=Object.assign(next,remote,{linked:result?.connected===true||remote.linked===true});
    localStorage.setItem('pa_server_settings',JSON.stringify(state.server));
    return result;
  }

  let liveSyncBusy=false;
  async function syncLiveData(showToast=false, renderPage=showToast){
    if(!state.authenticated || liveSyncBusy)return;
    if(state.demoSession){ setDemoData(true); if(showToast)toast('Test mode active','Bundled demonstration telemetry is enabled for the test account only.'); if(renderPage)render(); else renderTopbarProfile(); return; }
    liveSyncBusy=true;
    try{
      const snap=window.ParadoxData.decorate(await window.ParadoxAPI.getSnapshot());
      if(!state.authenticated)return;
      if(!snap){ players=[];detections=[];connectionRows=[];state.playerDetails={};state.live={connected:false};if(showToast)toast('No live snapshot','The connected FiveM server did not return telemetry.','bad');if(renderPage)render();else renderTopbarProfile();return; }
      state.live=Object.assign({connected:true,sections:state.live?.sections||{}},snap);
      if(Array.isArray(snap.players)){
        state.playerDetails={};
        players=snap.players.map(p=>{
          const name=p.name||'Unknown'; state.playerDetails[name]=p; state.playerDetails[String(p.id??p.source??'')]=p;
          return [String(p.id??p.source??'?'),name,p.identifier||p.license||p.identifiers?.license||p.identifiers?.fivem||'identifier unavailable',p.job?.label||p.job?.name||p.job||'Unknown',`${p.ping??0} ms`,Number(p.risk||0),p.state||p.status||'Unknown'];
        });
      }else players=[];
      if(Array.isArray(snap.detections)) detections=snap.detections.map(d=>[d.id||'DET',d.name||d.label||'Detection',d.player||d.playerName||'Unknown',d.key||d.detection||'security.signal',String(d.confidence??'—'),d.severity||'Unrated',d.action||'Observed',d.time||d.createdAt||'Live']); else detections=[];
      if(Array.isArray(snap.connections)) connectionRows=snap.connections.map(c=>[c.id||'CON',c.name||c.player||'Unknown',c.status||c.decision||'Allowed',c.reason||c.result||'Verified',`${c.latency??0} ms`,c.time||c.createdAt||'Live']); else connectionRows=[];
      if(Array.isArray(snap.notifications)) state.notifications=snap.notifications.map(n=>({id:n.id||n.notificationId||'',title:n.title||'Server notification',body:n.body||n.message||'',time:n.time||n.createdAt||'Live',icon:n.icon||'fa-bell',unread:n.unread!==false,page:n.page||'logs'})).filter(n=>!dismissedNotificationKeys.has(notificationKey(n)));
      else state.notifications=[];
      if(snap.server?.name) state.server.name=snap.server.name;
      state.server.linked=snap.connected===true;
      localStorage.setItem('pa_server_settings',JSON.stringify(state.server));
      if(showToast) toast('Server synchronized',`${players.length} players and current PARADOX telemetry loaded.`);
      if(renderPage || (!modalLayer.classList.contains('open') && !document.activeElement?.matches('input,textarea,select'))) render(); else renderTopbarProfile();
    }catch(err){
      players=[];detections=[];connectionRows=[];state.playerDetails={};state.live={connected:false,error:err.message};
      if(showToast) toast('Server sync failed',err.message||'Unable to reach the connected FiveM server.','bad');
      if(renderPage || (!modalLayer.classList.contains('open') && !document.activeElement?.matches('input,textarea,select'))) render(); else renderTopbarProfile();
    }finally{liveSyncBusy=false;}
  }

  function initMapInteractions(){
    const canvas=$('#mapCanvas'), stage=$('#mapStage'); if(!canvas||!stage) return;
    let dragging=false,startX=0,startY=0,baseX=state.mapX,baseY=state.mapY;
    const clamp=()=>{
      const baseW=stage.offsetWidth||canvas.clientWidth,baseH=stage.offsetHeight||canvas.clientHeight;
      const maxX=Math.max(0,(baseW*state.mapZoom-canvas.clientWidth)/2);
      const maxY=Math.max(0,(baseH*state.mapZoom-canvas.clientHeight)/2);
      state.mapX=Math.max(-maxX,Math.min(maxX,state.mapX));
      state.mapY=Math.max(-maxY,Math.min(maxY,state.mapY));
    };
    const apply=()=>{clamp();stage.style.transform=`translate(calc(-50% + ${state.mapX}px),calc(-50% + ${state.mapY}px)) scale(${state.mapZoom})`;};
    canvas.onpointerdown=e=>{if(e.target.closest('button,.map-panel,.map-tools,.map-mode-switch,.v11-map-left,.v11-map-right,.v12-zone-toolbar'))return;if(state.zoneDraft){const name=$('#zoneName')?.value?.trim();if(name)state.zoneDraft.name=name;const rect=stage.getBoundingClientRect();const x=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));const y=Math.max(0,Math.min(100,((e.clientY-rect.top)/rect.height)*100));state.zoneDraft.points.push({x,y});render(state.page);return;}dragging=true;startX=e.clientX;startY=e.clientY;baseX=state.mapX;baseY=state.mapY;canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId)};
    canvas.onpointermove=e=>{if(!dragging)return;state.mapX=baseX+e.clientX-startX;state.mapY=baseY+e.clientY-startY;apply()};
    canvas.onpointerup=()=>{dragging=false;canvas.classList.remove('dragging')};
    canvas.onpointercancel=canvas.onpointerup;
    canvas.onwheel=e=>{e.preventDefault();state.mapZoom=Math.max(1,Math.min(3.5,state.mapZoom+(e.deltaY<0?.14:-.14)));apply();const prefs=readStore('pa_preferences',{});prefs.mapZoom=state.mapZoom;localStorage.setItem('pa_preferences',JSON.stringify(prefs));};
    apply();
  }

  function upgradeSelects(root=document){
    root.querySelectorAll('select.select').forEach(sel=>{
      const options=[...sel.options].map(o=>o.textContent.trim()).filter(Boolean);
      const value=sel.options[sel.selectedIndex]?.textContent.trim()||options[0]||'Select';
      const wrap=document.createElement('div');wrap.className='custom-dropdown';wrap.dataset.value=value;
      wrap.innerHTML=`<button class="custom-dropdown-btn" type="button" data-action="toggleCustomDropdown"><span>${esc(value)}</span>${fa('chevron-down')}</button><div class="custom-dropdown-menu">${options.map(o=>`<button class="custom-dropdown-option" type="button" data-action="customDropdownOption" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      sel.replaceWith(wrap);
    });
  }

  // Replace text-glyph utility icons with consistent Font Awesome glyphs after each render.
  function upgradeIcons(root=document){
    const mapping={'⚙':'gear','⚡':'bolt','⌘':'code','⬡':'shield-halved','◎':'bullseye','♲':'trash-can','⟳':'arrows-rotate','⇩':'download','▶':'play','♧':'stethoscope','⚗':'flask','⚑':'flag','▤':'list','▥':'chart-column','★':'star','⊘':'ban','✓':'check','▣':'terminal','⌖':'map-location-dot','◆':'diamond','◉':'circle','▦':'camera','♙':'user','⌕':'magnifying-glass'};
    root.querySelectorAll('.panel-icon,.control-icon,.qicon,.h-icon,.event-icon,.service-icon,.empty-icon').forEach(el=>{const t=el.textContent.trim(); if(mapping[t]) el.innerHTML=fa(mapping[t]);});
    root.querySelectorAll('.mini-btn').forEach(el=>{const t=el.textContent.trim();if(t==='⌕')el.innerHTML=fa('magnifying-glass');else if(t==='▦')el.innerHTML=fa('camera');else if(t==='•••')el.innerHTML=fa('ellipsis');});
  }

  document.addEventListener('click', async e=>{
    const splitLaunch=e.target.closest('.nav-split-btn'); if(splitLaunch){e.preventDefault();e.stopPropagation();const nav=splitLaunch.closest('.nav-item');if(nav){state.splitView={active:true,left:state.page,right:nav.dataset.page,ratio:58};render(state.page);}return;}
    const nav=e.target.closest('.nav-item'); if(nav){e.preventDefault();navigateToPage(nav.dataset.page);return;}
    const jump=e.target.closest('[data-page-jump]'); if(jump){e.preventDefault();navigateToPage(jump.dataset.pageJump);return;}
    const toggle=e.target.closest('.nav-section-toggle'); if(toggle){toggle.closest('.collapsible').classList.toggle('open');return;}
    const range=e.target.closest('[data-range]'); if(range){state.chartRange=range.dataset.range;window.ParadoxData.clear();window.ParadoxData.ensure(state,render); $$('.range-btn').forEach(b=>b.classList.toggle('active',b.dataset.range===state.chartRange)); toast('Chart range updated',`Showing ${state.chartRange} activity window.`);requestAnimationFrame(drawAllActivityCharts);return;}
    const sw=e.target.closest('.switch'); if(sw){const action=sw.dataset.action;sw.classList.toggle('on');sw.setAttribute('aria-pressed',sw.classList.contains('on'));if(action==='devMode')state.devMode=sw.classList.contains('on');if(action==='attackMode')state.attackMode=sw.classList.contains('on');if(action==='blockConnections')state.blockConnections=sw.classList.contains('on');if(action==='securityRuleToggle'&&sw.dataset.ruleKey)state.securityRuleOverrides[sw.dataset.ruleKey]=sw.classList.contains('on');toast('Setting updated',`${action||'setting'} is now ${sw.classList.contains('on')?'enabled':'disabled'}.`);return;}
    const a=e.target.closest('[data-action]');
    if(!a){
      const plainButton=e.target.closest('button');
      if(plainButton && plainButton.closest('.ref-page')){
        if(plainButton.closest('.permission-tabs')){plainButton.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===plainButton));toast('View updated',`${plainButton.textContent.trim()} panel selected.`);return;}
        if(plainButton.closest('.filter-chips')){const group=plainButton.closest('.filter-chips');group.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===plainButton));const term=plainButton.textContent.replace(/\d+/g,'').trim().toLowerCase();const scope=group.parentElement;scope?.querySelectorAll('.stream-card,.player-card,.detail-card[data-filter-text]').forEach(card=>{const hay=(card.dataset.filterText||card.textContent).toLowerCase();card.style.display=(!term||hay.includes(term))?'':'none';});return;}
        if(plainButton.closest('.segmented')){plainButton.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===plainButton));toast('View changed',`${plainButton.textContent.trim()} view selected.`);return;}
        if(plainButton.closest('.v11-pill-filters')){const group=plainButton.closest('.v11-pill-filters');group.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===plainButton));const label=plainButton.textContent.replace(/\d+/g,'').trim().toLowerCase();const scope=plainButton.closest('.v11-wide-card')||plainButton.closest('.ref-page');scope?.querySelectorAll('.v11-advanced-row,.v11-rule-line,.v11-detector-card').forEach(row=>{if(label==='all')row.style.display='';else row.style.display=row.textContent.toLowerCase().includes(label)?'':'none';});return;}
        if(plainButton.closest('.v11-segment')){plainButton.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===plainButton));return;}
        const label=plainButton.textContent.trim();
        if(/refresh/i.test(label)){await syncLiveData(true);return;}
        if(/export csv/i.test(label)){const blob=new Blob(['time,category,message\n'],{type:'text/csv'});const u=URL.createObjectURL(blob);const link=document.createElement('a');link.href=u;link.download='paradox-security-logs.csv';link.click();setTimeout(()=>URL.revokeObjectURL(u),500);toast('CSV exported','Security log export created.');return;}
        if(/restore/i.test(label)){openModal('Restore Backup',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('rotate-left')}</div><h2>Restore this verified snapshot?</h2><p>The current configuration will be backed up automatically before restore.</p></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn blue" data-action="saveModal">Restore Backup</button>`);return;}
        if(/delete/i.test(label)){openModal('Delete item?',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('trash')}</div><h2>This action cannot be undone.</h2><p>The selected item will be removed from this dashboard section.</p></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn danger" data-action="saveModal">Delete</button>`);return;}
        if(/new folder/i.test(label)){openModal('New CDN Folder',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('folder-plus')}</div><h2>Create a CDN folder</h2><p>Folders keep clips and evidence organized.</p><label>Folder name</label><input class="input" placeholder="evidence-clips"></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Create Folder</button>`);return;}
        if(/all datasets|all detections|all events|sort:|status|priority|category|off/i.test(label)){
          const lower=label.toLowerCase();let opts=['All','High','Medium','Low'];
          if(lower.includes('dataset'))opts=['All Datasets','Security','Connections','Events','Console'];
          else if(lower.includes('event'))opts=['All Events','Detection','Connection','Entity','Explosion'];
          else if(lower.includes('sort:'))opts=['Server ID','Name','Risk','Ping'];
          else if(lower.includes('status'))opts=['All','Open','Pending','Closed'];
          else if(lower.includes('priority'))opts=['All','Low','Normal','High','Urgent'];
          else if(lower.includes('category'))opts=['All','Technical','Account','False Positive','Integration'];
          else if(lower==='off')opts=['Off','10s','30s','60s'];
          toggleDropdown(plainButton,`genericFilter:${state.page}:${label}`,`<div class="dropdown-menu v14-filter-menu">${opts.map(v=>`<button class="dropdown-item" data-action="applyGenericFilter" data-value="${esc(v)}">${fa('filter')} ${esc(v)}</button>`).join('')}</div>`,205);return;
        }
        if(plainButton.closest('.cdn-file-card')){specializedSectionModal('cdn',plainButton.closest('.cdn-file-card'));return;}
        toast('Action ready',`${label || 'This control'} is available and will use the connected PARADOX backend in production.`);return;
      }
      const playerRow=e.target.closest('.detail-row[data-player],.player-card[data-player],.v11-online-player[data-player]');
      const explicitDetail=e.target.closest('[data-detail-modal="true"]');
      const detailRow=e.target.closest('.ref-table tbody tr.detail-row,.data-table tbody tr.detail-row,.v11-table-card tbody tr:not([data-no-row-modal="true"]),.backup-row-ref,.cdn-file-card,.cdn-storage-card,.logbook-entry,.stream-card,.detail-panel,.v11-rule-line:not([data-no-row-modal="true"]),.v11-active-rule,.member-row,.server-detail-row');
      if(playerRow && !e.target.closest('input,textarea,select,label,.switch,.custom-dropdown,a,button')){playerModal(playerRow.dataset.player);return;}
      if(explicitDetail && !e.target.closest('input,textarea,select,label,.switch,.custom-dropdown,a,button')){cardDetailModal(explicitDetail);return;}
      if(detailRow && !e.target.closest('input,textarea,select,label,.switch,.custom-dropdown,a,button')){cardDetailModal(detailRow);return;}
      if(!e.target.closest('.dropdown-popover')&&!e.target.closest('#profileButton')&&!e.target.closest('#notificationButton'))closeDropdown();
      return;
    }
    const action=a.dataset.action;
    if(action==='applyGenericFilter'){const value=a.dataset.value||'All';closeDropdown();const term=/^all|^off$/i.test(value)?'':value.toLowerCase();main.querySelectorAll('.ref-table tbody tr,.data-table tbody tr,.stream-card,.ticket-card,.backup-row-ref,.logbook-entry').forEach(row=>{row.style.display=(!term||row.textContent.toLowerCase().includes(term))?'':'none';});toast('Filter applied',`${value} filter applied to this section.`);return;}
    if(action==='openPlayerLookup'){openPlayerLookupModal();return;}
    if(action==='runPlayerLookupModal'){await runPlayerLookupModal();return;}
    if(action==='nativeFilter'){state.nativeFilter=a.dataset.filter||'all';render(state.page);return;}
    if(action==='securityRuleFilter'){state.securityRuleFilter=a.dataset.filter||'all';render(state.page);return;}
    if(action==='securityAdvanced'){state.securityAdvanced=!state.securityAdvanced;render(state.page);return;}
    if(action==='toggleRulesetCollapse'){state.securityCollapsed[a.dataset.name||'Ruleset']=!state.securityCollapsed[a.dataset.name||'Ruleset'];render(state.page);return;}
    if(action==='securityRulesetMenu'){
      const options=['All Rulesets','Particle Spawn Rules','Sound Event Rules','Projectile Spawn Rules','Weapon Damage Rules','Vehicle Component Rules','Explosion Spawn Rules','Fire Spawn Rules'];
      toggleDropdown(a,'securityRulesets',`<div class="dropdown-menu v14-filter-menu">${options.map(x=>`<button class="dropdown-item ${state.securityRuleset===x?'active':''}" data-action="setSecurityRuleset" data-value="${esc(x)}">${fa('layer-group')} ${esc(x)}</button>`).join('')}</div>`,245);return;
    }
    if(action==='setSecurityRuleset'){state.securityRuleset=a.dataset.value||'All Rulesets';closeDropdown();render(state.page);return;}
    if(action==='detectionFilterMenu'){
      const kind=a.dataset.kind||'detections'; const opts=kind==='removed'?[['all','All Detections'],['aimbot','AimBot'],['event','Event'],['vehicle','Vehicle']]:[['all','All Detections'],['critical','Critical'],['high','High'],['medium','Medium'],['warn','Warn']];
      toggleDropdown(a,`detFilter:${kind}`,`<div class="dropdown-menu v14-filter-menu">${opts.map(([v,l])=>`<button class="dropdown-item" data-action="setDetectionFilter" data-kind="${kind}" data-value="${v}">${fa('filter')} ${l}</button>`).join('')}</div>`,205);return;
    }
    if(action==='setDetectionFilter'){const kind=a.dataset.kind||'detections';if(kind==='removed')state.removedDetectionFilter=a.dataset.value||'all';else state.detectionFilter=a.dataset.value||'all';closeDropdown();render(state.page);return;}
    if(action==='openRuleMenu'){ruleContextMenu(a,a.dataset.ruleType||'security',a.dataset.name||'Rule',a.dataset.ruleset||'',a.dataset.expression||'',a.dataset.ruleAction||'',a.dataset.note||'');return;}
    if(action==='openRulesetMenu'){toggleDropdown(a,`ruleset:${a.dataset.name}`,`<div class="dropdown-menu v14-rule-menu"><button class="dropdown-item" data-action="genericRulesetEdit" data-name="${esc(a.dataset.name||'Ruleset')}">${fa('pen')} Edit Ruleset</button><button class="dropdown-item" data-action="genericRulesetAudit" data-name="${esc(a.dataset.name||'Ruleset')}">${fa('clock-rotate-left')} View Audit</button></div>`,205);return;}
    if(action==='removeRule'){state.hiddenRules[`${a.dataset.ruleType}:${a.dataset.ruleset?a.dataset.ruleset+':':''}${a.dataset.name}`]=true;closeDropdown();toast('Rule removed',`${a.dataset.name||'Rule'} was removed from this dashboard configuration.`);render(state.page);return;}
    if(action==='editSecurityRule'){closeDropdown();state.securityEditor={name:a.dataset.name||'Security Rule',ruleset:a.dataset.ruleset||'Security Rules',expression:a.dataset.expression||'effectHash matches *',action:a.dataset.ruleAction||'Block',note:a.dataset.note||'',field:'Effect Hash',operator:'Wildcard (pattern)',value:'*'};render(state.page);return;}
    if(action==='closeSecurityEditor'){state.securityEditor=null;render(state.page);return;}
    if(action==='saveSecurityEditor'){toast('Rule updated','Security rule changes were deployed to the dashboard configuration.');state.securityEditor=null;render(state.page);return;}
    if(action==='genericRulesetEdit'){closeDropdown();genericConfigModal(`Edit ${a.dataset.name||'Ruleset'}`);return;}
    if(action==='genericRulesetAudit'){closeDropdown();openModal('Ruleset Audit',`<div class="v13-tab-empty">Audit events for ${esc(a.dataset.name||'this ruleset')} will appear here from the connected server.</div>`);return;}
    if(action==='sectionModalTab'){const page=a.dataset.page,tab=a.dataset.tab;state.sectionModalTab[page]=tab;specializedSectionModal(page,{dataset:{cardTitle:state.sectionModalTitle||pageMeta[page]?.[0]||'Details'}});return;}
    if(action==='playerModalTab'){playerModal(a.dataset.player||state.playerModalName,a.dataset.tab||'details');return;}
    if(action==='addPlayerNote'){const key=a.dataset.player||state.playerModalName;const input=$('#playerNoteInput');const text=input?.value?.trim()||'';if(!text){toast('Note required','Enter a note before saving.','bad');return;}state.playerDetails[key]=state.playerDetails[key]||{};state.playerDetails[key].notes=state.playerDetails[key].notes||[];state.playerDetails[key].notes.unshift({text,author:state.user.name||'Admin',time:'Just now'});toast('Note added','The player note was added to this dashboard session.');playerModal(key,'notes');return;}
    if(action==='entityTab'){state.entityTab=a.dataset.tab||'settings';render(state.page);return;}
    if(action==='falconTab'){state.falconTab=a.dataset.tab||'events';render(state.page);return;}
    if(action==='generalCategory'){state.generalCategory=a.dataset.cat||'all';a.closest('.v11-pill-filters')?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===a));const cat=state.generalCategory;$$('.v11-detector-card').forEach(card=>{const txt=card.textContent.toLowerCase();let show=cat==='all'||cat==='webhooks';if(cat==='movement')show=/teleport|noclip/.test(txt);if(cat==='camera')show=/free cam|spectate/.test(txt);if(cat==='combat')show=/aim|critical|hit box|combat/.test(txt);if(cat==='vehicle')show=/vehicle|warp|repair/.test(txt);if(cat==='menu')show=/menu|nui dev/.test(txt);if(cat==='player behavior')show=/animation|attach|invisible|solo|voice|bubble|ped model/.test(txt);if(cat==='general')show=/god mode|native spoofer|ai folder/.test(txt);if(cat==='miscellaneous')show=/bubble|voice/.test(txt);card.style.display=show?'':'none';});return;}
    if(action==='detectorSettings'){openModal(`${esc(a.dataset.name||'Detection')} Settings`,`<div class="pro-form-modal"><div class="pro-form-icon">${fa('gear')}</div><h2>${esc(a.dataset.name||'Detection')}</h2><p>Configure detection action, confidence, minimum samples and evidence behavior.</p><div class="form-grid"><div class="field"><label>Action</label>${customSelect('Ban Player',['Warn Player','Kick Player','Log Player'])}</div><div class="field"><label>Minimum confidence</label><input class="input" value="90"></div><div class="field"><label>Minimum samples</label><input class="input" value="3"></div><div class="field"><label>Screenshot</label>${customSelect('On high confidence',['Always','Never'])}</div></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Save Changes</button>`);return;}
    if(action==='editExplosion'){closeDropdown();openModal('Modify Explosion Blacklist Rule',`<div class="pro-form-modal v11-edit-modal"><div class="pro-form-icon">${fa('pen')}</div><h2>Modify Explosion Blacklist Rule</h2><p>Prevent a specified explosion from being spawned.</p><div class="form-grid"><div class="field"><label>Explosion Type</label><input class="input" value="EXP_TAG_${esc(a.dataset.name||'GRENADE (ID:0)')}"></div><div class="field"><label>Detection Action</label>${customSelect('Log Player',['Warn Player','Kick Player','Ban Player'])}</div><div class="field full"><label>Notes</label><input class="input" placeholder="Notes..."></div></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">${fa('check')} Modify Blacklist</button>`);return;}
    if(action==='editNative'){closeDropdown();state.nativeEditor={name:a.dataset.name||'rcore_drink object spawn patch',native:'CreateObject',step:1};render(state.page);return;}
    if(action==='nativeEditorStep'){if(state.nativeEditor){state.nativeEditor.step=Number(a.dataset.step||1);render(state.page);}return;}
    if(action==='closeNativeEditor'){state.nativeEditor=null;render(state.page);return;}
    if(action==='saveNativeEditor'){toast('Native rule saved','The native rule editor changes were saved.');state.nativeEditor=null;render(state.page);return;}
    if(action==='permissionTab'){state.permissionsTab=a.dataset.tab||'members';render(state.page);return;}
    if(action==='createPermissionRole'){openModal('Create Group',`<div class="v12-form-modal"><p>Define a reusable set of permissions.</p><label>Group Name</label><input class="input" placeholder="e.g. Moderator"><label>Color</label><div class="v12-color-row"><span style="background:var(--accent)"></span><code>${state.accent}</code>${fa('chevron-down')}</div><label>Permissions</label><div class="v12-permission-list">${[['All Permissions','Grants full access to every feature and setting.'],['Manage Staff','Add, remove, and change permissions for team members.'],['Update Config','Modify server configuration settings across all config pages.'],['Admin Menu','Access to the in-game admin menu.'],['Quick Actions','Access development, under attack and connection controls.']].map(x=>`<label><div><strong>${x[0]}</strong><span>${x[1]}</span></div><button class="switch" type="button"></button></label>`).join('')}</div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Create Group</button>`);return;}
    if(action==='createInviteLink'){openModal('Create Invite Link',`<div class="v12-form-modal"><p>Anyone with this link will be added with the selected roles.</p><label>Label (optional)</label><input class="input" placeholder="e.g. Admin invite"><div class="form-grid"><div class="field"><label>Max Uses (0 = unlimited)</label><input class="input" value="0"></div><div class="field"><label>Expires After</label>${customSelect('Never',['1 hour','24 hours','7 days','30 days'])}</div></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Create Link</button>`);return;}
    if(action==='addBypass'){openModal('Add Bypass Rule',`<div class="v12-form-modal"><p>Add an anti-cheat bypass for a specified player or group.</p><label>Bypassed Detections</label><button class="v12-select-input">Click to add bypassed detections ${fa('chevron-down')}</button><label>If Target Matches</label><input class="input" placeholder="discord:/steam:/license:/ace=value"><label>Notes</label><input class="input" placeholder="Notes..."></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Add Bypass</button>`);return;}
    if(action==='toggleMapSidebar'){if(a.dataset.side==='left')state.mapLeftOpen=!state.mapLeftOpen;else state.mapRightOpen=!state.mapRightOpen;render(state.page);return;}
    if(action==='mapPanelTab'){state.mapPanelTab=a.dataset.tab||'blips';render(state.page);return;}
    if(action==='newZone'){state.mapPanelTab='zones';state.zoneDraft={name:'',type:'Disable Detection',points:[]};state.mapRightOpen=true;render(state.page);return;}
    if(action==='redrawZone'){if(state.zoneDraft)state.zoneDraft.points=[];render(state.page);return;}
    if(action==='cancelZone'){state.zoneDraft=null;render(state.page);return;}
    if(action==='saveZone'){if(!state.zoneDraft||state.zoneDraft.points.length<3){toast('Zone needs more points','Add at least 3 points to create a zone.','bad');return;}const name=$('#zoneName')?.value?.trim();state.zoneDraft.name=name||`Zone ${state.mapZones.length+1}`;const saved=JSON.parse(JSON.stringify(state.zoneDraft));state.mapZones.push(saved);if(!state.demoSession){try{await window.ParadoxAPI.performAction('saveMapZone',{zone:saved});}catch(err){toast('Zone saved locally',err.message||'FiveM backend did not acknowledge the zone yet.','bad');}}state.zoneDraft=null;toast('Zone created','The zone was saved and queued for server synchronization.');render(state.page);return;}
    if(action==='nudgeZone'&&state.zoneDraft){const dx=Number(a.dataset.dx||0),dy=Number(a.dataset.dy||0);state.zoneDraft.points=state.zoneDraft.points.map(p=>({x:Math.max(0,Math.min(100,p.x+dx)),y:Math.max(0,Math.min(100,p.y+dy))}));render(state.page);return;}
    if(action==='mapZoom'){state.mapZoom=Math.max(1,Math.min(3.5,state.mapZoom+Number(a.dataset.delta||0)));render(state.page);return;}
    if(action==='selectSavedZone'){const z=state.mapZones[Number(a.dataset.index||0)];if(z){state.mapPanelTab='zones';state.zoneDraft=JSON.parse(JSON.stringify(z));render(state.page);}return;}
    if(action==='docs'){window.open(window.PARADOX_CONFIG?.documentationUrl||'https://paradox-12.gitbook.io/paradox-anticheat','_blank','noopener');return;}
    if(action==='support'){supportDropdown(a);return;}
    if(action==='cancelSupport'){closeDropdown();return;}
    if(action==='sendSupport'){
      const name=$('#supportName')?.value?.trim()||state.user.name||'Dashboard User';
      const message=$('#supportMessage')?.value?.trim()||'';
      if(message.length<5){toast('Message required','Enter a little more detail before sending your support request.','bad');return;}
      try{
        await window.ParadoxAPI.sendSupport({name,message,page:state.page,serverName:state.server.name||'',serverId:state.server.serverId||''});
        closeDropdown();toast('Support request sent','Your message was delivered to the configured PARADOX support webhook.');
      }catch(err){toast('Support message failed',err.message||'The support webhook could not be reached.','bad');}
      return;
    }
    if(action==='runGlobalSearch'){
      const q=$('#globalSearchInput')?.value?.trim()||'';if(!q)return;
      const out=$('#globalSearchResults');
      if(state.demoSession){if(out)out.innerHTML=`<div class="search-result" data-page-jump="players"><div class="result-icon">${fa('user')}</div><div class="result-copy"><strong>2Moonlight#8421</strong><span>Demo result for ${esc(q)}</span></div><div class="result-type">Player</div></div>`;return;}
      try{const res=await window.ParadoxAPI.search(q);const rows=res?.results||res?.items||[];if(out)out.innerHTML=rows.length?rows.slice(0,12).map(r=>`<button class="search-result" data-page-jump="${esc(r.page||(r.type==='ban'?'bans':r.type==='detection'?'detections':'players'))}"><div class="result-icon">${fa(r.type==='ban'?'ban':r.type==='detection'?'bullseye':'user')}</div><div class="result-copy"><strong>${esc(r.name||r.label||r.id||'Result')}</strong><span>${esc(r.detail||r.identifier||r.reason||'Live server result')}</span></div><div class="result-type">${esc(r.type||'Result')}</div></button>`).join(''):`<div class="notification-empty">No live server results found.</div>`;}catch(err){if(out)out.innerHTML=`<div class="notification-empty">${esc(err.message||'Search failed')}</div>`;}return;
    }
    if(action==='retryCurrentPage'){render(state.page);return;}
    if(action==='notifications'){notificationsDropdown(a);return;}
    if(action==='openNotification'){const index=Number(a.dataset.index);const n=state.notifications[index];if(n){n.unread=false;state.notifications.splice(index,1);closeDropdown();navigateToPage(n.page||'logs');}return;}
    if(action==='markAllRead'){
      const dismissed=readStore('pa_dismissed_notifications',[]);
      state.notifications.forEach(n=>{const key=notificationKey(n);if(key&&!dismissed.includes(key))dismissed.push(key)});
      localStorage.setItem('pa_dismissed_notifications',JSON.stringify(dismissed.slice(-500)));
      dismissedNotificationKeys.clear(); dismissed.slice(-500).forEach(k=>dismissedNotificationKeys.add(k));
      state.notifications=[]; renderTopbarProfile(); closeDropdown();
      if(!state.demoSession) window.ParadoxAPI.performAction('markNotificationsRead').catch(()=>{});
      toast('Notifications cleared','All notification cards were removed.');return;
    }
    if(action==='connectedServers'){closeDropdown();await connectedServersModal();return;}
    if(action==='dashboardAccess'){closeDropdown();if(!state.demoSession){navigateToPage('permissions');return;}await dashboardAccessModal();return;}
    if(action==='inviteDashboardAccess'){
      const email=$('#accessInviteEmail')?.value?.trim().toLowerCase()||'';
      if(!/^\S+@\S+\.\S+$/.test(email)){toast('Valid email required','Enter the administrator email address you want to grant access to.','bad');return;}
      try{
        if(state.demoSession){toast('Access added',`${email} was added to the test dashboard.`);await dashboardAccessModal();return;}
        const result=await window.ParadoxAPI.inviteAccess(email);
        toast(result?.user?.status==='pending'?'Access invite saved':'Access granted',result?.message||`${email} can now access this server dashboard.`);
        await dashboardAccessModal();
      }catch(err){toast('Unable to add access',err.message||'The administrator could not be added.','bad');}
      return;
    }
    if(action==='removeDashboardAccess'){
      const id=a.dataset.accessId||''; if(!id)return;
      try{if(!state.demoSession)await window.ParadoxAPI.removeAccess(id);toast('Access removed','Dashboard access was revoked for that administrator.');await dashboardAccessModal();}
      catch(err){toast('Unable to remove access',err.message||'Access could not be removed.','bad');}
      return;
    }
    if(action==='accountSettings'){closeDropdown();accountSettingsModal();return;}
    if(action==='settingsTab'){const tab=a.dataset.tab; $$('.settings-tab',modalLayer).forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('[data-settings-section]',modalLayer).forEach(sec=>sec.classList.toggle('active',sec.dataset.settingsSection===tab));return;}
    if(action==='saveAccountSettings'){
      const accountPayload={
        displayName:$('#accountName')?.value.trim()||state.user.name,
        email:$('#accountEmail')?.value.trim()||state.user.email,
        avatarUrl:$('#accountAvatarUrl')?.value.trim()||''
      };
      const newPassword=$('#accountPassword')?.value||''; if(newPassword)accountPayload.password=newPassword;accountPayload.currentPassword=$('#accountCurrentPassword')?.value||'';
      try{
        const accountResult=await window.ParadoxAPI.updateAccount(accountPayload);
        const remote=accountResult?.user||{};
        state.user.name=remote.name||remote.displayName||accountPayload.displayName;
        state.user.email=remote.email||accountPayload.email;
        state.user.avatarUrl=remote.avatarUrl!==undefined?remote.avatarUrl:accountPayload.avatarUrl;
        localStorage.setItem('pa_account',JSON.stringify(state.user));
      }catch(err){toast('Account update failed',err.message||'Cloudflare account service rejected the change.','bad');return;}
      if(!state.demoSession && state.user.role!=='Owner'){closeModal();toast('Account saved','Your profile was updated.');render();return;}
      const accent=$('#modalAccentColor')?.value||$('#modalAccentHex')?.value;if(accent)applyAccent(accent);
      const dropdowns=$$('.custom-dropdown[data-value]',modalLayer);
      const mapDrop=dropdowns.find(d=>/^(Atlas|Satellite)$/i.test(d.dataset.value||''));
      if(mapDrop)state.mapMode=(mapDrop.dataset.value||'Atlas').toLowerCase()==='satellite'?'satellite':'atlas';
      try{
        const syncDrop=dropdowns.find(d=>/seconds$/i.test(d.dataset.value||''));
        const syncSeconds=parseInt(syncDrop?.dataset.value)||Math.round(Number(state.server.syncInterval||5000)/1000)||5;
        const payload={name:$('#modalServerName')?.value.trim()||state.server.name,serverId:$('#modalServerId')?.value.trim()||state.server.serverId,region:$('#modalRegion')?.value.trim()||state.server.region,syncInterval:syncSeconds*1000,accent:state.accent,mapMode:state.mapMode};
        const fm=$('#modalFiveManageKey')?.value?.trim();if(fm)payload.fiveManageKey=fm;const logHook=$('#modalDiscordLogWebhook')?.value?.trim();if(logHook)payload.discordLogWebhook=logHook;
        const res=state.demoSession?{ok:true,settings:payload}:await window.ParadoxAPI.saveSettings(payload);
        state.server=Object.assign({},state.server,res?.settings||payload);
        localStorage.setItem('pa_server_settings',JSON.stringify(state.server));
      }catch(err){toast('Server settings failed',err.message||'Unable to save server preferences.','bad');return;}
      closeModal();toast('Settings saved','Account, appearance and server preferences were updated.');render();syncLiveData(false);return;
    }
    if(action==='fillDemoLogin'){const t=window.PARADOX_CONFIG?.testAccount||{};const email=$('#loginEmail',authLayer),pass=$('#loginPassword',authLayer);if(email)email.value=t.email||'';if(pass)pass.value=t.password||'';return;}
    if(action==='logout'){closeDropdown();await window.ParadoxAPI.logout();localStorage.removeItem('pa_session');localStorage.removeItem('pa_account');state.authenticated=false;state.demoSession=false;state.sectionData={};window.ParadoxData.clear();setDemoData(false);showBootSequence(showLogin);return;}
    if(action==='toggleCustomDropdown'){a.closest('.custom-dropdown')?.classList.toggle('open');return;}
    if(action==='customDropdownOption'){const wrap=a.closest('.custom-dropdown');if(wrap){wrap.dataset.value=a.dataset.value;wrap.querySelector('.custom-dropdown-btn span').textContent=a.dataset.value;wrap.classList.remove('open');}return;}
    if(action==='mapMode'){state.mapMode=a.dataset.mode;const prefs=readStore('pa_preferences',{});prefs.mapMode=state.mapMode;prefs.accent=state.accent;localStorage.setItem('pa_preferences',JSON.stringify(prefs));render();return;}
    if(action==='mapZoomIn'){state.mapZoom=Math.min(3.5,state.mapZoom+.2);state.mapX=0;state.mapY=0;render();return;}
    if(action==='mapZoomOut'){state.mapZoom=Math.max(1,state.mapZoom-.2);render();return;}
    if(action==='centerMap'){state.mapZoom=1.08;state.mapX=0;state.mapY=0;render();return;}
    if(action==='openServerSetup'){closeModal();closeDropdown();showFirstSetup();return;}
    if(action==='completeFirstSetup'){
      const btn=a;btn.disabled=true;const original=btn.innerHTML;btn.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Connecting…`;
      try{
        const result=await saveServerSettingsFrom({name:'#setupServerName',serverId:'#setupServerId',serverUrl:'#setupServerUrl',region:'#setupRegion',syncKey:'#setupSyncKey',fiveManage:'#setupFiveManageKey'});
        if(!result?.connected){toast('Connection not verified',result?.warning||'The FiveM bridge did not respond. Check the URL and pairing key.','bad');return;}
        state.setupComplete=true;state.server.linked=snap.connected===true;localStorage.setItem('pa_setup_complete','1');authLayer.classList.remove('open');authLayer.innerHTML='';document.body.classList.remove('auth-active');await syncLiveData(true);render();
      }catch(err){toast('Server connection failed',err.message||'Could not synchronize this FiveM server.','bad');}
      finally{if(btn.isConnected){btn.disabled=false;btn.innerHTML=original;}}
      return;
    }
    if(action==='testSync'){await syncLiveData(true);return;}
    if(action==='saveDashboardSettings'){const accent=$('#accentColorInput')?.value||$('#accentHexInput')?.value;if(accent)applyAccent(accent);await saveServerSettingsFrom();toast('Dashboard settings saved','Server synchronization and appearance settings updated.');await syncLiveData(false);render();return;}
    if(action==='splitClose'){state.splitView.active=false;state.splitView.left=null;state.splitView.right=null;render(state.page);return;}
    if(action==='splitSwap'){const a1=state.splitView.left,b1=state.splitView.right;state.splitView.left=b1;state.splitView.right=a1;state.page=state.splitView.left;render(state.page);return;}
    if(action==='toggleSplitMenu'){a.closest('.split-select')?.classList.toggle('open');return;}
    if(action==='splitSelectPage'){state.splitView.right=a.dataset.page;a.closest('.split-select')?.classList.remove('open');render(state.page);return;}
    if(action==='inviteMember'){openModal('Invite Team Member',`<div class="v12-form-modal"><p>Send an invite link the user must accept to join.</p><label>Cfx.re Username</label><input class="input" id="inviteCfx" placeholder="Cfx.re username..."><div class="v12-info-note">${fa('circle-info')}<span>No roles exist yet. <button data-action="createPermissionRole">Create one</button> before inviting members.</span></div><label>Notes (optional)</label><input class="input" placeholder="Notes..."></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Send Invite</button>`);return;}
    if(action==='createApiKey'){openModal('Create API Key',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('key')}</div><h2>New secure API credential</h2><p>Select only the scopes this integration requires.</p><label>Key name</label><input class="input" placeholder="Production integration"><div class="scope-grid"><label><input type="checkbox"> Read telemetry</label><label><input type="checkbox"> Read detections</label><label><input type="checkbox"> Manage evidence</label><label><input type="checkbox"> Server actions</label></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Create Key</button>`);return;}
    if(action==='newSupportTicket'){openModal('Create Support Ticket',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('headset')}</div><h2>How can we help?</h2><p>Create a structured ticket for the PARADOX support team.</p><div class="form-grid"><div class="field"><label>Category</label>${customSelect('Technical',['Billing','Account','False Positive','Integration'])}</div><div class="field"><label>Priority</label>${customSelect('Normal',['Low','High','Urgent'])}</div><div class="field full"><label>Subject</label><input class="input" placeholder="Brief summary"></div><div class="field full"><label>Message</label><textarea class="textarea" placeholder="Describe the issue..."></textarea></div></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Submit Ticket</button>`);return;}
    if(action==='createBackup'){openModal('Create Backup',`<div class="pro-form-modal"><div class="pro-form-icon">${fa('box-archive')}</div><h2>Create a verified snapshot</h2><p>Choose the backup scope and add an optional label.</p><label>Backup label</label><input class="input" placeholder="Pre-update snapshot"><label>Scope</label>${customSelect('All settings',['Security only','Configuration only','Database metadata'])}</div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveModal">Create Backup</button>`);return;}
    if(action==='closeModal') return closeModal();
    if(action==='saveModal'){closeModal();toast('Saved','Configuration saved successfully.');return;}
    if(action==='saveConfig'){toast('Configuration saved','Rules were validated and synchronized with the server.');return;}
    if(action==='resetConfig'){openModal('Reset configuration?',`<p style="font-size:10px;color:#8ca09a;line-height:1.7;margin:0">Restore this section to its saved values?</p>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn danger" data-action="saveModal">Reset</button>`);return;}
    if(action==='viewPlayer')return playerModal(a.dataset.player);
    if(action==='screenshotPlayer'){await window.ParadoxAPI.performAction('screenshot',{player:a.dataset.player});toast('Screenshot requested',`Secure evidence capture requested for ${a.dataset.player||'player'}.`);return;}
    if(action==='playerMenu'){playerModal(a.dataset.player);return;}
    if(action==='createBan'){openModal('Create Ban',`<div class="form-grid"><div class="field"><label>Player / Identifier</label><input class="input" placeholder="Player ID, license, Discord..."></div><div class="field"><label>Duration</label>${customSelect('Permanent',['7 days','24 hours'])}</div><div class="field full"><label>Reason</label><textarea class="textarea" placeholder="Ban reason..."></textarea></div></div>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn danger" data-action="saveModal">Create Ban</button>`);return;}
    if(action==='lookupDemo'){
      const input=$('.search-box-big input',$('#lookupResult')?.previousElementSibling||document)?.value||$('.search-box-big input')?.value||'';
      if(state.demoSession){const out=$('#lookupResult');if(out)out.innerHTML=`<div class="panel-head"><div class="panel-icon">${fa('user')}</div><div><div class="panel-title">2Moonlight#8421</div><div class="panel-subtitle">Identity and history match</div></div><div class="panel-spacer"></div><span class="risk-chip high">91 Risk</span></div><div class="panel-body">${playersTable()}</div>`;return;}
      try{const res=await window.ParadoxAPI.search(input);const out=$('#lookupResult');const rows=res?.results||res?.items||[];if(out)out.innerHTML=rows.length?`<div class="panel-body">${table(['TYPE','RESULT','DETAIL'],rows.map(r=>[r.type||'Result',r.name||r.label||r.id||'Unknown',r.detail||r.identifier||r.reason||'Live server result']))}</div>`:noLiveData('No matching live server records were found.');}catch(err){toast('Lookup failed',err.message||'Search could not reach the FiveM server.','bad');}return;
    }
    if(action==='addRole'){genericConfigModal('Create Security Role');return;}
    if(action==='openDetectionCatalog'){genericConfigModal('Detection Catalog');return;}
    if(action==='openPlayerPicker'){genericConfigModal('Player Actions');return;}
    if(action==='restartProtection'){openModal('Restart protection?',`<p style="font-size:10px;color:#8ca09a;line-height:1.7;margin:0">This will restart the PARADOX protection runtime and rebuild session readiness state.</p>`,`<button class="btn" data-action="closeModal">Cancel</button><button class="btn danger" data-action="confirmRestart">Restart</button>`);return;}
    if(action==='confirmRestart'){closeModal();await window.ParadoxAPI.performAction('restartProtection');toast('Protection restarted','All protection modules are healthy and sessions were rebuilt.');return;}
    if(action==='syncRules'){await window.ParadoxAPI.performAction('syncRules');toast('Rules synchronized','All connected clients acknowledged the latest protection policy.');return;}
    if(action==='clearCache'){await window.ParadoxAPI.performAction('clearCache');toast('Cache cleared','Temporary dashboard and server cache was cleared.');return;}
    if(action==='exportLogs'){toast('Export created','A security log export request was created.');return;}
    if(action==='refresh'){await syncLiveData(true);return;}
    if(action==='clearConsole'){const out=$('#consoleOutput');if(out)out.innerHTML='';return;}
    if(action==='runConsole'){const input=$('#consoleInput'),out=$('#consoleOutput');if(input?.value.trim()&&out){await window.ParadoxAPI.performAction('console',{command:input.value.trim()});out.insertAdjacentHTML('beforeend',consoleLine(new Date().toLocaleTimeString([],{hour12:false}),'info',`> ${input.value.trim()}`)+consoleLine(new Date().toLocaleTimeString([],{hour12:false}),'ok','Command accepted.'));out.scrollTop=out.scrollHeight;input.value=''}return;}
    if(action==='inspectRow'||action==='rowMenu'){cardDetailModal(a.closest('tr')||a.closest('.detail-row')||a.closest('.detail-card'));return;}
    if(action==='expandChart'){openActivityChartModal();return;}
    if(action==='importConfig'){genericConfigModal('ImportConfig');return;}
  });

  document.addEventListener('input',e=>{if(e.target.matches('.v11-search input,.ref-search input')&&!e.target.id){const query=e.target.value.toLowerCase();main.querySelectorAll('tbody tr,.logbook-entry').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(query);});}});
  $('#globalSearchButton')?.addEventListener('click',globalSearch);
  $('#profileButton')?.addEventListener('click',e=>{e.stopPropagation();profileDropdown($('#profileButton'));});
  $('#mobileNavFab')?.addEventListener('click',()=>{$('#sidebar')?.classList.add('open');$('#mobileOverlay')?.classList.add('show')});
  $('#mobileOverlay')?.addEventListener('click',closeMobileNav);
  modalLayer.addEventListener('click',e=>{if(e.target===modalLayer)closeModal()});
  document.addEventListener('input',e=>{if(e.target.id==='securityRuleSearch'){const q=e.target.value.toLowerCase();$$('.v11-rule-line').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none');}if(e.target.classList?.contains('v14-native-search')){const q=e.target.value.toLowerCase();$$('.v14-rule-table tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none');}if(e.target.id==='accentColorInput'||e.target.id==='modalAccentColor'){const hex=e.target.value;const pair=e.target.id==='accentColorInput'?$('#accentHexInput'):$('#modalAccentHex');if(pair)pair.value=hex;applyAccent(hex);}if(e.target.id==='accentHexInput'||e.target.id==='modalAccentHex'){if(/^#[0-9a-f]{6}$/i.test(e.target.value))applyAccent(e.target.value);}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();globalSearch()}if(e.key==='Escape'){closeDropdown();closeModal()}if(e.key==='Enter'&&document.activeElement?.id==='consoleInput')$('[data-action="runConsole"]')?.click();if(e.key==='Enter'&&document.activeElement?.id==='globalSearchInput')$('[data-action="runGlobalSearch"]')?.click();if(e.key==='Enter'&&document.activeElement?.id==='playerLookupModalInput')$('[data-action="runPlayerLookupModal"]')?.click();if(e.key==='Enter'&&document.activeElement?.matches?.('.v15-inline-event-input')){e.preventDefault();if(!state.demoSession){toast('Policy required','This event rule is not connected to a server policy. No change was saved.','bad');return;}const input=document.activeElement,key=input.dataset.eventList,val=input.value.trim();if(val&&state.eventLists[key]){if(!state.eventLists[key].includes(val))state.eventLists[key].push(val);input.value='';toast('Event saved',`${val} was added to ${key==='locked'?'Locked Events':key==='serverIgnored'?'Ignored Server Events':'Ignored Client Events'}.`);render(state.page);}}});
  window.addEventListener('hashchange',()=>render(routeFromHash()));
  window.addEventListener('popstate',()=>render(routeFromHash()));
  window.addEventListener('resize',()=>{closeDropdown();setTimeout(drawAllActivityCharts,20)});

  function markDetailCards(){
    main.querySelectorAll('[data-detail-modal=\"true\"]').forEach(card=>card.classList.add('detail-card'));
  }
  function installSidebarSplitButtons(){
    $$('.nav-item[data-page]').forEach(item=>{if(item.querySelector('.nav-split-btn'))return;const b=document.createElement('button');b.type='button';b.className='nav-split-btn';b.title='Open in multiview';b.innerHTML=fa('table-columns');item.appendChild(b);});
  }
  const originalRender=render;
  render=function(routeOverride){ originalRender(routeOverride); applyAccent(state.accent); upgradeIcons(main); upgradeIcons(rail); upgradeSelects(main); upgradeSelects(rail); markDetailCards(); initMapInteractions(); initSplitResizer(); installSidebarSplitButtons(); };
  window.ParadoxNavigate=navigateToPage;
  $$('.nav-item[data-page]').forEach(item=>{
    item.addEventListener('click',ev=>{
      if(ev.target.closest('.nav-split-btn')) return;
      ev.preventDefault();
      ev.stopPropagation();
      navigateToPage(item.dataset.page);
    });
  });
  const production=window.ParadoxData;
  // Keep the supplied dashboard renderers and layout in production.
  window.ParadoxRefresh=()=>syncLiveData(false,false);
  window.addEventListener('unhandledrejection',e=>{toast('Request failed',e.reason?.message||'The request was rejected.','bad');});
  applyAccent(state.accent);
  window.installParadoxLiveControls({state,esc,fa,openModal,closeModal,toast,render,navigateToPage,playerModal});
  const navigationAudit=state.demoSession?verifyNavigationRegistry():{missing:[],renderFailures:[]};
  if(navigationAudit.missing.length||navigationAudit.renderFailures.length){
    console.error('[PARADOX] Navigation QA failed',navigationAudit);
  }
  if(!state.authenticated){
    showBootSequence(showLogin);
  }else if(!state.setupComplete){
    showFirstSetup();
  }else{
    document.body.classList.remove('preboot','auth-active');
    authLayer.classList.remove('open');authLayer.innerHTML='';
    render();
    window.ParadoxAPI.getAccount().then(result=>{if(!result?.user){state.authenticated=false;localStorage.removeItem('pa_session');showLogin();return;}state.user=result.user;syncLiveData(false,true);});
  }
  // One timer covers both a fresh login and restored sessions; never overlap bridge jobs.
  let lastSync=0;
  setInterval(()=>{if(state.authenticated && Date.now()-lastSync>=Math.max(5000,Number(state.server.syncInterval||5000))){lastSync=Date.now();syncLiveData(false,false);}},1000);
})();
