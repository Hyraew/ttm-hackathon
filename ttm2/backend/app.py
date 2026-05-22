"""
ТТМ — Транстелематика
Flask + PostgreSQL Backend
"""
import os, json
from datetime import date, datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ── DB ────────────────────────────────────────────────────────────────────────
DB_URL = os.getenv('DATABASE_URL', 'postgresql://ttm:ttm2024@localhost:5432/ttm')

def get_db():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def query(sql, params=(), one=False, commit=False):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(sql, params)
    if commit:
        conn.commit()
        result = cur.rowcount
    elif one:
        result = cur.fetchone()
    else:
        result = cur.fetchall()
    cur.close(); conn.close()
    return result

def serial(obj):
    """JSON-сериализация дат"""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError

def ok(data):   return app.response_class(json.dumps(data, default=serial), mimetype='application/json')
def err(msg,c=400): return jsonify({'error': msg}), c

# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.post('/api/auth/login')
def login():
    d = request.json or {}
    user = query('SELECT * FROM users WHERE login=%s AND password=%s AND is_active=TRUE',
                 (d.get('login',''), d.get('password','')), one=True)
    if not user: return err('Неверный логин или пароль', 401)
    dept = query('SELECT name FROM departments WHERE id=%s', (user['department_id'],), one=True) if user['department_id'] else None
    return ok({**dict(user), 'department_name': dept['name'] if dept else None})

# ── DEPARTMENTS ───────────────────────────────────────────────────────────────
@app.get('/api/departments')
def get_departments():
    return ok(list(query('SELECT * FROM departments ORDER BY name')))

# ── USERS ─────────────────────────────────────────────────────────────────────
@app.get('/api/users')
def get_users():
    rows = query('''
        SELECT u.*, d.name as department_name
        FROM users u LEFT JOIN departments d ON u.department_id=d.id
        ORDER BY u.full_name
    ''')
    return ok([dict(r) for r in rows])

@app.get('/api/users/active')
def get_active_users():
    rows = query('''
        SELECT u.id, u.full_name, u.role, u.department_id, d.name as department_name
        FROM users u LEFT JOIN departments d ON u.department_id=d.id
        WHERE u.is_active=TRUE ORDER BY u.full_name
    ''')
    return ok([dict(r) for r in rows])

@app.post('/api/users')
def create_user():
    """Директор: добавить сотрудника в любой отдел.
       Менеджер: добавить в свой отдел."""
    d = request.json or {}
    role = d.get('role','worker')
    if not d.get('login') or not d.get('full_name'):
        return err('login и full_name обязательны')
    query('''INSERT INTO users(login,password,full_name,role,department_id)
             VALUES(%s,%s,%s,%s,%s)''',
          (d['login'], d.get('password','ttm2024'), d['full_name'],
           role, d.get('department_id')), commit=True)
    return ok({'ok': True})

@app.put('/api/users/<int:uid>')
def update_user(uid):
    """Обновить данные пользователя."""
    d = request.json or {}
    fields, vals = [], []
    for f in ('full_name','role','department_id','is_active'):
        if f in d:
            fields.append(f'{f}=%s')
            vals.append(d[f])
    if not fields: return err('Нет данных для обновления')
    vals.append(uid)
    query(f'UPDATE users SET {",".join(fields)} WHERE id=%s', vals, commit=True)
    return ok({'ok': True})

@app.delete('/api/users/<int:uid>')
def deactivate_user(uid):
    """Уволить сотрудника. Его незавершённые задачи автоматически
       становятся без ответственного (responsible_id = NULL) и попадают
       во вкладку «Задачи без ответственных»."""
    query('UPDATE users SET is_active=FALSE WHERE id=%s', (uid,), commit=True)
    query("UPDATE tasks SET responsible_id=NULL WHERE responsible_id=%s AND status!='done'",
          (uid,), commit=True)
    return ok({'ok': True})

