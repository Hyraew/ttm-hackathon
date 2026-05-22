// Kanban board
const COLS = [
  { key:'new',        label:'Новые',           color:'#269AE6' },
  { key:'in_progress',label:'В работе',        color:'#003C97' },
  { key:'review',     label:'На согласовании', color:'#e8920a' },
  { key:'done',       label:'Выполнено',       color:'#18a66b' },
  { key:'overdue',    label:'Просрочено',      color:'#d63b4a' },
];

async function loadKanban() {
  const params = state.user.role==='worker' ? `?responsible_id=${state.user.id}` : '';
  const tasks  = await api.get('/api/tasks' + params);
  renderKanban(tasks);
}

function renderKanban(tasks) {
  const wrap = document.getElementById('kanban-wrap');
  if(!wrap) return;
  wrap.innerHTML = '';

  COLS.forEach(col => {
    const colTasks = tasks.filter(t => t.status === col.key);
    const colEl = el('div','k-col');
    colEl.dataset.status = col.key;

    colEl.innerHTML = `
      <div class="k-col-head">
        <div class="k-dot" style="background:${col.color}"></div>
        <span class="k-col-title">${col.label}</span>
        <span class="k-count">${colTasks.length}</span>
      </div>
      <div class="k-cards" id="kcards-${col.key}"></div>`;

    const cardsEl = colEl.querySelector('.k-cards');

    if(!colTasks.length) {
      cardsEl.innerHTML = `<div class="k-empty">Нет задач</div>`;
    } else {
      colTasks.forEach(t => {
        const dl = dlInfo(t.deadline, t.status);
        const card = el('div','k-card');
        card.draggable = true;
        card.dataset.id = t.id;
        card.innerHTML = `
          <div class="k-period">${PERIOD_LABELS[t.period]||t.period}</div>
          <div class="k-title">${t.title}</div>
          ${t.description?`<div class="k-desc">${t.description.slice(0,65)}${t.description.length>65?'…':''}</div>`:''}
          <div class="k-foot">
            ${badge(t.priority,PRIORITY_LABELS)}
            ${dl?`<span class="k-dl ${dl.cls}">${dl.text}</span>`:''}
            ${t.responsible_name?`<span class="k-emp">${t.responsible_name.split(' ')[0]}</span>`:''}
          </div>`;

        // Drag events
        card.addEventListener('dragstart', e => {
          e.dataTransfer.setData('taskId', t.id);
          card.style.opacity = '.5';
        });
        card.addEventListener('dragend', () => { card.style.opacity='1'; });

        // Click to edit
        if(['director','manager'].includes(state.user.role)) {
          card.addEventListener('click', () => openTaskModal(t));
        }

        cardsEl.appendChild(card);
      });
    }

    // Drop zone
    colEl.addEventListener('dragover', e => { e.preventDefault(); colEl.classList.add('drag-over'); });
    colEl.addEventListener('dragleave', () => colEl.classList.remove('drag-over'));
    colEl.addEventListener('drop', async e => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      const tid = e.dataTransfer.getData('taskId');
      if(tid) {
        await api.put(`/api/tasks/${tid}`, { status: col.key });
        loadKanban();
      }
    });

    wrap.appendChild(colEl);
  });
}

function renderKanbanPage() {
  const canManage = ['director','manager'].includes(state.user.role);
  return `
  <div class="page-hero">
    <div class="hero-title"><h1>Канбан-доска</h1><p>Перетащите карточку для смены статуса</p></div>
    ${canManage?`<button class="btn hero-btn" onclick="openTaskModal(null)">+ Новая задача</button>`:''}
  </div>
  <div class="kanban-wrap" id="kanban-wrap">
    <div class="loading"><div class="spinner"></div></div>
  </div>`;
}
