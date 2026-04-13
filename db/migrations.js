const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

function runMigrations() {
  // Добавляем колонку leader в collection_schools, если её нет
  db.all("PRAGMA table_info(collection_schools)", (err, columns) => {
    if (err) return console.error('Ошибка проверки collection_schools:', err);
    const hasLeader = columns.some(c => c.name === 'leader');
    if (!hasLeader) {
      db.run("ALTER TABLE collection_schools ADD COLUMN leader TEXT", (err) => {
        if (err) console.error('Ошибка добавления колонки leader:', err);
        else console.log('✓ Колонка leader добавлена в collection_schools');
      });
    } else {
      console.log('✓ Колонка leader уже существует');
    }
  });

  // Другие миграции (например, проверка platoon_id и т.д.) остаются
  db.all("PRAGMA table_info(collection_people)", (err, columns) => {
    if (err) return;
    const hasPlatoonId = columns.some(c => c.name === 'platoon_id');
    if (!hasPlatoonId) {
      db.run("ALTER TABLE collection_people ADD COLUMN platoon_id INTEGER REFERENCES platoons(id)", (err) => {
        if (err) console.error('Ошибка добавления platoon_id:', err);
        else console.log('✓ Колонка platoon_id добавлена');
      });
    }
  });
}

module.exports = { runMigrations };