@app.post('/api/users/<int:uid>/reassign')
def reassign_tasks(uid):
    """Перераспределить задачи уволенного сотрудника."""
    d = request.json or {}
    new_id = d.get('new_responsible_id')
    if not new_id: return err('new_responsible_id обязателен')
    query('UPDATE tasks SET responsible_id=%s WHERE responsible_id=%s AND status!=\'done\'',
          (new_id, uid), commit=True)
    return ok({'ok': True})

# ── TASKS ─────────────────────────────────────────────────────────────────────
@app.get('/api/tasks')
def get_tasks():
    p = request.args
    sql = '''
        SELECT t.*, u.full_name as responsible_name, d.name as department_name,
               c.full_name as created_by_name
        FROM tasks t
        LEFT JOIN users u ON t.responsible_id=u.id
        LEFT JOIN departments d ON t.department_id=d.id
        LEFT JOIN users c ON t.created_by=c.id
        WHERE 1=1
    '''
    params = []
    if p.get('unassigned') == '1':
        sql += " AND t.responsible_id IS NULL AND t.status != 'done'"
    if p.get('department_id'):
        sql += ' AND t.department_id=%s'; params.append(p['department_id'])
    if p.get('responsible_id'):
        sql += ' AND t.responsible_id=%s'; params.append(p['responsible_id'])
    if p.get('status'):
        sql += ' AND t.status=%s'; params.append(p['status'])
    if p.get('period'):
        sql += ' AND t.period=%s'; params.append(p['period'])
    if p.get('priority'):
        sql += ' AND t.priority=%s'; params.append(p['priority'])
    if p.get('search'):
        sql += ' AND (t.title ILIKE %s OR t.description ILIKE %s)'
        params += [f"%{p['search']}%", f"%{p['search']}%"]
    sql += ' ORDER BY t.created_at DESC'
    return ok([dict(r) for r in query(sql, params)])

@app.get('/api/tasks/<int:tid>')
def get_task(tid):
    t = query('''
        SELECT t.*, u.full_name as responsible_name, d.name as department_name
        FROM tasks t LEFT JOIN users u ON t.responsible_id=u.id
        LEFT JOIN departments d ON t.department_id=d.id WHERE t.id=%s
    ''', (tid,), one=True)
    if not t: return err('Не найдено', 404)
    comments = query('''
        SELECT c.*, u.full_name as author_name FROM comments c
        LEFT JOIN users u ON c.author_id=u.id WHERE c.task_id=%s ORDER BY c.created_at
    ''', (tid,))
    result = dict(t)
    result['comments'] = [dict(c) for c in comments]
    return ok(result)

