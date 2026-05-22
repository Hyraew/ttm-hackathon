// API utility
const API_BASE = '';  // same origin — Flask serves frontend

const STATUS_LABELS  = { new:'Новая', in_progress:'В работе', review:'На согласовании', done:'Выполнена', overdue:'Просрочена' };
const PRIORITY_LABELS= { high:'Высокий', medium:'Средний', low:'Низкий' };
const PERIOD_LABELS  = { year:'Год', quarter:'Квартал', month:'Месяц', week:'Неделя' };
const ROLE_LABELS    = { director:'Директор', manager:'Нач. отдела', worker:'Работник' };
const STATUS_COLORS  = { new:'#269AE6', in_progress:'#003C97', review:'#e8920a', done:'#18a66b', overdue:'#d63b4a' };
const ROLE_COLORS    = { director:'#020F52', manager:'#003C97', worker:'#269AE6' };

async function apiFetch(path, opts={}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

const api = {
  get:    (p)    => apiFetch(p),
  post:   (p, b) => apiFetch(p, { method:'POST',   body:b }),
  put:    (p, b) => apiFetch(p, { method:'PUT',    body:b }),
  delete: (p)    => apiFetch(p, { method:'DELETE' }),
};

function initials(name='') { return name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function isOverdue(t) { return t.status!=='done' && new Date(t.deadline) < new Date(); }
function dlInfo(deadline, status) {
  if(!deadline || status==='done') return null;
  const diff = Math.ceil((new Date(deadline)-new Date())/(864e5));
  if(diff < 0) return { text:`${Math.abs(diff)}д просрочка`, cls:'dl-red' };
  if(diff <= 3) return { text:`${diff}д`, cls:'dl-yellow' };
  return { text: new Date(deadline).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}), cls:'dl-ok' };
}

function el(tag, cls='', html='') {
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html) e.innerHTML = html;
  return e;
}
function badge(val, map, prefix='b-') {
  return `<span class="badge ${prefix}${val}">${map[val]||val}</span>`;
}

// State
const state = { user: null, tasks:[], users:[], departments:[], currentTaskId:null };
