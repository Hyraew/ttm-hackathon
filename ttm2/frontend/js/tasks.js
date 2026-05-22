// Tasks page
async function loadTasks(filters={}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k,v]) => { if(v) params.set(k,v); });

  // Workers see only their tasks
  if(state.user.role === 'worker') params.set('responsible_id', state.user.id);

  const tasks = await api.get('/api/tasks?' + params);
  state.tasks = tasks;
  renderTaskTable(tasks);
}

function renderTasksPage() {
  const canManage = ['director','manager'].includes(state.user.role);

  return `
  <div class="page-hero">
    <div class="hero-title">
      <h1>Задачи</h1>
      <p id="tasks-count">Загрузка...</p>
    </div>
    ${canManage ? `<button class="btn hero-btn" id="new-task-btn">+ Новая задача</button>` : ''}
  </div>

  <div class="filters">
    <input class="inp search-inp" id="tf-search" placeholder="🔍 Поиск..."/>
    <select class="inp" id="tf-period" style="width:auto">
      <option value="">Все периоды</option>
      ${Object.entries(PERIOD_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
    </select>
    <select class="inp" id="tf-status" style="width:auto">
      <option value="">Все статусы</option>
      ${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
    </select>
    <select class="inp" id="tf-priority" style="width:auto">
      <option value="">Все приоритеты</option>
      ${Object.entries(PRIORITY_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
    </select>
    ${canManage ? `
    <select class="inp" id="tf-dept" style="width:auto">
      <option value="">Все отделы</option>
      ${state.departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
    </select>` : ''}
    <button class="btn btn-ghost btn-sm" id="tf-reset">✕ Сброс</button>
  </div>

  <div class="task-layout">
    <div class="task-table-wrap" id="task-table-wrap">
      <div class="loading"><div class="spinner"></div></div>
    </div>
    <div id="task-detail-panel" style="display:none" class="task-detail fade-in"></div>
  </div>`;
}

function renderTaskTable(tasks) {
  const wrap = document.getElementById('task-table-wrap');
  const count = document.getElementById('tasks-count');
  if(count) count.innerHTML = `Задач: <b style="color:#9CDDE6">${tasks.length}</b> · Просрочено: <b style="color:#ff8a8a">${tasks.filter(t=>t.status==='overdue').length}</b>`;

  if(!tasks.length) {
    wrap.innerHTML = `<div class="empty"><span class="empty-icon">◎</span>Задачи не найдены</div>`;
    return;
  }

  const table = el('table','ttable');
  table.innerHTML = `<thead><tr>
    <th>Задача</th><th>Период</th><th>Отдел</th><th>Ответственный</th><th>Дедлайн</th><th>Приоритет</th><th>Статус</th>
  </tr></thead>`;
  const tbody = el('tbody');

  tasks.forEach(t => {
    const tr = el('tr', `trow${t.status==='overdue'?' overdue-row':''}`);
    const dl = dlInfo(t.deadline, t.status);
    tr.innerHTML = `
      <td><div class="task-title">${t.title}</div>${t.description?`<div class="task-sub">${t.description}</div>`:''}</td>
      <td><span class="period-tag">${PERIOD_LABELS[t.period]||t.period}</span></td>
      <td style="font-size:12px;color:var(--text2)">${t.department_name||'—'}</td>
      <td style="font-size:13px;color:var(--text2)">${t.responsible_name||'—'}</td>
      <td style="font-size:13px${dl&&dl.cls==='dl-red'?';color:var(--danger);font-weight:700':''}">${fmtDate(t.deadline)}</td>
      <td>${badge(t.priority,PRIORITY_LABELS)}</td>
      <td>${badge(t.status,STATUS_LABELS)}</td>`;
    tr.onclick = () => showTaskDetail(t.id);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);
}

async function showTaskDetail(id) {
  // highlight row
  document.querySelectorAll('.trow').forEach(r => r.classList.remove('sel'));
  document.querySelectorAll('.trow').forEach(r => {
    if(r.querySelector('.task-title')?.textContent === state.tasks.find(t=>t.id===id)?.title) r.classList.add('sel');
  });

  const panel = document.getElementById('task-detail-panel');
  panel.style.display = 'flex';
  panel.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  const t = await api.get(`/api/tasks/${id}`);
  state.currentTaskId = id;
  const canEdit = ['director','manager'].includes(state.user.role);

  panel.innerHTML = `
    <div class="detail-hero">
      <div class="detail-period">${PERIOD_LABELS[t.period]||t.period} · ${t.department_name||''}</div>
      <button class="detail-close" id="dp-close">✕</button>
    </div>
    <div class="detail-body">
      <div class="detail-title-text">${t.title}</div>
      <div class="detail-desc-text">${t.description||'Описание отсутствует'}</div>
      <div class="meta-box">
        <div class="meta-row"><span class="ml">Ответственный</span><span class="mr">${t.responsible_name||'—'}</span></div>
        <div class="meta-row"><span class="ml">Дедлайн</span><span class="mr" style="${isOverdue(t)?'color:var(--danger)':''}">${fmtDate(t.deadline)}</span></div>
        <div class="meta-row"><span class="ml">Приоритет</span>${badge(t.priority,PRIORITY_LABELS)}</div>
        <div class="meta-row"><span class="ml">Создана</span><span class="mr">${fmtDate(t.created_at)}</span></div>
      </div>
      <div class="status-row">
        <span>Статус:</span>
        <select class="inp" id="dp-status">
          ${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}"${t.status===k?' selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      ${canEdit ? `<div class="detail-acts">
        <button class="btn btn-ghost" id="dp-edit">✏ Изменить</button>
        <button class="btn btn-danger" id="dp-del">🗑 Удалить</button>
      </div>` : ''}
      <div class="comments-wrap">
        <div class="comments-title">Комментарии (${t.comments?.length||0})</div>
        ${(t.comments||[]).map(c=>`
          <div class="comment-item">
            <div class="comment-meta">${c.author_name||'?'} · ${fmtDate(c.created_at)}</div>
            <div class="comment-text">${c.text}</div>
          </div>`).join('')}
        <div class="comment-form">
          <input class="inp" id="dp-comment" placeholder="Комментарий..."/>
          <button class="btn btn-primary" id="dp-comment-btn">→</button>
        </div>
      </div>
    </div>`;

  document.getElementById('dp-close').onclick = () => { panel.style.display='none'; state.currentTaskId=null; };
  document.getElementById('dp-status').onchange = async e => {
    await api.put(`/api/tasks/${id}`, { status: e.target.value });
    loadTasks(getTaskFilters());
  };
  document.getElementById('dp-comment-btn').onclick = async () => {
    const inp = document.getElementById('dp-comment');
    if(!inp.value.trim()) return;
    await api.post(`/api/tasks/${id}/comments`, { text: inp.value, author_id: state.user.id });
    showTaskDetail(id);
  };
  if(canEdit) {
    document.getElementById('dp-edit').onclick = () => openTaskModal(t);
    document.getElementById('dp-del').onclick = async () => {
      if(!confirm('Удалить задачу?')) return;
      await api.delete(`/api/tasks/${id}`);
      panel.style.display='none';
      loadTasks(getTaskFilters());
    };
  }
}

function getTaskFilters() {
  return {
    search:      document.getElementById('tf-search')?.value || '',
    period:      document.getElementById('tf-period')?.value || '',
    status:      document.getElementById('tf-status')?.value || '',
    priority:    document.getElementById('tf-priority')?.value || '',
    department_id: document.getElementById('tf-dept')?.value || '',
  };
}

function setupTaskFilters() {
  ['tf-search','tf-period','tf-status','tf-priority','tf-dept'].forEach(id => {
    const el2 = document.getElementById(id);
    if(el2) el2.addEventListener('input', () => loadTasks(getTaskFilters()));
    if(el2 && el2.tagName==='SELECT') el2.addEventListener('change', () => loadTasks(getTaskFilters()));
  });
  const reset = document.getElementById('tf-reset');
  if(reset) reset.onclick = () => {
    ['tf-search','tf-period','tf-status','tf-priority','tf-dept'].forEach(id => {
      const el2 = document.getElementById(id); if(el2) el2.value='';
    });
    loadTasks();
  };
  const newBtn = document.getElementById('new-task-btn');
  if(newBtn) newBtn.onclick = () => openTaskModal(null);
}

function openTaskModal(task) {
  const isEdit = !!task?.id;
  const workers = state.users.filter(u => u.is_active !== false);

  const html = `
  <div class="overlay" id="task-modal">
    <div class="modal">
      <div class="modal-head">
        <h2>${isEdit?'Редактировать задачу':'Новая задача'}</h2>
        <button class="close-btn" id="tm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Название *</label><input class="inp" id="tm-title" value="${task?.title||''}" placeholder="Название задачи"/></div>
        <div class="field"><label>Описание</label><textarea class="inp" id="tm-desc" rows="3" placeholder="Детали...">${task?.description||''}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Ответственный</label>
            <select class="inp" id="tm-resp">
              <option value="">— выбрать —</option>
              ${workers.map(u=>`<option value="${u.id}"${task?.responsible_id==u.id?' selected':''}>${u.full_name}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Отдел</label>
            <select class="inp" id="tm-dept">
              <option value="">— выбрать —</option>
              ${state.departments.map(d=>`<option value="${d.id}"${task?.department_id==d.id?' selected':''}>${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Период</label>
            <select class="inp" id="tm-period">
              ${Object.entries(PERIOD_LABELS).map(([k,v])=>`<option value="${k}"${(task?.period||'week')===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Дедлайн</label><input class="inp" id="tm-deadline" type="date" value="${task?.deadline?.slice(0,10)||''}"/></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Приоритет</label>
            <select class="inp" id="tm-priority">
              ${Object.entries(PRIORITY_LABELS).map(([k,v])=>`<option value="${k}"${(task?.priority||'medium')===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Статус</label>
            <select class="inp" id="tm-status">
              ${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}"${(task?.status||'new')===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="tm-cancel">Отмена</button>
        <button class="btn btn-primary" id="tm-save">Сохранить</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('task-modal');
  const close = () => modal.remove();
  document.getElementById('tm-close').onclick = close;
  document.getElementById('tm-cancel').onclick = close;
  modal.onclick = e => { if(e.target===modal) close(); };

  document.getElementById('tm-save').onclick = async () => {
    const title = document.getElementById('tm-title').value.trim();
    if(!title) { alert('Введите название'); return; }
    const data = {
      title, description: document.getElementById('tm-desc').value,
      responsible_id: document.getElementById('tm-resp').value||null,
      department_id:  document.getElementById('tm-dept').value||null,
      period:   document.getElementById('tm-period').value,
      deadline: document.getElementById('tm-deadline').value||null,
      priority: document.getElementById('tm-priority').value,
      status:   document.getElementById('tm-status').value,
      created_by: state.user.id,
    };
    if(isEdit) await api.put(`/api/tasks/${task.id}`, data);
    else       await api.post('/api/tasks', data);
    close();
    loadTasks(getTaskFilters());
    if(state.currentTaskId === task?.id) showTaskDetail(task.id);
  };
}
