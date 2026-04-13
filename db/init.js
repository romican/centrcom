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

    // Сборы (без edu_org)
    db.run(`CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      military_unit TEXT NOT NULL
    )`);

    // Школы сборов – добавлена колонка leader
    db.run(`CREATE TABLE IF NOT EXISTS collection_schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      edu_org TEXT NOT NULL,
      leader TEXT,
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
  });
}

module.exports = { initDb };