@app.post('/api/tasks')
def create_task():
    d = request.json or {}
    if not d.get('title'): return err('title обязателен')
    query('''INSERT INTO tasks(title,description,responsible_id,created_by,department_id,period,deadline,priority,status)
             VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
          (d['title'], d.get('description'), d.get('responsible_id'), d.get('created_by'),
           d.get('department_id'), d.get('period','week'), d.get('deadline'),
           d.get('priority','medium'), d.get('status','new')), commit=True)
    return ok({'ok': True}), 201

@app.put('/api/tasks/<int:tid>')
def update_task(tid):
    d = request.json or {}
    fields, vals = [], []
    for f in ('title','description','responsible_id','department_id','period','deadline','priority','status'):
        if f in d:
            fields.append(f'{f}=%s'); vals.append(d[f])
    if not fields: return err('Нет данных')
    vals.append(tid)
    query(f'UPDATE tasks SET {",".join(fields)} WHERE id=%s', vals, commit=True)
    return ok({'ok': True})

@app.delete('/api/tasks/<int:tid>')
def delete_task(tid):
    query('DELETE FROM tasks WHERE id=%s', (tid,), commit=True)
    return ok({'ok': True})

@app.post('/api/tasks/<int:tid>/comments')
def add_comment(tid):
    d = request.json or {}
    if not d.get('text'): return err('text обязателен')
    query('INSERT INTO comments(task_id,author_id,text) VALUES(%s,%s,%s)',
          (tid, d.get('author_id'), d['text']), commit=True)
    return ok({'ok': True}), 201

# ── ANALYTICS ─────────────────────────────────────────────────────────────────
@app.get('/api/analytics')
def analytics():
    total     = query('SELECT COUNT(*) as n FROM tasks', one=True)['n']
    by_status = {r['status']: r['n'] for r in query('SELECT status, COUNT(*) as n FROM tasks GROUP BY status')}
    by_dept   = {r['department_name']: r['n'] for r in query(
        'SELECT d.name as department_name, COUNT(*) as n FROM tasks t LEFT JOIN departments d ON t.department_id=d.id GROUP BY d.name')}
    by_period = {r['period']: r['n'] for r in query('SELECT period, COUNT(*) as n FROM tasks GROUP BY period')}
    overdue   = query("SELECT COUNT(*) as n FROM tasks WHERE status='overdue'", one=True)['n']
    at_risk   = query(
        "SELECT COUNT(*) as n FROM tasks WHERE deadline BETWEEN NOW() AND NOW()+INTERVAL'7 days' AND status NOT IN ('done','overdue')",
        one=True)['n']
    load = {r['full_name']: r['n'] for r in query(
        "SELECT u.full_name, COUNT(*) as n FROM tasks t LEFT JOIN users u ON t.responsible_id=u.id WHERE t.status!='done' GROUP BY u.full_name")}
    return ok({'total':total,'by_status':by_status,'by_dept':by_dept,'by_period':by_period,
               'overdue':overdue,'at_risk':at_risk,'employee_load':load})

# ── AI AGENT (GigaChat / Сбер) ─────────────────────────────────────────────────
import urllib.request
import urllib.parse
import ssl
import uuid
import io
import time

# Ключ авторизации GigaChat (Authorization Key из личного кабинета)
GIGACHAT_AUTH_KEY = os.getenv(
    'GIGACHAT_AUTH_KEY',
    'MDE5ZTRlZDktYWVhZi03ODkwLWJjOTMtMTc4ZjA1NTYxZmI2OmEyMTAyNzdlLTcxNmQtNGI0Yi1hZThiLTUzOTlmY2E2YzFmYg=='
)
GIGACHAT_SCOPE = os.getenv('GIGACHAT_SCOPE', 'GIGACHAT_API_PERS')  # PERS — физлица
GIGACHAT_MODEL = 'GigaChat'
OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
CHAT_URL  = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions'

# GigaChat использует сертификаты Минцифры — отключаем проверку SSL
_SSL = ssl.create_default_context()
_SSL.check_hostname = False
_SSL.verify_mode = ssl.CERT_NONE

# Кэш access-токена (живёт 30 минут)
_token_cache = {'token': None, 'expires': 0}

AGENT_PERSONA = (
    "Ты — дружелюбный AI-агент Человек-паук, помощник в системе управления "
    "задачами компании «Транстелематика». Отвечай на русском языке, кратко, "
    "по делу и доброжелательно. Иногда можешь добавить лёгкую отсылку к "
    "Человеку-пауку (про ответственность, паутину задач), но без перебора. "
    "Помогаешь руководителям анализировать задачи и составлять отчёты."
)

def get_gigachat_token():
    """Получить access-токен GigaChat (с кэшированием)."""
    now = time.time()
    if _token_cache['token'] and now < _token_cache['expires']:
        return _token_cache['token']

    data = urllib.parse.urlencode({'scope': GIGACHAT_SCOPE}).encode('utf-8')
    req = urllib.request.Request(
        OAUTH_URL,
        data=data,
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': str(uuid.uuid4()),
            'Authorization': f'Basic {GIGACHAT_AUTH_KEY}',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30, context=_SSL) as resp:
        d = json.loads(resp.read().decode('utf-8'))
    _token_cache['token']   = d['access_token']
    # expires_at в миллисекундах; обновляем за 60 сек до истечения
    _token_cache['expires'] = d.get('expires_at', 0) / 1000 - 60
    if _token_cache['expires'] < now:
        _token_cache['expires'] = now + 25 * 60
    return _token_cache['token']

def call_gigachat(user_text, context=''):
    """Запрос к GigaChat API."""
    try:
        token = get_gigachat_token()
    except Exception as e:
        return f'[Ошибка авторизации GigaChat: {e}]'

    system = AGENT_PERSONA + (('\n\nДанные о задачах:\n' + context) if context else '')
    payload = {
        'model': GIGACHAT_MODEL,
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user',   'content': user_text},
        ],
        'temperature': 0.6,
    }
    req = urllib.request.Request(
        CHAT_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=_SSL) as resp:
            d = json.loads(resp.read().decode('utf-8'))
        return d['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        # токен мог протухнуть — сбрасываем кэш на следующий раз
        _token_cache['token'] = None
        return f'[Ошибка GigaChat API: {e.code}] {body[:200]}'
    except Exception as e:
        return f'[Ошибка соединения с AI: {e}]'

def build_tasks_context():
    """Сводка по задачам для AI."""
    a = json.loads(analytics().get_data())
    tasks = query('''
        SELECT t.title, t.status, t.priority, t.period, t.deadline,
               d.name as dept, u.full_name as resp
        FROM tasks t LEFT JOIN departments d ON t.department_id=d.id
        LEFT JOIN users u ON t.responsible_id=u.id
        ORDER BY t.deadline LIMIT 30
    ''')
    lines = [
        f"Всего задач: {a['total']}",
        f"Просрочено: {a['overdue']}, В зоне риска: {a['at_risk']}",
        f"По статусам: {a['by_status']}",
        f"По отделам: {a['by_dept']}",
        "",
        "Список задач:",
    ]
    for t in tasks:
        dl = t['deadline'].isoformat() if t['deadline'] else 'нет'
        lines.append(f"- [{t['status']}/{t['priority']}/{t['period']}] {t['title']} "
                      f"(отдел: {t['dept']}, ответств.: {t['resp'] or 'НЕ НАЗНАЧЕН'}, дедлайн: {dl})")
    return '\n'.join(lines)

@app.post('/api/ai/chat')
def ai_chat():
    d = request.json or {}
    msg = d.get('message', '').strip()
    if not msg:
        return err('message обязателен')
    reply = call_gigachat(msg, build_tasks_context())
    return ok({'reply': reply})

REPORT_PROMPT = (
    "Составь краткий управленческий отчёт по текущему состоянию задач. "
    "Структура: 1) Общая ситуация 2) Проблемные зоны (просрочки, риски) "
    "3) Загрузка отделов 4) Рекомендации руководителю. "
    "Пиши деловым языком, по пунктам, без воды."
)

@app.get('/api/ai/report')
def ai_report():
    """AI составляет управленческий отчёт по задачам (текст)."""
    report = call_gigachat(REPORT_PROMPT, build_tasks_context())
    return ok({'report': report, 'generated_at': datetime.now().isoformat()})

# ── ЭКСПОРТ ОТЧЁТА ─────────────────────────────────────────────────────────────
RU_STATUS = {'new':'Новая','in_progress':'В работе','review':'На согласовании',
             'done':'Выполнена','overdue':'Просрочена'}
RU_PERIOD = {'year':'Год','quarter':'Квартал','month':'Месяц','week':'Неделя'}

@app.get('/api/ai/report/excel')
def report_excel():
    """Отчёт в Excel со встроенными графиками."""
    from openpyxl import Workbook
    from openpyxl.chart import BarChart, PieChart, Reference
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from flask import send_file

    a = json.loads(analytics().get_data())
    text = call_gigachat(REPORT_PROMPT, build_tasks_context())

    wb = Workbook()
    blue   = PatternFill('solid', fgColor='003C97')
    light  = PatternFill('solid', fgColor='9CDDE6')
    hdr_f  = Font(bold=True, color='FFFFFF', size=11)
    title_f= Font(bold=True, color='020F52', size=14)
    thin   = Side(style='thin', color='D0DCEA')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # ── Лист 1: Сводка ──
    ws = wb.active
    ws.title = 'Сводка'
    ws.column_dimensions['A'].width = 34
    ws.column_dimensions['B'].width = 16
    ws['A1'] = 'ТТМ — Отчёт по задачам'
    ws['A1'].font = title_f
    ws['A2'] = 'Сформирован: ' + datetime.now().strftime('%d.%m.%Y %H:%M')
    ws['A2'].font = Font(color='7A96B4', size=9)

    kpis = [
        ('Всего задач', a['total']),
        ('Просрочено', a['overdue']),
        ('В зоне риска', a['at_risk']),
        ('Выполнено', a['by_status'].get('done', 0)),
    ]
    ws['A4'] = 'Показатель'; ws['B4'] = 'Значение'
    for c in ('A4','B4'):
        ws[c].fill = blue; ws[c].font = hdr_f; ws[c].border = border
    for i,(k,v) in enumerate(kpis, start=5):
        ws[f'A{i}'] = k; ws[f'B{i}'] = v
        ws[f'A{i}'].border = border; ws[f'B{i}'].border = border

    # ── Лист 2: Статусы (+ круговая диаграмма) ──
    ws2 = wb.create_sheet('Статусы')
    ws2.column_dimensions['A'].width = 22
    ws2['A1'] = 'Статус'; ws2['B1'] = 'Кол-во'
    for c in ('A1','B1'):
        ws2[c].fill = blue; ws2[c].font = hdr_f
    r = 2
    for k,v in a['by_status'].items():
        ws2[f'A{r}'] = RU_STATUS.get(k,k); ws2[f'B{r}'] = v; r += 1
    if r > 2:
        pie = PieChart(); pie.title = 'Распределение по статусам'
        pie.add_data(Reference(ws2, min_col=2, min_row=1, max_row=r-1), titles_from_data=True)
        pie.set_categories(Reference(ws2, min_col=1, min_row=2, max_row=r-1))
        ws2.add_chart(pie, 'D2')

    # ── Лист 3: Отделы (+ столбчатая диаграмма) ──
    ws3 = wb.create_sheet('Отделы')
    ws3.column_dimensions['A'].width = 24
    ws3['A1'] = 'Отдел'; ws3['B1'] = 'Задач'
    for c in ('A1','B1'):
        ws3[c].fill = blue; ws3[c].font = hdr_f
    r = 2
    for k,v in a['by_dept'].items():
        ws3[f'A{r}'] = k or 'Без отдела'; ws3[f'B{r}'] = v; r += 1
    if r > 2:
        bar = BarChart(); bar.title = 'Задачи по отделам'; bar.type = 'col'
        bar.add_data(Reference(ws3, min_col=2, min_row=1, max_row=r-1), titles_from_data=True)
        bar.set_categories(Reference(ws3, min_col=1, min_row=2, max_row=r-1))
        ws3.add_chart(bar, 'D2')

    # ── Лист 4: Загрузка сотрудников ──
    ws4 = wb.create_sheet('Загрузка')
    ws4.column_dimensions['A'].width = 26
    ws4['A1'] = 'Сотрудник'; ws4['B1'] = 'Активных задач'
    for c in ('A1','B1'):
        ws4[c].fill = blue; ws4[c].font = hdr_f
    r = 2
    for k,v in a['employee_load'].items():
        ws4[f'A{r}'] = k or '—'; ws4[f'B{r}'] = v; r += 1
    if r > 2:
        bar2 = BarChart(); bar2.title = 'Загрузка сотрудников'; bar2.type = 'bar'
        bar2.add_data(Reference(ws4, min_col=2, min_row=1, max_row=r-1), titles_from_data=True)
        bar2.set_categories(Reference(ws4, min_col=1, min_row=2, max_row=r-1))
        ws4.add_chart(bar2, 'D2')

    # ── Лист 5: AI-анализ ──
    ws5 = wb.create_sheet('AI-анализ')
    ws5.column_dimensions['A'].width = 100
    ws5['A1'] = 'Аналитический отчёт AI-агента'
    ws5['A1'].font = title_f
    row = 3
    for line in text.split('\n'):
        ws5[f'A{row}'] = line
        ws5[f'A{row}'].alignment = Alignment(wrap_text=True, vertical='top')
        row += 1

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name='TTM_otchet.xlsx')

@app.get('/api/ai/report/pdf')
def report_pdf():
    """Отчёт в PDF с диаграммами."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                    TableStyle)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from flask import send_file

    # Кириллический шрифт
    font_name = 'Helvetica'
    for fp in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
               '/Library/Fonts/Arial.ttf',
               'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(fp):
            try:
                pdfmetrics.registerFont(TTFont('Main', fp))
                font_name = 'Main'
                break
            except Exception:
                pass

    a = json.loads(analytics().get_data())
    text = call_gigachat(REPORT_PROMPT, build_tasks_context())

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle('h1', parent=styles['Title'], fontName=font_name,
                        textColor=colors.HexColor('#020F52'), fontSize=18)
    h2 = ParagraphStyle('h2', parent=styles['Heading2'], fontName=font_name,
                        textColor=colors.HexColor('#003C97'), fontSize=13)
    body = ParagraphStyle('body', parent=styles['Normal'], fontName=font_name,
                          fontSize=10, leading=15)
    small= ParagraphStyle('small', parent=styles['Normal'], fontName=font_name,
                          fontSize=8, textColor=colors.HexColor('#7A96B4'))

    elems = []
    elems.append(Paragraph('ТТМ — Отчёт по задачам', h1))
    elems.append(Paragraph('Транстелематика · сформирован ' +
                           datetime.now().strftime('%d.%m.%Y %H:%M'), small))
    elems.append(Spacer(1, 0.6*cm))

    # KPI-таблица
    kpi_rows = [['Показатель', 'Значение'],
                ['Всего задач', a['total']],
                ['Просрочено', a['overdue']],
                ['В зоне риска', a['at_risk']],
                ['Выполнено', a['by_status'].get('done', 0)]]
    tbl = Table(kpi_rows, colWidths=[8*cm, 4*cm])
    tbl.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), font_name),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#003C97')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0DCEA')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F7FAFD')]),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elems.append(tbl)
    elems.append(Spacer(1, 0.6*cm))

    palette = [colors.HexColor('#020F52'), colors.HexColor('#003C97'),
               colors.HexColor('#269AE6'), colors.HexColor('#9CDDE6'),
               colors.HexColor('#d63b4a')]

    # Круговая диаграмма статусов
    if a['by_status']:
        elems.append(Paragraph('Распределение по статусам', h2))
        d = Drawing(400, 180)
        pie = Pie()
        pie.x, pie.y = 130, 15
        pie.width = pie.height = 150
        pie.data   = list(a['by_status'].values())
        pie.labels = [RU_STATUS.get(k,k) for k in a['by_status']]
        for i in range(len(pie.data)):
            pie.slices[i].fillColor = palette[i % len(palette)]
        d.add(pie)
        elems.append(d)
        elems.append(Spacer(1, 0.3*cm))

    # Столбчатая диаграмма отделов
    if a['by_dept']:
        elems.append(Paragraph('Задачи по отделам', h2))
        d2 = Drawing(460, 200)
        bc = VerticalBarChart()
        bc.x, bc.y = 30, 30
        bc.width, bc.height = 400, 140
        bc.data = [list(a['by_dept'].values())]
        bc.categoryAxis.categoryNames = [str(k)[:10] for k in a['by_dept'].keys()]
        bc.categoryAxis.labels.fontName = font_name
        bc.categoryAxis.labels.fontSize = 7
        bc.categoryAxis.labels.angle = 30
        bc.valueAxis.labels.fontName = font_name
        bc.bars[0].fillColor = colors.HexColor('#269AE6')
        d2.add(bc)
        elems.append(d2)
        elems.append(Spacer(1, 0.4*cm))

    # AI-анализ
    elems.append(Paragraph('Аналитический отчёт AI-агента', h2))
    for line in text.split('\n'):
        if line.strip():
            safe = line.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
            safe = safe.replace('**','')
            elems.append(Paragraph(safe, body))
        else:
            elems.append(Spacer(1, 0.2*cm))

    doc.build(elems)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     as_attachment=True, download_name='TTM_otchet.pdf')

# ── SERVE FRONTEND ─────────────────────────────────────────────────────────────
@app.get('/')
@app.get('/<path:path>')
def serve(path=''):
    fp = os.path.join(app.static_folder, path)
    if path and os.path.exists(fp):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
