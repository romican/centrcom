const express = require('express');
const router = express.Router();
const db = require('../../db/connection');

const generateSchoolDoc = require('./schoolDoc');          // старый (Word)
const generateSchoolDocExcel = require('./schoolDocExcel'); // новый (Excel)
const generateFizoDoc = require('./fizoDoc');
const generatePlatoonDoc = require('./platoonDoc');

router.post('/schools/by-collections', (req, res) => {
  const { collectionIds } = req.body;
  if (!collectionIds || !collectionIds.length) {
    return res.status(400).json({ error: 'Не выбраны сборы' });
  }
  const placeholders = collectionIds.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT s.id, s.edu_org, COUNT(p.id) as people_count
    FROM collection_schools s
    LEFT JOIN collection_people p ON p.school_id = s.id
    WHERE s.collection_id IN (${placeholders})
    GROUP BY s.id
    ORDER BY s.edu_org
  `;
  db.all(sql, collectionIds, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/generate-school-doc', generateSchoolDoc);          // старый маршрут
router.post('/generate-school-doc-excel', generateSchoolDocExcel); // новый маршрут

router.post('/generate-doc', generateFizoDoc);
router.post('/generate-platoon-doc', generatePlatoonDoc);

module.exports = router;