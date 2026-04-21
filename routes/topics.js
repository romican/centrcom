const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.get('/topics/:collectionId', (req, res) => {
  const { collectionId } = req.params;
  const subjectsSql = `SELECT * FROM subjects ORDER BY id`;
  const topicsSql = `
    SELECT t.*, s.name as subject_name
    FROM topics t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.collection_id = ?
    ORDER BY t.date, s.id, t.id
  `;
  db.all(subjectsSql, [], (err, subjects) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(topicsSql, [collectionId], (err, topics) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ subjects, topics });
    });
  });
});

router.post('/topics/:collectionId', (req, res) => {
  const { collectionId } = req.params;
  const { subject_id, name, date } = req.body;
  if (!subject_id || !name) {
    return res.status(400).json({ error: 'Предмет и название темы обязательны' });
  }
  db.run(
    `INSERT INTO topics (collection_id, subject_id, name, date) VALUES (?, ?, ?, ?)`,
    [collectionId, subject_id, name, date || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Тема добавлена' });
    }
  );
});

router.get('/topics/:topicId', (req, res) => {
  const { topicId } = req.params;
  db.get(`SELECT * FROM topics WHERE id = ?`, [topicId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Тема не найдена' });
    res.json(row);
  });
});

router.put('/topics/:topicId', (req, res) => {
  const { topicId } = req.params;
  const { subject_id, name, date } = req.body;
  if (!subject_id || !name) {
    return res.status(400).json({ error: 'Предмет и название темы обязательны' });
  }
  db.run(
    `UPDATE topics SET subject_id = ?, name = ?, date = ? WHERE id = ?`,
    [subject_id, name, date || null, topicId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Тема не найдена' });
      res.json({ message: 'Тема обновлена' });
    }
  );
});

router.delete('/topics/:topicId', (req, res) => {
  const { topicId } = req.params;
  db.run(`DELETE FROM topics WHERE id = ?`, [topicId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Тема не найдена' });
    res.json({ message: 'Тема удалена' });
  });
});

module.exports = router;