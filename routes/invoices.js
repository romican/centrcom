const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// GET все счета
router.get('/invoices', (req, res) => {
  db.all('SELECT * FROM invoices ORDER BY date_issued DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST новый счет
router.post('/invoices', (req, res) => {
  const { issuer, date_issued, amount, our_order_number, payments } = req.body;
  if (!issuer || !date_issued || !amount || !our_order_number) {
    return res.status(400).json({ error: 'Необходимые поля: issuer, date_issued, amount, our_order_number' });
  }
  db.run(
    `INSERT INTO invoices (issuer, date_issued, amount, our_order_number, payments) VALUES (?, ?, ?, ?, ?)`,
    [issuer, date_issued, amount, our_order_number, payments || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Счёт добавлен' });
    }
  );
});

// DELETE счет
router.delete('/invoices/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM invoices WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ message: 'Счёт удалён' });
  });
});

// PUT обновление счета
router.put('/invoices/:id', (req, res) => {
  const id = req.params.id;
  const { issuer, date_issued, amount, our_order_number, payments } = req.body;
  if (!issuer || !date_issued || !amount || !our_order_number) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  db.run(
    `UPDATE invoices SET issuer = ?, date_issued = ?, amount = ?, our_order_number = ?, payments = ? WHERE id = ?`,
    [issuer, date_issued, amount, our_order_number, payments || '', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Счёт не найден' });
      res.json({ message: 'Счёт обновлён' });
    }
  );
});

module.exports = router;