// AI-агент — Человек-паук на базе DeepSeek

function renderAIPage() {
  return `
  <div class="page-hero">
    <div class="hero-title"><h1>AI-агент</h1><p>Дружелюбный помощник по задачам</p></div>
    <button class="btn hero-btn" id="ai-report-btn">📋 Составить отчёт</button>
  </div>
  <div class="ai-body">
    <div class="ai-chat-card">
      <div class="ai-chat-head">
        <div class="ai-ava">🕷️</div>
        <div>
          <div class="ai-name">Агент Человек-паук</div>
          <div class="ai-status"><span class="ai-dot"></span>На связи · DeepSeek</div>
        </div>
      </div>
      <div class="ai-messages" id="ai-messages"></div>
      <div class="ai-input-bar">
        <input class="inp" id="ai-input" placeholder="Спросите про задачи..."/>
        <button class="btn btn-primary" id="ai-send">→</button>
      </div>
    </div>
  </div>`;
}

function aiAddMessage(role, text) {
  const box = document.getElementById('ai-messages');
  if(!box) return;
  const wrap = el('div', `ai-msg ai-msg-${role} fade-in`);
  if(role === 'agent') {
    wrap.innerHTML = `<div class="ai-msg-ava">🕷️</div><div class="ai-bubble">${text}</div>`;
  } else {
    wrap.innerHTML = `<div class="ai-bubble">${text}</div><div class="ai-msg-ava ai-user-ava">${initials(state.user.full_name)}</div>`;
  }
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
  return wrap;
}

function aiTyping(on) {
  const box = document.getElementById('ai-messages');
  let t = document.getElementById('ai-typing');
  if(on && !t) {
    t = el('div','ai-msg ai-msg-agent');
    t.id = 'ai-typing';
    t.innerHTML = `<div class="ai-msg-ava">🕷️</div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>`;
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  } else if(!on && t) {
    t.remove();
  }
}

async function aiSend(text) {
  const msg = (text || document.getElementById('ai-input').value).trim();
  if(!msg) return;
  document.getElementById('ai-input').value = '';
  aiAddMessage('user', msg);
  aiTyping(true);
  try {
    const res = await api.post('/api/ai/chat', { message: msg });
    aiTyping(false);
    aiAddMessage('agent', formatAIText(res.reply));
  } catch(e) {
    aiTyping(false);
    aiAddMessage('agent', '⚠ Не удалось связаться с AI: ' + e.message);
  }
}

async function aiGenerateReport() {
  aiAddMessage('user', '📋 Составь управленческий отчёт по задачам');
  aiTyping(true);
  try {
    const res = await api.get('/api/ai/report');
    aiTyping(false);
    const bubble = aiAddMessage('agent', formatAIText(res.report));
    // Кнопки экспорта под отчётом
    const exportRow = el('div','ai-export-row');
    exportRow.innerHTML = `
      <button class="ai-export-btn excel" onclick="downloadReport('excel')">📊 Скачать Excel (с графиками)</button>
      <button class="ai-export-btn pdf" onclick="downloadReport('pdf')">📄 Скачать PDF</button>`;
    bubble.querySelector('.ai-bubble').appendChild(exportRow);
  } catch(e) {
    aiTyping(false);
    aiAddMessage('agent', '⚠ Не удалось составить отчёт: ' + e.message);
  }
}

// Скачивание отчёта файлом
function downloadReport(format) {
  const url = format === 'excel' ? '/api/ai/report/excel' : '/api/ai/report/pdf';
  // открываем в новой вкладке — браузер сам скачает файл
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'excel' ? 'TTM_otchet.xlsx' : 'TTM_otchet.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatAIText(t) {
  return (t || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

function setupAIPage() {
  const box = document.getElementById('ai-messages');
  box.innerHTML = '';
  aiAddMessage('agent', 'Привет, я дружелюбный агент — Человек-паук! 🕷️<br><br>Я помогу разобраться с задачами компании: расскажу про просрочки, загрузку отделов и составлю отчёт. Просто спросите!');

  const sugg = el('div','ai-suggestions');
  ['Какие задачи в зоне риска?', 'Кто перегружен задачами?', 'Покажи задачи без ответственных', 'Составь отчёт'].forEach(s => {
    const b = el('button','ai-sugg-btn', s);
    b.onclick = () => { sugg.remove(); s==='Составь отчёт' ? aiGenerateReport() : aiSend(s); };
    sugg.appendChild(b);
  });
  box.appendChild(sugg);

  document.getElementById('ai-send').onclick = () => aiSend();
  document.getElementById('ai-input').onkeydown = e => { if(e.key==='Enter') aiSend(); };
  document.getElementById('ai-report-btn').onclick = aiGenerateReport;
}
