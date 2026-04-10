const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// GET все заявки
router.get('/buses', (req, res) => {
  db.all('SELECT * FROM buses ORDER BY date_start DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST новая заявка
router.post('/buses', (req, res) => {
  const { date_start, date_end, week_year, collection_type, organization_name, address } = req.body;
  if (!date_start || !date_end || !week_year || !collection_type || !organization_name || !address) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  db.run(
    `INSERT INTO buses (date_start, date_end, week_year, collection_type, organization_name, address)
     VALUES (?,?,?,?,?,?)`,
    [date_start, date_end, week_year, collection_type, organization_name, address],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Запись добавлена' });
    }
  );
});

// DELETE заявка
router.delete('/buses/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM buses WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ message: 'Удалено' });
  });
});

module.exports = router;