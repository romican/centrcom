const express = require('express');
const router = express.Router();
const db = require('../../db/connection');

const generateSvodnayaDoc = require('./svodnayaDoc');
const generateFizoPlatoonExcel = require('./fizoPlatoonDoc');
const generateVremJurnal = require('./vremJurnalDoc');
const generateHygieneAct = require('./hygieneActDoc');
const generateWaterAct = require('./waterActDoc');
const generateCertificateAct = require('./certificateActDoc');
const generateGraphDisinfection = require('./graphDisinfectionDoc');

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

router.post('/generate-school-doc-excel', generateSvodnayaDoc);
router.post('/generate-fizo-platoon-excel', generateFizoPlatoonExcel);
router.post('/generate-vrem-jurnal', generateVremJurnal);
router.post('/generate-hygiene-act', generateHygieneAct);
router.post('/generate-water-act', generateWaterAct);
router.post('/generate-certificate-act', generateCertificateAct);
router.post('/generate-graph-disinfection', generateGraphDisinfection);

module.exports = router;