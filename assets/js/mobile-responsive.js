(() => {
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const sidebar = $('#sidebar');
  const overlay = $('#mobileOverlay');
  const menu = $('#mobileMenuButton');
  const close = $('#sidebarCloseButton');

  const isMobile = () => window.matchMedia('(max-width: 1024px)').matches;
  const syncViewportState = () => {
    document.documentElement.classList.toggle('pa-mobile', isMobile());
    if (!isMobile()) {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('show');
      menu?.setAttribute('aria-expanded', 'false');
    }
  };
  const openNav = () => {
    if (!isMobile()) return;
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
    menu?.setAttribute('aria-expanded','true');
    close?.focus({preventScroll:true});
  };
  const closeNav = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    menu?.setAttribute('aria-expanded','false');
  };

  menu?.addEventListener('click', openNav);
  close?.addEventListener('click', closeNav);
  overlay?.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeNav(); });
  document.addEventListener('click', e => {
    if (isMobile() && e.target.closest('.nav-item[data-page]')) closeNav();
  }, true);

  // Add semantic labels so desktop tables transform into readable record cards on phones.
  const enhanceTable = table => {
    if (!table || table.dataset.mobileEnhanced === 'true') return;
    const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim().replace(/\s+/g,' '));
    if (!heads.length) return;
    table.dataset.mobileEnhanced = 'true';
    table.classList.add('mobile-card-table');
    [...table.querySelectorAll('tbody tr')].forEach(row => {
      [...row.children].forEach((cell, i) => {
        if (cell.matches('td') && !cell.hasAttribute('colspan')) cell.dataset.label = heads[i] || `Field ${i+1}`;
      });
    });
  };
  const enhanceTables = root => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('.data-table,.ref-table,.v11-table-card table,.v12-player-detections table').forEach(enhanceTable);
  };

  // Mobile browsers sometimes leave an old horizontal offset after visiting wide editor pages.
  const normalizeMobilePage = () => {
    if (!isMobile()) return;
    const main = $('#mainContent');
    if (main) main.scrollLeft = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('table')) enhanceTable(node);
        enhanceTables(node);
      });
    }
    normalizeMobilePage();
  });
  const main = $('#mainContent');
  const modal = $('#modalLayer');
  if (main) observer.observe(main,{childList:true,subtree:true});
  if (modal) observer.observe(modal,{childList:true,subtree:true});
  enhanceTables(document);
  syncViewportState();
  window.addEventListener('resize', syncViewportState, {passive:true});
  window.addEventListener('orientationchange', () => setTimeout(syncViewportState,80), {passive:true});
})();
