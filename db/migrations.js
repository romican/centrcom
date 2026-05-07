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
  db.all("PRAGMA table_info(collections)", (err, columns) => {
  if (err || !columns) return;
  if (!columns.some(c => c.name === 'head_teacher')) {
    db.run("ALTER TABLE collections ADD COLUMN head_teacher TEXT");
  }
  if (!columns.some(c => c.name === 'status')) {
    db.run("ALTER TABLE collections ADD COLUMN status TEXT DEFAULT 'created'");
  }
  if (!columns.some(c => c.name === 'created_at')) {
    db.run("ALTER TABLE collections ADD COLUMN created_at TEXT");
  }
  if (!columns.some(c => c.name === 'locked_at')) {
    db.run("ALTER TABLE collections ADD COLUMN locked_at TEXT");
  }
  if (!columns.some(c => c.name === 'first_school_added_at')) {
    db.run("ALTER TABLE collections ADD COLUMN first_school_added_at TEXT");
  }
});
}

module.exports = { runMigrations };