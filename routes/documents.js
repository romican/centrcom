const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = require('docx');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

// Вспомогательная функция форматирования даты
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// ========== API ДЛЯ СПИСКА ШКОЛ ПО ВЫБРАННЫМ СБОРАМ ==========
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

// ========== ГЕНЕРАЦИЯ СВОДНОЙ ВЕДОМОСТИ ПО КОНКРЕТНОЙ ШКОЛЕ ==========
router.post('/generate-school-doc', async (req, res) => {
  const { schoolId, docType } = req.body;
  if (!schoolId) {
    return res.status(400).json({ error: 'Не указана школа' });
  }
  try {
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT edu_org FROM collection_schools WHERE id = ?`, [schoolId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!schoolInfo) return res.status(404).json({ error: 'Школа не найдена' });

    const people = await new Promise((resolve, reject) => {
      db.all(`SELECT full_name FROM collection_people WHERE school_id = ? ORDER BY full_name COLLATE NOCASE`, [schoolId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'В этой школе нет участников' });

    let periodText = '';
    await new Promise((resolve) => {
      db.get(`
        SELECT c.date_start FROM collections c
        JOIN collection_schools s ON s.collection_id = c.id
        WHERE s.id = ?
      `, [schoolId], (err, row) => {
        if (row && row.date_start) periodText = formatDate(row.date_start);
        resolve();
      });
    });

    const headers = [
      '№ п/п', 'Фамилия, имя, отчество обучающегося',
      'Оценка по тактической подготовке', 'Оценка по огневой подготовке',
      'Оценка по физической подготовке', 'Оценка по строевой подготовке',
      'Оценка по медицинской подготовке', 'Оценка по РХБЗ', 'Оценка за сборы',
      'Выбор места для стрельбы', 'Передвижение на поле боя перебежками',
      'Передвижение на поле боя переползанием', 'Итоговая (тактика)',
      'Неполная разборка – сборка автомата Калашникова',
      'Выполнение начального упражнения стрельбы',
      'Первое упражнение по метанию ручной гранаты', 'Итоговая (огневая)',
      'Кросс 1 км (3 км)', 'Бег (100 м)', 'Подтягивание на перекладине',
      'Прыжки в длину с места', 'Итоговая (физо)',
      'Строевая стойка', 'Повороты на месте и в движении',
      'Строевой шаг, воинское приветствие', 'Итоговая (строевая)',
      'Остановка кровотечения', 'Наложение повязки на раны', 'Итоговая (медицина)',
      'Действия солдата по сигналам оповещения',
      'Выполнение нормативов одевания СИЗ',
      'Преодоление заражённого участка местности', 'Итоговая (РХБЗ)'
    ];

    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true })] }))
    });

    const peopleRows = people.map((person, idx) => {
      const cells = headers.map((_, colIdx) => {
        if (colIdx === 0) return new TableCell({ children: [new Paragraph({ text: (idx + 1).toString() })] });
        if (colIdx === 1) return new TableCell({ children: [new Paragraph({ text: person.full_name })] });
        return new TableCell({ children: [new Paragraph({ text: '' })] });
      });
      return new TableRow({ children: cells });
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margins: { top: 2000, right: 1400, bottom: 2000, left: 2800 } } },
        children: [
          new Paragraph({ text: 'Сводная оценочная ведомость учащихся', alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
          new Paragraph({ text: schoolInfo.edu_org, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          new Paragraph({ text: `за учебные сборы в период ${periodText}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({ rows: [headerRow, ...peopleRows], width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Svodnaya_vedomost_${Date.now()}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
});

// ========== СТАРЫЙ ГЕНЕРАТОР ДЛЯ ФИЗО (100М) ==========
router.post('/generate-doc', async (req, res) => {
  const { collectionIds, docType } = req.body;
  if (!collectionIds || !collectionIds.length) {
    return res.status(400).json({ error: 'Не выбраны сборы' });
  }
  try {
    const placeholders = collectionIds.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT p.full_name
      FROM collection_people p
      JOIN collection_schools s ON p.school_id = s.id
      WHERE s.collection_id IN (${placeholders})
      ORDER BY p.full_name COLLATE NOCASE
    `;
    const people = await new Promise((resolve, reject) => {
      db.all(sql, collectionIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'В выбранных сборах нет участников' });

    const maxRows = 28;
    const displayedPeople = people.slice(0, maxRows);
    const totalPeople = people.length;
    const tableRows = [];
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: '№ п/п', bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Ф.И.О.', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Результат', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Оценка', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })
      ]
    }));
    for (let i = 0; i < maxRows; i++) {
      if (i < displayedPeople.length) {
        tableRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: (i+1).toString() })] }),
            new TableCell({ children: [new Paragraph({ text: displayedPeople[i].full_name })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] })
          ]
        }));
      } else {
        tableRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: (i+1).toString() })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] })
          ]
        }));
      }
    }
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: 'СПИСОК', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, bold: true }),
          new Paragraph({ text: '1 ВЗВОДА учебных сборов', alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({ children: [new TextRun(`Всего сдавало ${totalPeople} чел.`)] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [
            new TextRun('Из них сдало на: '),
            new TextRun({ text: '«отлично»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«хорошо»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«удовлетворительно»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«неудовлетворительно»', bold: true }), new TextRun(' _____ чел.')
          ] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('Средний балл _________________')] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('Командир взвода: ______________________________________')] })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Fizo_100m_${Date.now()}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа' });
  }
});

// ========== ГЕНЕРАЦИЯ ДОКУМЕНТА ПО ВЗВОДУ ==========
router.post('/generate-platoon-doc', async (req, res) => {
  const { platoonId } = req.body;
  if (!platoonId) return res.status(400).json({ error: 'Не указан взвод' });
  try {
    const platoonInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT p.*, c.date_start, c.military_unit FROM platoons p JOIN collections c ON p.collection_id = c.id WHERE p.id = ?`, [platoonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!platoonInfo) return res.status(404).json({ error: 'Взвод не найден' });
    const people = await new Promise((resolve, reject) => {
      db.all(`SELECT cp.full_name, cs.edu_org as school_name FROM collection_people cp JOIN collection_schools cs ON cp.school_id = cs.id WHERE cp.platoon_id = ? ORDER BY cp.full_name`, [platoonId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'Во взводе нет участников' });
    const headers = ['№ п/п', 'Фамилия, имя, отчество', 'Школа'];
    const headerRow = new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true })] })) });
    const peopleRows = people.map((p, idx) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: (idx+1).toString() })] }),
        new TableCell({ children: [new Paragraph({ text: p.full_name })] }),
        new TableCell({ children: [new Paragraph({ text: p.school_name })] })
      ]
    }));
    const doc = new Document({
      sections: [{
        properties: { page: { margins: { top: 2000, right: 1400, bottom: 2000, left: 2800 } } },
        children: [
          new Paragraph({ text: `Сводная ведомость взвода "${platoonInfo.name}"`, alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Сбор: ${formatDate(platoonInfo.date_start)} (${platoonInfo.military_unit})`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({ rows: [headerRow, ...peopleRows], width: { size: 100, type: WidthType.PERCENTAGE } })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=platoon_${platoonInfo.name}_${Date.now()}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа' });
  }
});

module.exports = router;