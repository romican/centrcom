const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// GET все сотрудники
router.get('/employees', (req, res) => {
  db.all('SELECT * FROM employees ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST новый сотрудник
router.post('/employees', (req, res) => {
  const { position, fio, start_date, birthday, phone } = req.body;
  if (!position || !fio || !start_date || !birthday || !phone) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  db.run(
    `INSERT INTO employees (position, fio, start_date, birthday, phone) VALUES (?, ?, ?, ?, ?)`,
    [position, fio, start_date, birthday, phone],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Сотрудник добавлен' });
    }
  );
});

// DELETE сотрудник
router.delete('/employees/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM employees WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ message: 'Сотрудник удалён' });
  });
});

// PUT обновление сотрудника
router.put('/employees/:id', (req, res) => {
  const id = req.params.id;
  const { position, fio, start_date, birthday, phone } = req.body;
  if (!position || !fio || !start_date || !birthday || !phone) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  db.run(
    `UPDATE employees SET position = ?, fio = ?, start_date = ?, birthday = ?, phone = ? WHERE id = ?`,
    [position, fio, start_date, birthday, phone, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Сотрудник не найден' });
      res.json({ message: 'Сотрудник обновлён' });
    }
  );
});

module.exports = router;