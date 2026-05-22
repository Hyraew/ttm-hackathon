// Staff management
async function loadUsers() {
  const users = await api.get('/api/users');
  state.users = users;
  renderUsers(users);
}

function renderUsersPage() {
  const isDirector = state.user.role === 'director';
  const isManager  = state.user.role === 'manager';

  return `
  <div class="page-hero">
    <div class="hero-title"><h1>Сотрудники</h1><p>Управление персоналом</p></div>
    ${(isDirector||isManager) ? `<button class="btn hero-btn" id="add-user-btn">+ Добавить сотрудника</button>` : ''}
  </div>
  <div class="staff-body">
    <div class="staff-filters">
      <input class="inp" id="uf-search" placeholder="🔍 Поиск по имени..." style="max-width:220px"/>
      <select class="inp" id="uf-role" style="width:auto">
        <option value="">Все роли</option>
        ${Object.entries(ROLE_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
      </select>
      <select class="inp" id="uf-dept" style="width:auto">
        <option value="">Все отделы</option>
        ${state.departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="staff-grid" id="staff-grid">
      <div class="loading"><div class="spinner"></div></div>
    </div>
  </div>`;
}

function renderUsers(users) {
  const grid = document.getElementById('staff-grid');
  if(!grid) return;

  const search = document.getElementById('uf-search')?.value.toLowerCase()||'';
  const role   = document.getElementById('uf-role')?.value||'';
  const deptId = document.getElementById('uf-dept')?.value||'';

  let filtered = users;
  if(search) filtered = filtered.filter(u => u.full_name.toLowerCase().includes(search));
  if(role)   filtered = filtered.filter(u => u.role === role);
  if(deptId) filtered = filtered.filter(u => String(u.department_id) === deptId);

  if(!filtered.length) { grid.innerHTML=`<div class="empty"><span class="empty-icon">👤</span>Сотрудники не найдены</div>`; return; }

  const isDirector = state.user.role==='director';
  const isManager  = state.user.role==='manager';
  const canManage  = isDirector || isManager;

  grid.innerHTML = filtered.map(u => {
    // Manager can only manage workers in their dept
    const canEdit = isDirector || (isManager && u.role==='worker' && u.department_id===state.user.department_id);
    return `
    <div class="staff-card${u.is_active===false?' inactive':''}">
      <div class="sc-head">
        <div class="sc-ava" style="background:${ROLE_COLORS[u.role]||'#888'}">${initials(u.full_name)}</div>
        <div>
          <div class="sc-name">${u.full_name}${u.is_active===false?' <span style="color:var(--danger);font-size:11px">(уволен)</span>':''}</div>
          <div class="sc-login">${u.login}</div>
        </div>
      </div>
      <div class="sc-meta">
        ${badge(u.role,ROLE_LABELS,'b-')}
        <span class="badge" style="background:rgba(2,15,82,.07);color:var(--text2)">${u.department_name||'Все отделы'}</span>
      </div>
      ${canEdit ? `<div class="sc-acts">
        <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">✏ Изменить</button>
        ${u.is_active!==false ? `
        <button class="btn btn-ghost btn-sm" onclick="openReassignModal(${u.id},'${u.full_name}')">⇄ Задачи</button>
        <button class="btn btn-danger btn-sm" onclick="fireUser(${u.id},'${u.full_name}')">Уволить</button>` :
        `<button class="btn btn-ghost btn-sm" onclick="restoreUser(${u.id})">↩ Восстановить</button>`}
      </div>` : ''}
    </div>`}).join('');
}

function setupUserFilters() {
  ['uf-search','uf-role','uf-dept'].forEach(id => {
    const e = document.getElementById(id);
    if(e) { e.addEventListener('input', () => renderUsers(state.users)); e.addEventListener('change', () => renderUsers(state.users)); }
  });
  const btn = document.getElementById('add-user-btn');
  if(btn) btn.onclick = () => openUserModal(null);
}

