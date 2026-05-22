// Дашборды — кликабельные SVG-графики, без внешних библиотек
async function loadDashboard() {
  const data = await api.get('/api/analytics');
  renderDashboard(data);
}

// Переход на вкладку «Задачи» с применённым фильтром
function dashGoToTasks(filter) {
  navigateTo('tasks');
  setTimeout(() => {
    const map = { status:'tf-status', period:'tf-period', department_id:'tf-dept', priority:'tf-priority' };
    ['tf-search','tf-period','tf-status','tf-priority','tf-dept'].forEach(id => {
      const e = document.getElementById(id); if(e) e.value = '';
    });
    Object.entries(filter).forEach(([k,v]) => {
      const e = document.getElementById(map[k]);
      if(e) e.value = v;
    });
    loadTasks(getTaskFilters());
  }, 60);
}

function renderDashboard(d) {
  const wrap = document.getElementById('dash-body');
  if(!wrap) return;

  const done       = d.by_status?.done || 0;
  const total      = d.total || 1;
  const completion = Math.round((done/total)*100);

  const KPI = [
    { label:'Всего задач',     val:d.total,                     color:'#269AE6', filter:{} },
    { label:'Просрочено',      val:d.overdue,                   color:'#d63b4a', filter:{status:'overdue'} },
    { label:'В работе',        val:d.by_status?.in_progress||0, color:'#003C97', filter:{status:'in_progress'} },
    { label:'На согласовании', val:d.by_status?.review||0,      color:'#e8920a', filter:{status:'review'} },
    { label:'Выполнено',       val:done,                        color:'#18a66b', filter:{status:'done'} },
    { label:'Выполнение',      val:completion+'%',              color: completion>=70?'#18a66b':completion>=40?'#e8920a':'#d63b4a', progress:completion },
  ];

  const kpiHTML = KPI.map((k,i) => `
    <div class="kpi-card${k.filter?' kpi-clickable':''}" data-kpi="${i}">
      <div class="kpi-bar" style="background:linear-gradient(90deg,${k.color},${k.color}66)"></div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-val" style="color:${k.color}">${k.val}</div>
      ${k.progress!==undefined?`<div class="kpi-prog"><div class="kpi-prog-fill" style="width:${k.progress}%;background:${k.color}"></div></div>`:''}
    </div>`).join('');

  function barChart(data, palette, filterKey) {
    if(!data || !Object.keys(data).length) return '<div class="empty">Нет данных</div>';
    const max = Math.max(...Object.values(data), 1);
    const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]);
    const W=500, H=170, pad=40, barW=Math.min(46,(W-2*pad)/entries.length-8);
    const gap = (W-2*pad-entries.length*barW)/(entries.length+1);
    let bars='';
    entries.forEach(([name,val],i) => {
      const bh = Math.round((val/max)*(H-40));
      const x  = pad+gap+i*(barW+gap);
      const y  = H-24-bh;
      const col= palette[i%palette.length];
      bars += `<g class="bar-hit" data-fkey="${filterKey}" data-fval="${name}" style="cursor:pointer">
        <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="5" fill="${col}"/>
        <text x="${x+barW/2}" y="${y-5}" text-anchor="middle" font-size="11" fill="#3d5470" font-weight="700">${val}</text>
        <text x="${x+barW/2}" y="${H-6}" text-anchor="middle" font-size="9" fill="#7a96b4">${name.length>9?name.slice(0,8)+'…':name}</text>
      </g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${bars}</svg>`;
  }

  function pieChart(data, palette, ruMap) {
    if(!data || !Object.keys(data).length) return '<div class="empty">Нет данных</div>';
    const total = Object.values(data).reduce((a,b)=>a+b,0) || 1;
    const R=72, cx=85, cy=85;
    let slices='', legend='', angle=-Math.PI/2;
    Object.entries(data).forEach(([key,val],i) => {
      const a  = (val/total)*2*Math.PI;
      const x1 = cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
      const x2 = cx+R*Math.cos(angle+a), y2=cy+R*Math.sin(angle+a);
      const lg = a>Math.PI?1:0;
      slices += `<path class="pie-hit" data-fval="${key}" style="cursor:pointer"
        d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} Z"
        fill="${palette[i%palette.length]}" opacity=".92" stroke="#fff" stroke-width="2"/>`;
      legend += `<span class="leg-hit" data-fval="${key}" style="cursor:pointer">
        <span class="c-dot" style="background:${palette[i%palette.length]}"></span>${ruMap[key]||key}: <b>${val}</b></span>&nbsp;&nbsp;`;
      angle += a;
    });
    return `<svg viewBox="0 0 ${cx*2} ${cy*2}" style="width:170px;height:170px">${slices}</svg>
            <div class="chart-legend" style="margin-top:8px;font-size:11px">${legend}</div>`;
  }

  function hBar(data, color, filterKey) {
    if(!data || !Object.keys(data).length) return '<div class="empty">Нет данных</div>';
    const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = Math.max(...entries.map(e=>e[1]),1);
    return entries.map(([name,val])=>{
      const clickable = !!filterKey;
      return `<div class="hbar-row${clickable?' hbar-hit':''}" ${clickable?`data-fkey="${filterKey}" data-fval="${name}"`:''}
        style="display:flex;align-items:center;gap:10px;margin-bottom:8px;${clickable?'cursor:pointer':''}">
        <div style="width:135px;font-size:12px;color:var(--text2);text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
        <div style="flex:1;height:20px;background:var(--surface2);border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${Math.round(val/max*100)}%;background:${color};border-radius:5px;transition:.5s"></div>
        </div>
        <div style="width:24px;font-size:12px;font-weight:700;color:var(--ttm-dark)">${val}</div>
      </div>`;
    }).join('');
  }

  const statusPalette = ['#269AE6','#003C97','#e8920a','#18a66b','#d63b4a'];
  const periodPalette = ['#020F52','#003C97','#269AE6','#9CDDE6'];

  wrap.innerHTML = `
    <div class="kpi-grid">${kpiHTML}</div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Статусы задач</div>
        <div id="chart-status">${pieChart(d.by_status, statusPalette, STATUS_LABELS)}</div>
      </div>
      <div class="chart-card">
        <div class="chart-title">По периодам</div>
        <div id="chart-period">${barChart(d.by_period, periodPalette, 'period')}</div>
      </div>
      <div class="chart-card wide">
        <div class="chart-title">По отделам</div>
        <div id="chart-dept">${hBar(d.by_dept,'var(--ttm-calm)','department_id')}</div>
      </div>
      <div class="chart-card wide">
        <div class="chart-title">Загрузка сотрудников</div>
        ${hBar(d.employee_load,'var(--ttm-digital)',null)}
        <div class="chart-legend">
          <span class="c-dot" style="background:var(--success)"></span> 1-2 задачи — норма
          <span class="c-dot" style="background:var(--warning)"></span> 3 задачи — повышенная
          <span class="c-dot" style="background:var(--danger)"></span> 4+ задачи — перегрузка
        </div>
      </div>
    </div>`;

  // Клики
  wrap.querySelectorAll('.kpi-card[data-kpi]').forEach(card => {
    const k = KPI[+card.dataset.kpi];
    if(k.filter) card.addEventListener('click', () => dashGoToTasks(k.filter));
  });

  const deptNameToId = {};
  state.departments.forEach(dp => deptNameToId[dp.name] = dp.id);

  wrap.querySelectorAll('.pie-hit, .leg-hit').forEach(elem => {
    elem.addEventListener('click', () => dashGoToTasks({ status: elem.dataset.fval }));
  });
  wrap.querySelectorAll('.bar-hit').forEach(g => {
    g.addEventListener('click', () => dashGoToTasks({ [g.dataset.fkey]: g.dataset.fval }));
  });
  wrap.querySelectorAll('.hbar-hit').forEach(row => {
    row.addEventListener('click', () => {
      const id = deptNameToId[row.dataset.fval];
      if(id) dashGoToTasks({ department_id: id });
    });
  });
}

function renderDashboardPage() {
  return `
  <div class="page-hero">
    <div class="hero-title"><h1>Дашборды</h1><p>Сводные показатели — нажмите на блок для просмотра задач</p></div>
    <button class="btn hero-btn" onclick="loadDashboard()">↻ Обновить</button>
  </div>
  <div class="dash-body" id="dash-body">
    <div class="loading"><div class="spinner"></div></div>
  </div>`;
}
