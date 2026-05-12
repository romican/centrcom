const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// ========== СБОРЫ ==========
router.get('/collections', (req, res) => {
  const sql = `
    SELECT c.*,
           COUNT(DISTINCT s.id) as schools_count,
           COUNT(DISTINCT p.id) as people_count
    FROM collections c
    LEFT JOIN collection_schools s ON c.id = s.collection_id
    LEFT JOIN collection_people p ON p.school_id = s.id
    GROUP BY c.id
    ORDER BY c.date_start DESC
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/collections', (req, res) => {
  const { date_start, date_end, head_teacher, military_unit } = req.body;
  if (!date_start || !date_end || !head_teacher || !military_unit) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  const created_at = new Date().toISOString();
  db.run(
    `INSERT INTO collections (date_start, date_end, head_teacher, military_unit, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [date_start, date_end, head_teacher, military_unit, 'created', created_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Сбор добавлен' });
    }
  );
});

router.put('/collections/:id', (req, res) => {
  const id = req.params.id;
  const { date_start, head_teacher, military_unit } = req.body;
  if (!date_start || !head_teacher || !military_unit) {
    return res.status(400).json({ error: 'Дата заезда, руководитель и в/ч обязательны' });
  }
  const start = new Date(date_start);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const date_end = end.toISOString().slice(0,10);
  db.run(
    `UPDATE collections SET date_start = ?, date_end = ?, head_teacher = ?, military_unit = ? WHERE id = ?`,
    [date_start, date_end, head_teacher, military_unit, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Сбор обновлён' });
    }
  );
});

router.delete('/collections/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM collections WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Сбор удалён' });
  });
});

router.post('/collections/:id/lock', (req, res) => {
  const id = req.params.id;
  const locked_at = new Date().toISOString();
  db.run(`UPDATE collections SET status = 'locked', locked_at = ? WHERE id = ?`, [locked_at, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Сбор закреплён' });
  });
});

router.post('/collections/:id/unlock', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE collections SET status = 'created', locked_at = NULL WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Сбор откреплён' });
  });
});

