const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function initDb() {
  db.serialize(() => {
    // Логистика
    db.run(`CREATE TABLE IF NOT EXISTS buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      week_year TEXT NOT NULL,
      collection_type TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      address TEXT NOT NULL
    )`);

    // Сборы
    db.run(`CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      military_unit TEXT NOT NULL
    )`);

    // Школы
    db.run(`CREATE TABLE IF NOT EXISTS collection_schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      edu_org TEXT NOT NULL,
      head_teacher TEXT,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    )`);

    // Участники
    db.run(`CREATE TABLE IF NOT EXISTS collection_people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      organization TEXT NOT NULL,
      platoon_id INTEGER,
      FOREIGN KEY (school_id) REFERENCES collection_schools(id) ON DELETE CASCADE
    )`);

    // Взвода
    db.run(`CREATE TABLE IF NOT EXISTS platoons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    )`);

    // Сотрудники
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT NOT NULL,
      fio TEXT NOT NULL,
      start_date TEXT NOT NULL,
      birthday TEXT NOT NULL,
      phone TEXT NOT NULL
    )`);

    // Счета
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issuer TEXT NOT NULL,
      date_issued TEXT NOT NULL,
      amount REAL NOT NULL,
      our_order_number TEXT NOT NULL,
      payments TEXT
    )`);

    // ========== НОВЫЕ ТАБЛИЦЫ ==========
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`, (err) => {
      if (!err) {
        const subjects = [
          'Строевая подготовка',
          'Огневая подготовка',
          'Радиационная, химическая и биологическая защита',
          'Общевоинские уставы ВС РФ',
          'Обеспечение безопасности военной службы',
          'Военно-медицинская подготовка',
          'Тактическая подготовка',
          'Физическая подготовка'
        ];
        subjects.forEach(name => {
          db.run(`INSERT OR IGNORE INTO subjects (name) VALUES (?)`, [name]);
        });
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      score INTEGER CHECK (score BETWEEN 1 AND 5),
      FOREIGN KEY (person_id) REFERENCES collection_people(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
      UNIQUE(person_id, topic_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS final_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      score INTEGER CHECK (score BETWEEN 1 AND 5),
      FOREIGN KEY (person_id) REFERENCES collection_people(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(person_id, subject_id)
    )`);
  });
}

module.exports = { initDb };