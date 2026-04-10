const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function runMigrations() {
  // 1. Убеждаемся, что в collection_people есть колонка platoon_id
  db.all("PRAGMA table_info(collection_people)", (err, columns) => {
    if (err) {
      console.error('Ошибка проверки collection_people:', err);
      return;
    }
    const hasPlatoonId = columns.some(c => c.name === 'platoon_id');
    if (!hasPlatoonId) {
      db.run("ALTER TABLE collection_people ADD COLUMN platoon_id INTEGER REFERENCES platoons(id)", (err) => {
        if (err) console.error('Ошибка добавления platoon_id:', err);
        else console.log('✓ Добавлена колонка platoon_id в collection_people');
      });
    } else {
      console.log('✓ Колонка platoon_id уже существует');
    }
  });

  // 2. Создаём таблицу platoons, если её нет
  db.run(`CREATE TABLE IF NOT EXISTS platoons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы platoons:', err);
    else console.log('✓ Таблица platoons создана или уже существует');
  });

  // 3. Удаляем ограничение NOT NULL из edu_org, если оно есть (старая миграция)
  db.all("PRAGMA table_info(collections)", (err, columns) => {
    if (err) return;
    const eduOrgColumn = columns.find(c => c.name === 'edu_org');
    if (eduOrgColumn && eduOrgColumn.notnull === 1) {
      console.log('⚠️ Обнаружено NOT NULL в edu_org. Выполняется миграция...');
      db.run(`CREATE TABLE collections_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_start TEXT NOT NULL,
        date_end TEXT NOT NULL,
        military_unit TEXT NOT NULL
      )`, (err) => {
        if (err) return console.error('Ошибка создания новой таблицы:', err);
        db.run(`INSERT INTO collections_new (id, date_start, date_end, military_unit)
                SELECT id, date_start, date_end, military_unit FROM collections`, (err) => {
          if (err) return console.error('Ошибка копирования данных:', err);
          db.run(`DROP TABLE collections`, (err) => {
            if (err) return console.error('Ошибка удаления старой таблицы:', err);
            db.run(`ALTER TABLE collections_new RENAME TO collections`, (err) => {
              if (err) return console.error('Ошибка переименования:', err);
              console.log('✓ Миграция edu_org завершена');
            });
          });
        });
      });
    }
  });
}

module.exports = { runMigrations };