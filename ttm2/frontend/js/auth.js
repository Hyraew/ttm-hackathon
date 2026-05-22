// Login page logic
const DEMO_USERS = [
  { login:'director', name:'Александр Громов',   role:'director', dept:null,               color:'#020F52' },
  { login:'manager1', name:'Иван Петров',         role:'manager',  dept:'Молодые таланты',  color:'#003C97' },
  { login:'manager2', name:'Ольга Новикова',      role:'manager',  dept:'HR',               color:'#003C97' },
  { login:'manager3', name:'Дмитрий Соколов',     role:'manager',  dept:'ИТ',               color:'#003C97' },
  { login:'worker1',  name:'Мария Сидорова',      role:'worker',   dept:'АХО',              color:'#269AE6' },
  { login:'worker2',  name:'Алексей Козлов',      role:'worker',   dept:'АХО',              color:'#269AE6' },
  { login:'worker3',  name:'Анна Морозова',       role:'worker',   dept:'HR',               color:'#269AE6' },
  { login:'worker4',  name:'Елена Волкова',       role:'worker',   dept:'Финансы',          color:'#269AE6' },
  { login:'worker5',  name:'Сергей Лебедев',      role:'worker',   dept:'Юридический',      color:'#269AE6' },
  { login:'worker6',  name:'Татьяна Орлова',      role:'worker',   dept:'Проектный офис',   color:'#269AE6' },
];

function renderLogin() {
  const root = document.getElementById('root');
  root.innerHTML = `
  <div id="login-screen">
    <svg class="login-deco" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <circle cx="180" cy="720" r="300" fill="rgba(156,221,230,.07)"/>
      <circle cx="1320" cy="180" r="380" fill="rgba(38,154,230,.07)"/>
      <circle cx="720" cy="440" r="180" fill="rgba(255,255,255,.04)"/>
    </svg>

    <div class="login-brand">
      <div class="l-logo">
        ${ttmLogoSVG('#9CDDE6','#269AE6')}
        <div class="l-logo-name">Транстеле<span>матика</span></div>
      </div>
      <h1>Система управления задачами</h1>
      <p>Единая платформа для планирования, контроля и выполнения задач компании</p>
      <div class="l-features">
        ${[['☰','Управление задачами по периодам'],['⊞','Дашборды и аналитика'],['◈','Канбан-доска с drag&drop'],['◎','AI-помощник на базе Claude']].map(([i,t])=>`
        <div class="l-feature"><div class="l-feat-icon">${i}</div><div class="l-feat-text">${t}</div></div>`).join('')}
      </div>
    </div>

    <div class="login-panel">
      <div class="login-card">
        <h2>Вход в систему</h2>
        <p class="login-sub">Выберите аккаунт или введите данные вручную</p>

        <div class="quick-head">Аккаунты — пароль: <b style="color:var(--ttm-calm)">ttm2024</b></div>
        <div class="quick-list" id="quick-list"></div>

        <div class="l-form">
          <div id="l-error" style="display:none" class="l-error"></div>
          <div class="field"><label>Логин</label><input class="inp" id="l-login" placeholder="Введите логин"/></div>
          <div class="field"><label>Пароль</label><input class="inp" id="l-pass" type="password" placeholder="Введите пароль"/></div>
          <button class="btn btn-primary" id="l-btn" style="justify-content:center;padding:12px">Войти →</button>
          <p class="l-hint">Единый пароль для всех: <b>ttm2024</b></p>
        </div>
      </div>
    </div>
  </div>`;

  // Quick list
  const ql = document.getElementById('quick-list');
  DEMO_USERS.forEach(u => {
    const item = el('button','quick-item');
    item.innerHTML = `
      <div class="q-ava" style="background:${u.color}">${initials(u.name)}</div>
      <div class="q-info">
        <div class="q-name">${u.name}</div>
        <div class="q-role">${ROLE_LABELS[u.role]}${u.dept?' · '+u.dept:''}</div>
      </div>
      <div class="q-login">${u.login}</div>`;
    item.onclick = () => {
      document.querySelectorAll('.quick-item').forEach(i=>i.classList.remove('sel'));
      item.classList.add('sel');
      document.getElementById('l-login').value = u.login;
      document.getElementById('l-pass').value  = 'ttm2024';
    };
    ql.appendChild(item);
  });

  document.getElementById('l-btn').onclick = doLogin;
  document.getElementById('l-pass').onkeydown = e => { if(e.key==='Enter') doLogin(); };
}

async function doLogin() {
  const login    = document.getElementById('l-login').value.trim();
  const password = document.getElementById('l-pass').value.trim();
  const errEl    = document.getElementById('l-error');
  errEl.style.display = 'none';
  try {
    const user = await api.post('/api/auth/login', { login, password });
    state.user = user;
    document.getElementById('root').innerHTML = '';
    initApp();
  } catch(e) {
    errEl.textContent = '⚠ ' + e.message;
    errEl.style.display = 'block';
  }
}

function ttmLogoSVG(c1='#9CDDE6', c2='#269AE6') {
  const uid = Math.random().toString(36).slice(2);
  // Знак Транстелематики — три переплетённые дуги с градиентом
  return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="g2${uid}" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="#020F52"/>
      </linearGradient>
      <linearGradient id="g3${uid}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#003C97"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <g transform="translate(32,32)">
      <path d="M0,-22 A22,22 0 0,1 19,11 A13,13 0 0,0 8,-8 A22,22 0 0,0 0,-22 Z"
            fill="url(#g1${uid})" transform="rotate(0)"/>
      <path d="M0,-22 A22,22 0 0,1 19,11 A13,13 0 0,0 8,-8 A22,22 0 0,0 0,-22 Z"
            fill="url(#g2${uid})" transform="rotate(120)"/>
      <path d="M0,-22 A22,22 0 0,1 19,11 A13,13 0 0,0 8,-8 A22,22 0 0,0 0,-22 Z"
            fill="url(#g3${uid})" transform="rotate(240)"/>
    </g>
  </svg>`;
}