function openUserModal(uid) {
  const user = uid ? state.users.find(u=>u.id===uid) : null;
  const isDirector = state.user.role==='director';

  const html = `
  <div class="overlay" id="user-modal">
    <div class="modal">
      <div class="modal-head">
        <h2>${uid?'Редактировать сотрудника':'Новый сотрудник'}</h2>
        <button class="close-btn" id="um-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Полное имя *</label><input class="inp" id="um-name" value="${user?.full_name||''}" placeholder="Фамилия Имя Отчество"/></div>
        <div class="field-row">
          <div class="field"><label>Логин *</label><input class="inp" id="um-login" value="${user?.login||''}" placeholder="login" ${uid?'readonly':''}/>
          </div>
          <div class="field"><label>Пароль</label><input class="inp" id="um-pass" placeholder="${uid?'Оставьте пустым':'ttm2024'}"/></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Роль</label>
            <select class="inp" id="um-role" ${!isDirector?'disabled':''}>
              ${Object.entries(ROLE_LABELS).map(([k,v])=>`<option value="${k}"${(user?.role||'worker')===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Отдел</label>
            <select class="inp" id="um-dept">
              <option value="">— выбрать —</option>
              ${state.departments.map(d=>`<option value="${d.id}"${user?.department_id==d.id?' selected':''}>${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="um-cancel">Отмена</button>
        <button class="btn btn-primary" id="um-save">Сохранить</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('user-modal');
  const close = () => modal.remove();
  document.getElementById('um-close').onclick = close;
  document.getElementById('um-cancel').onclick = close;
  modal.onclick = e => { if(e.target===modal) close(); };

  document.getElementById('um-save').onclick = async () => {
    const name  = document.getElementById('um-name').value.trim();
    const login = document.getElementById('um-login').value.trim();
    if(!name) { alert('Введите имя'); return; }
    const data = {
      full_name: name, login,
      role:          document.getElementById('um-role').value,
      department_id: document.getElementById('um-dept').value||null,
    };
    const pass = document.getElementById('um-pass').value.trim();
    if(pass) data.password = pass;
    if(!uid && !login) { alert('Введите логин'); return; }
    if(uid) await api.put(`/api/users/${uid}`, data);
    else    await api.post('/api/users', data);
    close();
    loadUsers();
  };
}

async function openReassignModal(uid, name) {
  const activeWorkers = state.users.filter(u => u.is_active!==false && u.id!==uid);
  const html = `
  <div class="overlay" id="reassign-modal">
    <div class="modal">
      <div class="modal-head"><h2>Перераспределить задачи</h2><button class="close-btn" id="rm-close">✕</button></div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--text2)">Все активные задачи сотрудника <b>${name}</b> будут переданы выбранному сотруднику.</p>
        <div class="field"><label>Новый ответственный</label>
          <select class="inp" id="rm-user">
            <option value="">— выбрать —</option>
            ${activeWorkers.map(u=>`<option value="${u.id}">${u.full_name} (${ROLE_LABELS[u.role]})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="rm-cancel">Отмена</button>
        <button class="btn btn-primary" id="rm-save">Передать задачи</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('reassign-modal');
  const close = () => modal.remove();
  document.getElementById('rm-close').onclick = close;
  document.getElementById('rm-cancel').onclick = close;
  document.getElementById('rm-save').onclick = async () => {
    const newId = document.getElementById('rm-user').value;
    if(!newId) { alert('Выберите сотрудника'); return; }
    await api.post(`/api/users/${uid}/reassign`, { new_responsible_id: newId });
    close();
    alert('Задачи успешно переданы');
    loadUsers();
  };
}

async function fireUser(uid, name) {
  if(!confirm(`Уволить сотрудника ${name}?\nЕго задачи останутся, нужно будет перераспределить вручную.`)) return;
  await api.delete(`/api/users/${uid}`);
  loadUsers();
}

async function restoreUser(uid) {
  await api.put(`/api/users/${uid}`, { is_active: true });
  loadUsers();
}
