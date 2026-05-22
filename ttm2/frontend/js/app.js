// Main app controller

const PAGES = {
  tasks:      { label:'Задачи',                  icon:'☰', render: renderTasksPage,      load: ()=>loadTasks() },
  unassigned: { label:'Задачи без ответственных', icon:'⚠', render: renderUnassignedPage, load: loadUnassigned, roles:['director','manager'] },
  kanban:     { label:'Канбан-доска',            icon:'⊞', render: renderKanbanPage,     load: loadKanban },
  dashboard:  { label:'Дашборды',                icon:'◈', render: renderDashboardPage,  load: loadDashboard },
  users:      { label:'Сотрудники',              icon:'👤', render: renderUsersPage,      load: loadUsers, roles:['director','manager'] },
  ai:         { label:'AI-агент',                icon:'🕷️', render: renderAIPage,         load: setupAIPage },
};

let currentPage = 'tasks';

function initApp() {
  const u = state.user;

  // Load reference data
  Promise.all([
    api.get('/api/departments').then(d => state.departments = d),
    api.get('/api/users/active').then(d => state.users = d),
  ]).then(() => {
    renderAppShell();
    navigateTo('tasks');
    initSpiderMan();
  });
}

function renderAppShell() {
  const u = state.user;
  const root = document.getElementById('root');

  const navItems = Object.entries(PAGES)
    .filter(([,p]) => !p.roles || p.roles.includes(u.role))
    .map(([id,p]) => `
      <button class="nav-btn" data-page="${id}" id="nav-${id}">
        <span class="nb-icon">${p.icon}</span>
        <span>${p.label}</span>
        ${id==='ai'?`<span class="nb-badge">NEW</span>`:''}
      </button>`).join('');

  root.innerHTML = `
  <div id="app-screen" class="show">
    <aside class="sidebar">
      <div class="sb-logo">
        ${ttmLogoSVG('rgba(156,221,230,.9)','#269AE6')}
        <div class="sb-logo-text">
          <div class="sb-name">Транстеле<span>матика</span></div>
          <div class="sb-tag">Управление задачами</div>
        </div>
      </div>
      <nav class="sb-nav">
        <div class="sb-section">Рабочее пространство</div>
        ${navItems}
      </nav>
      <div class="sb-footer">
        <div class="sb-user">
          <div class="sb-ava" style="background:${ROLE_COLORS[u.role]||'#003C97'}">${initials(u.full_name)}</div>
          <div class="sb-user-info">
            <div class="sb-user-name">${u.full_name}</div>
            <div class="sb-user-role">${ROLE_LABELS[u.role]||u.role}${u.department_name?' · '+u.department_name:''}</div>
          </div>
          <button class="sb-logout" title="Выйти" id="logout-btn">⏻</button>
        </div>
      </div>
    </aside>

    <main class="app-main">
      ${Object.keys(PAGES).map(id=>`<div class="page" id="page-${id}"></div>`).join('')}
    </main>
  </div>`;

  // Nav click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page);
  });

  document.getElementById('logout-btn').onclick = () => {
    state.user = null;
    document.getElementById('root').innerHTML = '';
    renderLogin();
  };
}

function navigateTo(pageId) {
  if(!PAGES[pageId]) return;

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-'+pageId)?.classList.add('active');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pageEl = document.getElementById('page-'+pageId);
  const pageDef = PAGES[pageId];

  pageEl.innerHTML = pageDef.render();
  pageEl.classList.add('active');

  currentPage = pageId;

  // Setup filters and load data
  if(pageId === 'tasks')     { setupTaskFilters(); }
  if(pageId === 'users')     { setupUserFilters(); }

  pageDef.load();
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  renderLogin();
});
