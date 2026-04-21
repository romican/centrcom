const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.get('/subjects', (req, res) => {
  db.all('SELECT * FROM subjects ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/scores/platoon/:platoonId/students', (req, res) => {
  const { platoonId } = req.params;
  const { schoolId } = req.query;
  let sql = `SELECT id, full_name FROM collection_people WHERE platoon_id = ?`;
  const params = [platoonId];
  if (schoolId) {
    sql += ` AND school_id = ?`;
    params.push(schoolId);
  }
  sql += ` ORDER BY full_name`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========== ВАЖНО: этот маршрут был добавлен ==========
router.get('/scores/platoon/:platoonId/topics', (req, res) => {
  const { platoonId } = req.params;
  const sql = `
    SELECT t.id, t.name, t.date, s.name as subject_name, s.id as subject_id
    FROM topics t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.collection_id = (SELECT collection_id FROM platoons WHERE id = ?)
    ORDER BY s.id, t.date, t.id
  `;
  db.all(sql, [platoonId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/scores/student/:personId', (req, res) => {
  const { personId } = req.params;
  db.all('SELECT topic_id, score FROM scores WHERE person_id = ?', [personId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const scores = {};
    rows.forEach(row => { scores[row.topic_id] = row.score; });
    res.json(scores);
  });
});

router.get('/scores/student/:personId/final', (req, res) => {
  const { personId } = req.params;
  db.all('SELECT subject_id, score FROM final_scores WHERE person_id = ?', [personId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const finals = {};
    rows.forEach(row => { finals[row.subject_id] = row.score; });
    res.json(finals);
  });
});

router.post('/scores/update', (req, res) => {
  const { person_id, topic_id, score } = req.body;
  if (!person_id || !topic_id || score === undefined) {
    return res.status(400).json({ error: 'Не все данные' });
  }
  if (score !== null && (score < 1 || score > 5)) {
    return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  }
  if (score === null) {
    db.run(`DELETE FROM scores WHERE person_id = ? AND topic_id = ?`, [person_id, topic_id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Оценка удалена' });
    });
  } else {
    db.run(
      `INSERT INTO scores (person_id, topic_id, score) VALUES (?, ?, ?)
       ON CONFLICT(person_id, topic_id) DO UPDATE SET score = excluded.score`,
      [person_id, topic_id, score],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Оценка сохранена' });
      }
    );
  }
});

router.post('/scores/bulk-platoon', (req, res) => {
  const { platoonId, score, subjectId } = req.body;
  if (!platoonId || score === undefined) {
    return res.status(400).json({ error: 'Не указан взвод или оценка' });
  }
  if (score !== null && (score < 1 || score > 5)) {
    return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  }
  db.all(`SELECT id FROM collection_people WHERE platoon_id = ?`, [platoonId], (err, students) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!students.length) return res.json({ message: 'Нет учеников во взводе' });
    db.all(
      `SELECT t.id FROM topics t
       WHERE t.collection_id = (SELECT collection_id FROM platoons WHERE id = ?)
       AND t.subject_id = ?`,
      [platoonId, subjectId],
      (err, topics) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!topics.length) return res.json({ message: 'Нет тем для этого предмета' });
        const stmt = db.prepare(
          `INSERT INTO scores (person_id, topic_id, score) VALUES (?, ?, ?)
           ON CONFLICT(person_id, topic_id) DO UPDATE SET score = excluded.score`
        );
        for (const student of students) {
          for (const topic of topics) {
            stmt.run([student.id, topic.id, score]);
          }
        }
        stmt.finalize();
        res.json({ message: `Оценки установлены для ${students.length} учеников по ${topics.length} темам` });
      }
    );
  });
});

router.delete('/scores/platoon/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  const { subjectId } = req.query;
  if (!subjectId) return res.status(400).json({ error: 'Не указан subjectId' });
  db.all(`SELECT id FROM collection_people WHERE platoon_id = ?`, [platoonId], (err, students) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!students.length) return res.json({ message: 'Нет учеников' });
    db.all(
      `SELECT t.id FROM topics t
       WHERE t.collection_id = (SELECT collection_id FROM platoons WHERE id = ?)
       AND t.subject_id = ?`,
      [platoonId, subjectId],
      (err, topics) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!topics.length) return res.json({ message: 'Нет тем для этого предмета' });
        const placeholdersStudents = students.map(() => '?').join(',');
        const placeholdersTopics = topics.map(() => '?').join(',');
        db.run(
          `DELETE FROM scores WHERE person_id IN (${placeholdersStudents}) AND topic_id IN (${placeholdersTopics})`,
          [...students.map(s => s.id), ...topics.map(t => t.id)],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Оценки очищены' });
          }
        );
      }
    );
  });
});

