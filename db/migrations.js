const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function runMigrations() {
  // Добавляем колонку head_teacher в collection_schools, если её нет
  db.all("PRAGMA table_info(collection_schools)", (err, columns) => {
    if (err) {
      console.error('Ошибка проверки collection_schools:', err);
      return;
    }
    const hasHeadTeacher = columns.some(c => c.name === 'head_teacher');
    if (!hasHeadTeacher) {
      db.run("ALTER TABLE collection_schools ADD COLUMN head_teacher TEXT", (err) => {
        if (err) console.error('Ошибка добавления head_teacher:', err);
        else console.log('✓ Добавлена колонка head_teacher в collection_schools');
      });
    } else {
      console.log('✓ Колонка head_teacher уже существует');
    }
  });
}

module.exports = { runMigrations };