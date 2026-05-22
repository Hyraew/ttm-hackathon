// 🕷️ Чиби Человек-паук — пасхалка
function initSpiderMan() {
  let pos = { x: 80, y: window.innerHeight - 130 };
  let clicks = 0;
  let msgTimeout = null;

  const MSGS = [
    'С большой силой приходит большая ответственность!',
    'Не забудь выполнить задачу вовремя! 👀',
    'Ваш дружелюбный сосед следит за дедлайнами',
    'Просроченные задачи — моя слабость!',
    'Паутина задач? Разберёмся!',
    'Чур я не ответственный за просрочку!',
    'Стой! У тебя есть просроченные задачи 🔴',
  ];

  const wrapper = document.createElement('div');
  wrapper.id = 'spidey';
  wrapper.style.cssText = `position:fixed;z-index:9999;cursor:pointer;user-select:none;transition:left 1.4s cubic-bezier(.4,0,.2,1),top 1.4s cubic-bezier(.4,0,.2,1);`;
  wrapper.style.left = pos.x+'px';
  wrapper.style.top  = pos.y+'px';

  wrapper.innerHTML = `
    <style>
      @keyframes spideyFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-9px) rotate(4deg)}}
      @keyframes spideySwing{0%{transform:rotate(-22deg)}100%{transform:rotate(22deg)}}
      #spidey-svg{animation:spideyFloat 3s ease-in-out infinite}
      #spidey-svg.swing{animation:spideySwing .4s ease-in-out infinite alternate}
      #spidey-bubble{display:none;position:absolute;bottom:105%;left:50%;transform:translateX(-50%);background:#fff;border:2px solid #C62828;border-radius:12px;padding:9px 13px;font-size:12px;font-weight:600;color:#1a1a1a;white-space:normal;max-width:210px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.18);font-family:Inter,sans-serif;z-index:2;animation:fadeInUp .2s ease;}
      #spidey-bubble.show{display:block}
      #spidey-bubble::after{content:'';position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid #C62828;}
      #spidey-thread{position:absolute;left:50%;bottom:100%;width:1px;height:65px;background:linear-gradient(to bottom,transparent,rgba(180,180,180,.4));transform:translateX(-50%);pointer-events:none;}
      #spidey-close{position:absolute;top:-9px;right:-9px;width:18px;height:18px;border-radius:50%;background:#888;border:none;color:#fff;font-size:10px;cursor:pointer;opacity:.6;display:flex;align-items:center;justify-content:center;}
    </style>
    <div id="spidey-thread"></div>
    <div id="spidey-bubble"></div>
    <button id="spidey-close">✕</button>
    <svg id="spidey-svg" width="72" height="90" viewBox="0 0 72 90" filter="url(#sd)">
      <defs><filter id="sd"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(0,0,0,.32)"/></filter></defs>
      <!-- ноги -->
      <path d="M28 72 Q22 78 16 82 Q14 83 15 85 Q16 86 18 85 Q24 81 30 75Z" fill="#1a1a9e" stroke="#111" stroke-width="1"/>
      <path d="M44 72 Q50 78 56 82 Q58 83 57 85 Q56 86 54 85 Q48 81 42 75Z" fill="#1a1a9e" stroke="#111" stroke-width="1"/>
      <path d="M30 74 Q26 82 22 86 Q20 87 21 89 Q22 90 24 89 Q28 85 32 77Z" fill="#C62828" stroke="#111" stroke-width=".8"/>
      <path d="M42 74 Q46 82 50 86 Q52 87 51 89 Q50 90 48 89 Q44 85 40 77Z" fill="#C62828" stroke="#111" stroke-width=".8"/>
      <!-- тело -->
      <path d="M20 52 Q14 54 13 62 Q13 70 20 72 L28 73 L28 52Z" fill="#1a1a9e" stroke="#111" stroke-width="1"/>
      <path d="M52 52 Q58 54 59 62 Q59 70 52 72 L44 73 L44 52Z" fill="#1a1a9e" stroke="#111" stroke-width="1"/>
      <rect x="26" y="50" width="20" height="24" rx="4" fill="#C62828" stroke="#111" stroke-width="1"/>
      <line x1="36" y1="50" x2="36" y2="74" stroke="#8B0000" stroke-width=".8" opacity=".6"/>
      <line x1="26" y1="57" x2="46" y2="57" stroke="#8B0000" stroke-width=".8" opacity=".6"/>
      <line x1="26" y1="63" x2="46" y2="63" stroke="#8B0000" stroke-width=".8" opacity=".6"/>
      <line x1="26" y1="69" x2="46" y2="69" stroke="#8B0000" stroke-width=".8" opacity=".6"/>
      <ellipse cx="36" cy="60" rx="3" ry="2" fill="#111"/>
      <line x1="33" y1="59" x2="30" y2="57" stroke="#111" stroke-width=".8"/>
      <line x1="39" y1="59" x2="42" y2="57" stroke="#111" stroke-width=".8"/>
      <line x1="33" y1="61" x2="30" y2="63" stroke="#111" stroke-width=".8"/>
      <line x1="39" y1="61" x2="42" y2="63" stroke="#111" stroke-width=".8"/>
      <!-- руки -->
      <path d="M20 54 Q10 50 6 44 Q4 40 7 38 Q10 36 12 40 Q15 46 22 50Z" fill="#C62828" stroke="#111" stroke-width="1"/>
      <ellipse cx="6" cy="39" rx="4" ry="3" fill="#C62828" stroke="#111" stroke-width=".8"/>
      <path d="M4 37 Q-4 28 -8 18" stroke="#aaa" stroke-width="1" fill="none" stroke-dasharray="2,1"/>
      <path d="M52 54 Q62 50 64 56 Q66 60 62 62 Q58 63 54 58Z" fill="#1a1a9e" stroke="#111" stroke-width="1"/>
      <!-- голова -->
      <ellipse cx="36" cy="30" rx="22" ry="24" fill="#C62828" stroke="#111" stroke-width="1.5"/>
      <path d="M36 6 Q36 30 36 54" stroke="#8B0000" stroke-width=".7" opacity=".5"/>
      <path d="M14 30 Q36 30 58 30" stroke="#8B0000" stroke-width=".7" opacity=".5"/>
      <ellipse cx="36" cy="30" rx="16" ry="24" fill="none" stroke="#8B0000" stroke-width=".7" opacity=".4"/>
      <ellipse cx="36" cy="30" rx="22" ry="16" fill="none" stroke="#8B0000" stroke-width=".7" opacity=".4"/>
      <path d="M18 17 Q36 30 54 17" stroke="#8B0000" stroke-width=".7" opacity=".4" fill="none"/>
      <path d="M18 43 Q36 30 54 43" stroke="#8B0000" stroke-width=".7" opacity=".4" fill="none"/>
      <path d="M14 28 Q20 24 36 23 Q52 24 58 28 Q52 36 36 37 Q20 36 14 28Z" fill="#1a1a9e"/>
      <path d="M17 24 Q22 18 28 22 Q26 29 20 29 Q16 28 17 24Z" fill="white" stroke="#111" stroke-width=".8"/>
      <path d="M55 24 Q50 18 44 22 Q46 29 52 29 Q56 28 55 24Z" fill="white" stroke="#111" stroke-width=".8"/>
      <ellipse cx="22" cy="23" rx="2" ry="1.5" fill="white" opacity=".7"/>
      <ellipse cx="50" cy="23" rx="2" ry="1.5" fill="white" opacity=".7"/>
      <ellipse cx="28" cy="14" rx="6" ry="4" fill="white" opacity=".12" transform="rotate(-20,28,14)"/>
    </svg>`;

  document.body.appendChild(wrapper);

  const svg    = document.getElementById('spidey-svg');
  const bubble = document.getElementById('spidey-bubble');
  const closeBtn = document.getElementById('spidey-close');

  wrapper.addEventListener('click', e => {
    if(e.target === closeBtn) { wrapper.remove(); return; }
    clicks++;
    const msg = MSGS[clicks % MSGS.length];
    bubble.textContent = msg;
    bubble.className = 'show';
    svg.classList.add('swing');
    clearTimeout(msgTimeout);
    msgTimeout = setTimeout(() => { bubble.className=''; svg.classList.remove('swing'); }, 2200);
    // Переход на вкладку AI-агента
    if(typeof navigateTo === 'function') {
      setTimeout(() => navigateTo('ai'), 350);
    }
  });
  closeBtn.addEventListener('click', e => { e.stopPropagation(); wrapper.remove(); });

  // Random movement
  setInterval(() => {
    if(Math.random() > 0.55) {
      pos = {
        x: 60 + Math.random() * (window.innerWidth - 160),
        y: 60 + Math.random() * (window.innerHeight - 160),
      };
      wrapper.style.left = pos.x+'px';
      wrapper.style.top  = pos.y+'px';
    }
  }, 7000);
}
