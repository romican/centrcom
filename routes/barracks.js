const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// ========== КАЗАРМЫ (с привязкой к сбору) ==========
router.get('/barracks', (req, res) => {
  const { collectionId } = req.query;
  if (!collectionId) return res.status(400).json({ error: 'Не указан сбор' });
  db.all('SELECT * FROM barracks WHERE collection_id = ? ORDER BY name', [collectionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/barracks', (req, res) => {
  const { name, collectionId } = req.body;
  if (!name || !collectionId) return res.status(400).json({ error: 'Название и сбор обязательны' });
  db.run('INSERT INTO barracks (name, collection_id) VALUES (?, ?)', [name, collectionId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Казарма добавлена' });
  });
});

router.put('/barracks/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  db.run('UPDATE barracks SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Обновлено' });
  });
});

router.delete('/barracks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM barracks WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Удалено' });
  });
});

// ========== РАСПОЛОЖЕНИЯ ==========
router.get('/barracks/:barrackId/locations', (req, res) => {
  const { barrackId } = req.params;
  db.all('SELECT * FROM barracks_locations WHERE barrack_id = ? ORDER BY name', [barrackId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/barracks/:barrackId/locations', (req, res) => {
  const { barrackId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  db.run('INSERT INTO barracks_locations (barrack_id, name) VALUES (?, ?)', [barrackId, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Расположение добавлено' });
  });
});

router.put('/locations/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  db.run('UPDATE barracks_locations SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Обновлено' });
  });
});

router.delete('/locations/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM barracks_locations WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Удалено' });
  });
});

// ========== ШКОЛЫ (с учётом выбранного сбора и количеством участников) ==========
router.get('/locations/:locationId/schools', (req, res) => {
  const { locationId } = req.params;
  const { collectionId } = req.query;
  if (!collectionId) return res.status(400).json({ error: 'Не указан сбор' });
  db.all(`
    SELECT s.id, s.edu_org, s.head_teacher, COUNT(p.id) as people_count
    FROM collection_schools s
    LEFT JOIN collection_people p ON p.school_id = s.id
    JOIN school_barracks sb ON s.id = sb.school_id
    WHERE sb.location_id = ? AND s.collection_id = ?
    GROUP BY s.id
    ORDER BY s.edu_org
  `, [locationId, collectionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/locations/:locationId/unassigned-schools', (req, res) => {
  const { locationId } = req.params;
  const { collectionId } = req.query;
  if (!collectionId) return res.status(400).json({ error: 'Не указан сбор' });
  db.all(`
    SELECT s.id, s.edu_org, s.head_teacher, COUNT(p.id) as people_count
    FROM collection_schools s
    LEFT JOIN collection_people p ON p.school_id = s.id
    WHERE s.collection_id = ? AND s.id NOT IN (SELECT school_id FROM school_barracks WHERE location_id = ?)
    GROUP BY s.id
    ORDER BY s.edu_org
  `, [collectionId, locationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/locations/:locationId/assign', (req, res) => {
  const { locationId } = req.params;
  const { schoolId } = req.body;
  if (!schoolId) return res.status(400).json({ error: 'Не указана школа' });
  db.run('INSERT OR IGNORE INTO school_barracks (school_id, location_id) VALUES (?, ?)', [schoolId, locationId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Школа привязана' });
  });
});

router.post('/locations/:locationId/unassign', (req, res) => {
  const { locationId } = req.params;
  const { schoolId } = req.body;
  if (!schoolId) return res.status(400).json({ error: 'Не указана школа' });
  db.run('DELETE FROM school_barracks WHERE school_id = ? AND location_id = ?', [schoolId, locationId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Школа отвязана' });
  });
});

module.exports = router;