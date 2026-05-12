const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function runMigrations() {
  // 1. Добавление колонок для старых таблиц (если их нет)
  db.all("PRAGMA table_info(collection_schools)", (err, columns) => {
    if (err || !columns) return;
    const hasHeadTeacher = columns.some(c => c.name === 'head_teacher');
    if (!hasHeadTeacher) {
      db.run("ALTER TABLE collection_schools ADD COLUMN head_teacher TEXT", (err) => {
        if (err) console.error('Ошибка добавления head_teacher:', err);
        else console.log('✓ Добавлена колонка head_teacher в collection_schools');
      });
    }
  });

  db.all("PRAGMA table_info(collection_people)", (err, columns) => {
    if (err || !columns) return;
    const hasPlatoonId = columns.some(c => c.name === 'platoon_id');
    if (!hasPlatoonId) {
      db.run("ALTER TABLE collection_people ADD COLUMN platoon_id INTEGER REFERENCES platoons(id)", (err) => {
        if (err) console.error('Ошибка добавления platoon_id:', err);
        else console.log('✓ Добавлена колонка platoon_id в collection_people');
      });
    }
  });

  // 2. Создание таблиц для казарм (если их нет)
  db.run(`
    CREATE TABLE IF NOT EXISTS barracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Ошибка создания таблицы barracks:', err);
    else console.log('✓ Таблица barracks готова');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS barracks_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barrack_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (barrack_id) REFERENCES barracks(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Ошибка создания таблицы barracks_locations:', err);
    else console.log('✓ Таблица barracks_locations готова');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS school_barracks (
      school_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      PRIMARY KEY (school_id, location_id),
      FOREIGN KEY (school_id) REFERENCES collection_schools(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES barracks_locations(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Ошибка создания таблицы school_barracks:', err);
    else console.log('✓ Таблица school_barracks готова');
  });
}

module.exports = { runMigrations };