router.post('/collections/:id/reset-status', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE collections SET status = 'created', first_school_added_at = NULL WHERE id = ? AND status != 'locked'`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Статус сброшен' });
  });
});

// ========== ШКОЛЫ ==========
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
  const { edu_org, head_teacher, peopleList } = req.body;
  db.get(`SELECT status FROM collections WHERE id = ?`, [collectionId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.status === 'locked') {
      return res.status(403).json({ error: 'Сбор закреплён, нельзя добавлять школы' });
    }
    if (!edu_org || !peopleList) {
      return res.status(400).json({ error: 'Название школы и список людей обязательны' });
    }
    const lines = peopleList.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ error: 'Список людей не должен быть пустым' });
    }
    db.run('BEGIN TRANSACTION');
    db.run(
      `INSERT INTO collection_schools (collection_id, edu_org, head_teacher) VALUES (?, ?, ?)`,
      [collectionId, edu_org, head_teacher || null],
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
        // Устанавливаем first_school_added_at только если это первая школа (поле ещё не заполнено)
        const nowISO = new Date().toISOString();
        db.run(`UPDATE collections SET status = 'schools_added', first_school_added_at = COALESCE(first_school_added_at, ?) WHERE id = ? AND status != 'locked'`, [nowISO, collectionId], (err) => {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
          db.run('COMMIT', err => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            // ЛОГ: создание школы и добавление участников
            db.run(`INSERT INTO school_logs (school_id, action, description) VALUES (?, 'school_created', ?)`, [schoolId, `Школа создана: ${edu_org}`]);
            if (lines.length > 1) {
              db.run(`INSERT INTO school_logs (school_id, action, description) VALUES (?, 'mass_people_added', ?)`, [schoolId, `Было добавлено ${lines.length} учащихся`]);
            }
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
        });
      }
    );
  });
});

router.put('/schools/:schoolId', (req, res) => {
  const schoolId = req.params.schoolId;
  const { edu_org, head_teacher } = req.body;
  if (!edu_org) return res.status(400).json({ error: 'Название школы обязательно' });
  db.get(`SELECT c.status FROM collection_schools s JOIN collections c ON s.collection_id = c.id WHERE s.id = ?`, [schoolId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.status === 'locked') {
      return res.status(403).json({ error: 'Сбор закреплён, нельзя редактировать школу' });
    }
    // Получаем старые значения для лога
    db.get(`SELECT edu_org, head_teacher FROM collection_schools WHERE id = ?`, [schoolId], (err, oldRow) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run(`UPDATE collection_schools SET edu_org = ?, head_teacher = ? WHERE id = ?`, [edu_org, head_teacher || null, schoolId], function(err) {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
          if (this.changes === 0) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Школа не найдена' }); }
          db.run(`UPDATE collection_people SET organization = ? WHERE school_id = ?`, [edu_org, schoolId], (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            db.run('COMMIT', (err) => {
              if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
              // Логирование изменения школы
              if (oldRow) {
                if (oldRow.edu_org !== edu_org) {
                  db.run(`INSERT INTO school_logs (school_id, action, description, old_value, new_value) VALUES (?, 'school_renamed', ?, ?, ?)`, [schoolId, 'Название школы изменено', oldRow.edu_org, edu_org]);
                }
                if (oldRow.head_teacher !== (head_teacher || null)) {
                  db.run(`INSERT INTO school_logs (school_id, action, description, old_value, new_value) VALUES (?, 'head_teacher_changed', ?, ?, ?)`, [schoolId, 'Руководитель изменён', oldRow.head_teacher || '—', head_teacher || '—']);
                }
              }
              res.json({ message: 'Школа обновлена' });
            });
          });
        });
      });
    });
  });
});

router.delete('/schools/:schoolId', (req, res) => {
  const schoolId = req.params.schoolId;
  db.get(`SELECT c.status FROM collection_schools s JOIN collections c ON s.collection_id = c.id WHERE s.id = ?`, [schoolId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.status === 'locked') {
      return res.status(403).json({ error: 'Сбор закреплён, нельзя удалять школу' });
    }
    db.run('DELETE FROM collection_schools WHERE id = ?', schoolId, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Школа удалена' });
    });
  });
});

// ========== УЧАСТНИКИ (без изменений) ==========
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
      // Лог: добавлен участник
      db.run(`INSERT INTO school_logs (school_id, action, description) VALUES (?, 'person_added', ?)`, [schoolId, `Добавлен участник: ${full_name}`]);
      res.json({ id: this.lastID, message: 'Участник добавлен' });
    }
  );
});

router.delete('/collection-people/:personId', (req, res) => {
  const personId = req.params.personId;
  db.get(`SELECT full_name, school_id FROM collection_people WHERE id = ?`, [personId], (err, person) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!person) return res.status(404).json({ error: 'Участник не найден' });
    db.run('DELETE FROM collection_people WHERE id = ?', personId, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Лог: удалён участник
      db.run(`INSERT INTO school_logs (school_id, action, description) VALUES (?, 'person_deleted', ?)`, [person.school_id, `Удалён участник: ${person.full_name}`]);
      res.json({ message: 'Участник удалён' });
    });
  });
});

router.put('/collection-people/:personId', (req, res) => {
  const personId = req.params.personId;
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ error: 'ФИО обязательно' });
  db.get(`SELECT full_name, school_id FROM collection_people WHERE id = ?`, [personId], (err, person) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!person) return res.status(404).json({ error: 'Участник не найден' });
    db.run('UPDATE collection_people SET full_name = ? WHERE id = ?', [full_name, personId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Лог: изменён участник
      db.run(`INSERT INTO school_logs (school_id, action, description, old_value, new_value) VALUES (?, 'person_edited', ?, ?, ?)`,
        [person.school_id, `Изменён участник`, person.full_name, full_name]);
      res.json({ message: 'ФИО обновлено' });
    });
  });
});

// ========== ЛОГИ ШКОЛЫ ==========
router.get('/schools/:schoolId/logs', (req, res) => {
  const { schoolId } = req.params;
  db.all(
    `SELECT * FROM school_logs WHERE school_id = ? ORDER BY created_at ASC`,
    [schoolId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;