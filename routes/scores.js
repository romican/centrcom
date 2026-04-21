const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// ========== ПОЛУЧЕНИЕ УЧЕНИКОВ ШКОЛЫ (с фильтром по взводу) ==========
router.get('/scores/school/:schoolId/students', (req, res) => {
  const { schoolId } = req.params;
  const { platoonId } = req.query;
  let sql = `SELECT id, full_name FROM collection_people WHERE school_id = ?`;
  const params = [schoolId];
  if (platoonId) {
    sql += ` AND platoon_id = ?`;
    params.push(platoonId);
  }
  sql += ` ORDER BY full_name`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========== ОСТАЛЬНЫЕ МАРШРУТЫ ==========
router.get('/subjects', (req, res) => {
  db.all('SELECT * FROM subjects ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/topics', (req, res) => {
  const { collection_id } = req.query;
  if (!collection_id) return res.status(400).json({ error: 'Не указан collection_id' });
  const sql = `
    SELECT t.id, t.name, t.date, s.name as subject_name, s.id as subject_id
    FROM topics t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.collection_id = ?
    ORDER BY t.date, s.id, t.id
  `;
  db.all(sql, [collection_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/scores', (req, res) => {
  const { person_id } = req.query;
  if (!person_id) return res.status(400).json({ error: 'Не указан person_id' });
  db.all('SELECT topic_id, score FROM scores WHERE person_id = ?', [person_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const scores = {};
    rows.forEach(row => { scores[row.topic_id] = row.score; });
    res.json(scores);
  });
});

router.get('/final-scores', (req, res) => {
  const { person_id, subject_id } = req.query;
  if (!person_id) return res.status(400).json({ error: 'Не указан person_id' });
  let sql = `SELECT subject_id, score FROM final_scores WHERE person_id = ?`;
  const params = [person_id];
  if (subject_id && subject_id !== 'all') {
    sql += ` AND subject_id = ?`;
    params.push(subject_id);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const finalScores = {};
    rows.forEach(row => { finalScores[row.subject_id] = row.score; });
    res.json(finalScores);
  });
});

router.post('/scores', (req, res) => {
  const { person_id, topic_id, score } = req.body;
  if (!person_id || !topic_id || score === undefined) {
    return res.status(400).json({ error: 'Не все данные' });
  }
  if (score < 1 || score > 5) return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  db.run(
    `INSERT INTO scores (person_id, topic_id, score) VALUES (?, ?, ?)
     ON CONFLICT(person_id, topic_id) DO UPDATE SET score = excluded.score`,
    [person_id, topic_id, score],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Оценка сохранена' });
    }
  );
});

router.post('/final-scores', (req, res) => {
  const { person_id, subject_id, score } = req.body;
  if (!person_id || !subject_id || score === undefined) {
    return res.status(400).json({ error: 'Не все данные' });
  }
  if (score < 1 || score > 5) return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  db.run(
    `INSERT INTO final_scores (person_id, subject_id, score) VALUES (?, ?, ?)
     ON CONFLICT(person_id, subject_id) DO UPDATE SET score = excluded.score`,
    [person_id, subject_id, score],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Итоговая оценка сохранена' });
    }
  );
});

router.post('/calculate-final', (req, res) => {
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