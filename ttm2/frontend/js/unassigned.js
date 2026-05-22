// Задачи без ответственных
async function loadUnassigned() {
  const tasks = await api.get('/api/tasks?unassigned=1');
  renderUnassigned(tasks);
}

function renderUnassignedPage() {
  return `
  <div class="page-hero">
    <div class="hero-title"><h1>Задачи без ответственных</h1><p>Назначьте исполнителя для бесхозных задач</p></div>
  </div>
  <div class="unassigned-body" id="unassigned-body">
    <div class="loading"><div class="spinner"></div></div>
  </div>`;
}

function renderUnassigned(tasks) {
  const wrap = document.getElementById('unassigned-body');
  if(!wrap) return;

  if(!tasks.length) {
    wrap.innerHTML = `<div class="empty"><span class="empty-icon">✅</span>Все задачи имеют ответственных</div>`;
    return;
  }

  const activeWorkers = state.users.filter(u => u.is_active !== false);

  wrap.innerHTML = `
    <div class="unassigned-note">
      🔔 Здесь задачи, у которых нет ответственного — например, после увольнения сотрудника.
      Выберите нового исполнителя для каждой.
    </div>
    <div class="unassigned-grid">
      ${tasks.map(t => {
        const dl = dlInfo(t.deadline, t.status);
        return `
        <div class="ua-card" data-id="${t.id}">
          <div class="ua-head">
            <span class="period-tag">${PERIOD_LABELS[t.period]||t.period}</span>
            ${badge(t.priority, PRIORITY_LABELS)}
            ${badge(t.status, STATUS_LABELS)}
          </div>
          <div class="ua-title">${t.title}</div>
          ${t.description?`<div class="ua-desc">${t.description}</div>`:''}
          <div class="ua-meta">
            <span>📁 ${t.department_name||'Без отдела'}</span>
            <span class="${dl&&dl.cls==='dl-red'?'ua-overdue':''}">📅 ${fmtDate(t.deadline)}</span>
          </div>
          <div class="ua-assign">
            <select class="inp ua-select" id="ua-sel-${t.id}">
              <option value="">— выберите ответственного —</option>
              ${activeWorkers.map(u=>`<option value="${u.id}">${u.full_name} (${ROLE_LABELS[u.role]}${u.department_name?', '+u.department_name:''})</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="assignTask(${t.id})">Назначить</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function assignTask(taskId) {
  const sel = document.getElementById('ua-sel-' + taskId);
  if(!sel.value) { alert('Выберите ответственного'); return; }
  await api.put(`/api/tasks/${taskId}`, { responsible_id: sel.value });
  loadUnassigned();
}