router.post('/scores/bulk-school', (req, res) => {
  const { schoolId, score } = req.body;
  if (!schoolId || score === undefined) {
    return res.status(400).json({ error: 'Не указана школа или оценка' });
  }
  if (score !== null && (score < 1 || score > 5)) {
    return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  }
  db.all(`SELECT id FROM collection_people WHERE school_id = ?`, [schoolId], (err, students) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!students.length) return res.json({ message: 'Нет учеников в школе' });
    db.all(
      `SELECT t.id FROM topics t
       WHERE t.collection_id = (SELECT collection_id FROM collection_schools WHERE id = ?)`,
      [schoolId],
      (err, topics) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!topics.length) return res.json({ message: 'Нет тем для этой школы' });
        const stmt = db.prepare(
          `INSERT INTO scores (person_id, topic_id, score) VALUES (?, ?, ?)
           ON CONFLICT(person_id, topic_id) DO UPDATE SET score = excluded.score`
        );
        for (const student of students) {
          for (const topic of topics) {
            stmt.run([student.id, topic.id, score]);
          }
        }
        stmt.finalize();
        res.json({ message: `Оценки установлены для ${students.length} учеников по ${topics.length} темам` });
      }
    );
  });
});

router.delete('/scores/school/:schoolId', (req, res) => {
  const { schoolId } = req.params;
  db.all(`SELECT id FROM collection_people WHERE school_id = ?`, [schoolId], (err, students) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!students.length) return res.json({ message: 'Нет учеников' });
    db.all(
      `SELECT t.id FROM topics t
       WHERE t.collection_id = (SELECT collection_id FROM collection_schools WHERE id = ?)`,
      [schoolId],
      (err, topics) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!topics.length) return res.json({ message: 'Нет тем' });
        const placeholdersStudents = students.map(() => '?').join(',');
        const placeholdersTopics = topics.map(() => '?').join(',');
        db.run(
          `DELETE FROM scores WHERE person_id IN (${placeholdersStudents}) AND topic_id IN (${placeholdersTopics})`,
          [...students.map(s => s.id), ...topics.map(t => t.id)],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Оценки очищены' });
          }
        );
      }
    );
  });
});

router.post('/scores/calculate-final', (req, res) => {
  const { person_id, subject_id } = req.body;
  if (!person_id || !subject_id) return res.status(400).json({ error: 'Не указаны person_id и subject_id' });
  const sql = `
    SELECT AVG(score) as avg_score
    FROM scores s
    JOIN topics t ON s.topic_id = t.id
    WHERE s.person_id = ? AND t.subject_id = ?
  `;
  db.get(sql, [person_id, subject_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    let finalScore = null;
    if (row && row.avg_score) {
      finalScore = Math.round(row.avg_score);
      if (finalScore < 1) finalScore = 1;
      if (finalScore > 5) finalScore = 5;
    }
    if (finalScore) {
      db.run(
        `INSERT INTO final_scores (person_id, subject_id, score) VALUES (?, ?, ?)
         ON CONFLICT(person_id, subject_id) DO UPDATE SET score = excluded.score`,
        [person_id, subject_id, finalScore],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ finalScore });
        }
      );
    } else {
      res.json({ finalScore: null });
    }
  });
});

module.exports = router;