-- ТТМ — Транстелематика, схема базы данных
-- PostgreSQL

-- Отделы
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Пользователи системы
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('director','manager','worker')),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Задачи
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    responsible_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    period VARCHAR(10) CHECK (period IN ('year','quarter','month','week')),
    deadline DATE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','in_progress','review','done','overdue')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Комментарии к задачам
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Начальные данные: отделы
INSERT INTO departments (name) VALUES
  ('Молодые таланты'),('АХО'),('HR'),('ИТ'),
  ('Финансы'),('Юридический'),('Проектный офис')
ON CONFLICT DO NOTHING;

-- Пользователи (пароль: ttm2024)
INSERT INTO users (login, password, full_name, role, department_id) VALUES
  ('director',  'ttm2024', 'Александр Громов',   'director', NULL),
  ('manager1',  'ttm2024', 'Иван Петров',         'manager',  (SELECT id FROM departments WHERE name='Молодые таланты')),
  ('manager2',  'ttm2024', 'Ольга Новикова',      'manager',  (SELECT id FROM departments WHERE name='HR')),
  ('manager3',  'ttm2024', 'Дмитрий Соколов',     'manager',  (SELECT id FROM departments WHERE name='ИТ')),
  ('worker1',   'ttm2024', 'Мария Сидорова',      'worker',   (SELECT id FROM departments WHERE name='АХО')),
  ('worker2',   'ttm2024', 'Алексей Козлов',      'worker',   (SELECT id FROM departments WHERE name='АХО')),
  ('worker3',   'ttm2024', 'Анна Морозова',       'worker',   (SELECT id FROM departments WHERE name='HR')),
  ('worker4',   'ttm2024', 'Елена Волкова',       'worker',   (SELECT id FROM departments WHERE name='Финансы')),
  ('worker5',   'ttm2024', 'Сергей Лебедев',      'worker',   (SELECT id FROM departments WHERE name='Юридический')),
  ('worker6',   'ttm2024', 'Татьяна Орлова',      'worker',   (SELECT id FROM departments WHERE name='Проектный офис'))
ON CONFLICT DO NOTHING;

-- Тестовые задачи
INSERT INTO tasks (title, description, responsible_id, created_by, department_id, period, deadline, priority, status) VALUES
  ('Развить партнёрство с 5 вузами',       'Установить партнёрские отношения с ведущими вузами для привлечения молодых талантов',
   (SELECT id FROM users WHERE login='manager1'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Молодые таланты'), 'year',    NOW()+INTERVAL'180 days','high','in_progress'),
  ('Заключить соглашение с МИРЭА',         'Подготовить и подписать соглашение о сотрудничестве с МИРЭА',
   (SELECT id FROM users WHERE login='manager1'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Молодые таланты'), 'quarter', NOW()+INTERVAL'45 days', 'high','review'),
  ('Подготовить участие в хакатоне',       'Организовать участие компании в студенческом хакатоне: кейс, менторы, призы',
   (SELECT id FROM users WHERE login='manager1'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Молодые таланты'), 'month',   NOW()+INTERVAL'5 days',  'high','in_progress'),
  ('Согласовать постановку кейса',         'Финализировать описание кейса для хакатона',
   (SELECT id FROM users WHERE login='manager1'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Молодые таланты'), 'week',    NOW()+INTERVAL'2 days',  'high','new'),
  ('Подготовить рабочие места для стажёров','Оборудовать 10 рабочих мест для летних стажёров',
   (SELECT id FROM users WHERE login='worker1'),  (SELECT id FROM users WHERE login='manager1'),
   (SELECT id FROM departments WHERE name='АХО'),             'month',   NOW()+INTERVAL'20 days', 'medium','new'),
  ('Проверить переговорные перед мероприятием','Проверить оборудование во всех переговорных комнатах',
   (SELECT id FROM users WHERE login='worker2'),  (SELECT id FROM users WHERE login='manager1'),
   (SELECT id FROM departments WHERE name='АХО'),             'week',    NOW()+INTERVAL'1 days',  'medium','in_progress'),
  ('Обновить программу адаптации новичков','Переработать онбординг-материалы с учётом новых процессов',
   (SELECT id FROM users WHERE login='manager2'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='HR'),              'quarter', NOW()+INTERVAL'60 days', 'medium','new'),
  ('Провести Performance Review',          'Организовать квартальную оценку эффективности сотрудников',
   (SELECT id FROM users WHERE login='manager2'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='HR'),              'quarter', NOW()+INTERVAL'15 days', 'high','new'),
  ('Подготовить отчёт по найму',           'Собрать и проанализировать статистику найма за 6 месяцев',
   (SELECT id FROM users WHERE login='worker3'),  (SELECT id FROM users WHERE login='manager2'),
   (SELECT id FROM departments WHERE name='HR'),              'month',   NOW()+INTERVAL'10 days', 'medium','in_progress'),
  ('Проверить доступы новых сотрудников',  'Настроить учётные записи и права доступа для 5 новых сотрудников',
   (SELECT id FROM users WHERE login='manager3'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='ИТ'),              'week',    NOW()+INTERVAL'3 days',  'medium','in_progress'),
  ('Разработать ИТ-стратегию на год',      'Подготовить план развития ИТ-инфраструктуры и цифровизации',
   (SELECT id FROM users WHERE login='manager3'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='ИТ'),              'year',    NOW()+INTERVAL'200 days','high','in_progress'),
  ('Обновить антивирусное ПО',             'Обновить антивирусные решения на всех рабочих станциях',
   (SELECT id FROM users WHERE login='manager3'), (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='ИТ'),              'month',   NOW()+INTERVAL'7 days',  'medium','review'),
  ('Подготовить финансовый отчёт за квартал','Сформировать детальный финансовый отчёт по всем затратам',
   (SELECT id FROM users WHERE login='worker4'),  (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Финансы'),         'month',   NOW()-INTERVAL'5 days',  'high','overdue'),
  ('Аудит договорной базы',               'Провести ревизию всех действующих договоров',
   (SELECT id FROM users WHERE login='worker5'),  (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Юридический'),     'quarter', NOW()-INTERVAL'2 days',  'high','overdue'),
  ('Запустить проект внутреннего портала', 'Стартовать разработку корпоративного внутреннего портала',
   (SELECT id FROM users WHERE login='worker6'),  (SELECT id FROM users WHERE login='director'),
   (SELECT id FROM departments WHERE name='Проектный офис'),  'quarter', NOW()+INTERVAL'30 days', 'high','new')
ON CONFLICT DO NOTHING;
