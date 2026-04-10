const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// ========== СБОРЫ ==========
router.get('/collections', (req, res) => {
  const sql = `
    SELECT c.*,
           COUNT(DISTINCT p.id) as people_count,
           COUNT(DISTINCT pl.id) as platoons_count
    FROM collections c
    LEFT JOIN collection_schools s ON c.id = s.collection_id
    LEFT JOIN collection_people p ON p.school_id = s.id
    LEFT JOIN platoons pl ON pl.collection_id = c.id
    GROUP BY c.id
    ORDER BY c.date_start DESC
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/collections', (req, res) => {
  const { date_start, date_end, military_unit } = req.body;
  if (!date_start || !date_end || !military_unit) {
    return res.status(400).json({ error: 'Дата заезда, выезда и войсковая часть обязательны' });
  }
  db.run(
    `INSERT INTO collections (date_start, date_end, military_unit) VALUES (?, ?, ?)`,
    [date_start, date_end, military_unit],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Сбор добавлен' });
    }
  );
});

router.delete('/collections/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM collections WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ message: 'Сбор удалён' });
  });
});

router.put('/collections/:id', (req, res) => {
  const id = req.params.id;
  const { date_start, date_end, military_unit } = req.body;
  if (!date_start || !date_end || !military_unit) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  db.run(
    `UPDATE collections SET date_start = ?, date_end = ?, military_unit = ? WHERE id = ?`,
    [date_start, date_end, military_unit, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Сбор не найден' });
      res.json({ message: 'Сбор обновлён' });
    }
  );
});

// ========== ШКОЛЫ В СБОРЕ ==========
router.get('/collections/:id/schools', (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT s.*, COUNT(p.id) as people_count
    FROM collection_schools s
    LEFT JOIN collection_people p ON p.school_id = s.id
    WHERE s.collection_id = ?
    GROUP BY s.id
  `;
  db.all(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/collections/:id/schools', (req, res) => {
  const collectionId = req.params.id;
  const { edu_org, peopleList } = req.body;
  if (!edu_org || !peopleList) {
    return res.status(400).json({ error: 'Название школы и список людей обязательны' });
  }

  const lines = peopleList.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return res.status(400).json({ error: 'Список людей не должен быть пустым' });
  }

  db.run('BEGIN TRANSACTION');
  db.run(
    `INSERT INTO collection_schools (collection_id, edu_org) VALUES (?, ?)`,
    [collectionId, edu_org],
    function(err) {
      if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
      const schoolId = this.lastID;
      const stmt = db.prepare(`INSERT INTO collection_people (school_id, full_name, organization) VALUES (?, ?, ?)`);
      let errors = false;
      for (const line of lines) {
        stmt.run([schoolId, line.trim(), edu_org], (err) => { if (err) errors = true; });
      }
      stmt.finalize();
      if (errors) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Ошибка вставки людей' }); }
      db.run('COMMIT', err => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
        const sql = `
          SELECT s.*, COUNT(p.id) as people_count
          FROM collection_schools s
          LEFT JOIN collection_people p ON p.school_id = s.id
          WHERE s.collection_id = ?
          GROUP BY s.id
        `;
        db.all(sql, [collectionId], (err, schools) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ schools, message: 'Школа добавлена' });
        });
      });
    }
  );
});

// Редактирование названия школы (обновляет также поле organization у всех участников)
router.put('/schools/:schoolId', (req, res) => {
  const schoolId = req.params.schoolId;
  const { edu_org } = req.body;
  if (!edu_org) return res.status(400).json({ error: 'Название школы обязательно' });
  
  // Начинаем транзакцию, чтобы обновить оба поля атомарно
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 1. Обновляем название в таблице школ
    db.run('UPDATE collection_schools SET edu_org = ? WHERE id = ?', [edu_org, schoolId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Школа не найдена' });
      }
      
      // 2. Обновляем поле organization у всех участников этой школы
      db.run('UPDATE collection_people SET organization = ? WHERE school_id = ?', [edu_org, schoolId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Название школы обновлено', updatedPeople: this.changes });
        });
      });
    });
  });
});

router.delete('/schools/:schoolId', (req, res) => {
  const schoolId = req.params.schoolId;
  db.run('DELETE FROM collection_schools WHERE id = ?', schoolId, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Школа не найдена' });
    res.json({ message: 'Школа удалена' });
  });
});

// ========== УЧАСТНИКИ ШКОЛЫ ==========
router.get('/schools/:schoolId/people', (req, res) => {
  const schoolId = req.params.schoolId;
  const sql = `
    SELECT p.id, p.full_name, p.organization, p.platoon_id,
           pl.name as platoon_name
    FROM collection_people p
    LEFT JOIN platoons pl ON p.platoon_id = pl.id
    WHERE p.school_id = ?
    ORDER BY p.full_name COLLATE NOCASE
  `;
  db.all(sql, [schoolId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/schools/:schoolId/people', (req, res) => {
  const schoolId = req.params.schoolId;
  const { full_name, organization } = req.body;
  if (!full_name || !organization) return res.status(400).json({ error: 'ФИО и организация обязательны' });
  db.run(
    `INSERT INTO collection_people (school_id, full_name, organization) VALUES (?, ?, ?)`,
    [schoolId, full_name, organization],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Участник добавлен' });
    }
  );
});

router.delete('/collection-people/:personId', (req, res) => {
  const personId = req.params.personId;
  db.run('DELETE FROM collection_people WHERE id = ?', personId, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Участник не найден' });
    res.json({ message: 'Участник удалён' });
  });
});

module.exports = router;