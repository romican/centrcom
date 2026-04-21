const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function runMigrations() {
  // Для старых баз – добавить колонки, если их нет
  db.all("PRAGMA table_info(collection_schools)", (err, columns) => {
    if (err || !columns) return;
    const hasHeadTeacher = columns.some(c => c.name === 'head_teacher');
    if (!hasHeadTeacher) {
      db.run("ALTER TABLE collection_schools ADD COLUMN head_teacher TEXT", (err) => {
        if (err) console.error('Ошибка добавления head_teacher:', err);
        else console.log('✓ Добавлена колонка head_teacher');
      });
    }
  });

  db.all("PRAGMA table_info(collection_people)", (err, columns) => {
    if (err || !columns) return;
    const hasPlatoonId = columns.some(c => c.name === 'platoon_id');
    if (!hasPlatoonId) {
      db.run("ALTER TABLE collection_people ADD COLUMN platoon_id INTEGER REFERENCES platoons(id)", (err) => {
        if (err) console.error('Ошибка добавления platoon_id:', err);
        else console.log('✓ Добавлена колонка platoon_id');
      });
    }
  });
}

module.exports = { runMigrations };