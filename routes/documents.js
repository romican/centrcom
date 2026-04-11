const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, VerticalAlign, BorderStyle, PageOrientation } = require('docx');

const db = new sqlite3.Database(path.join(__dirname, '..', 'buses.db'));

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

// ========== ГЕНЕРАЦИЯ СВОДНОЙ ВЕДОМОСТИ (АЛЬБОМНАЯ ОРИЕНТАЦИЯ, ШРИФТ 10PT) ==========
router.post('/generate-school-doc', async (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) {
    return res.status(400).json({ error: 'Не указана школа' });
  }
  try {
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT s.edu_org, c.date_start, c.date_end, c.military_unit
        FROM collection_schools s
        JOIN collections c ON s.collection_id = c.id
        WHERE s.id = ?
      `, [schoolId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!schoolInfo) {
      return res.status(404).json({ error: 'Школа не найдена' });
    }

    const people = await new Promise((resolve, reject) => {
      db.all(`
        SELECT full_name FROM collection_people
        WHERE school_id = ?
        ORDER BY full_name COLLATE NOCASE
      `, [schoolId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) {
      return res.status(404).json({ error: 'В школе нет участников' });
    }

    const period = `${formatDate(schoolInfo.date_start)} по ${formatDate(schoolInfo.date_end)}г.`;

    // Функция создания ячейки с возможностью задать ширину и размер шрифта
    function makeCell(text, bold = false, centered = true, colspan = 1, width = null, fontSize = 10) {
      const paragraph = new Paragraph({
        children: [new TextRun({ text: text, bold: bold, size: fontSize * 2, font: "Times New Roman" })],
        alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT
      });
      const cell = new TableCell({
        children: [paragraph],
        columnSpan: colspan,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 }
        }
      });
      if (width !== null) {
        cell.width = { size: width, type: WidthType.PERCENTAGE };
      }
      return cell;
    }

    // Групповые заголовки (первая строка)
    const groupHeaders = [
      { text: '№ п/п', colspan: 1, width: 3 },
      { text: 'Фамилия, имя,\nотчество\nобучающегося', colspan: 1, width: 15 },
      { text: 'Оценка по тактической подготовке', colspan: 4, width: 14 },
      { text: 'Оценка по огневой подготовке', colspan: 4, width: 14 },
      { text: 'Оценка по физической подготовке', colspan: 5, width: 17.5 },
      { text: 'Оценка по строевой подготовке', colspan: 4, width: 14 },
      { text: 'Оценка по медицинской подготовке', colspan: 3, width: 10.5 },
      { text: 'Оценка по РХБЗ', colspan: 4, width: 14 },
      { text: 'Оценка за сборы', colspan: 1, width: 3 }
    ];

    const subHeaders = [
      '', '',
      'выбор места для стрельбы',
      'передвижение на поле боя перебежками',
      'передвижение на поле боя переползанием',
      'итоговая',
      'неполная разборка – сборка автомата Калашникова',
      'выполнение начального упражнения стрельбы',
      'первое упражнение по метанию ручной гранаты',
      'итоговая',
      'кросс 1 км (3 км)',
      'бег (100 м)',
      'подтягивание на перекладине',
      'прыжки в длину с места',
      'итоговая',
      'строевая стойка',
      'повороты на месте и в движении',
      'строевой шаг, воинское приветствие',
      'итоговая',
      'остановка кровотечения',
      'наложение повязки на раны',
      'итоговая',
      'действия солдата по сигналам оповещения',
      'выполнение нормативов одевания СИЗ',
      'преодоление заражённого участка местности',
      'итоговая',
      ''
    ];

    const subWidths = [3, 15];
    for (let i = 0; i < 26; i++) subWidths.push(100 / 28);

    const headerRow1 = new TableRow({
      children: groupHeaders.map(gh => makeCell(gh.text, true, true, gh.colspan, gh.width, 10))
    });

    const headerRow2 = new TableRow({
      children: subHeaders.map((sh, idx) => makeCell(sh, false, true, 1, subWidths[idx], 10))
    });

    const dataRows = [];
    for (let i = 0; i < people.length; i++) {
      const cells = [
        makeCell((i + 1).toString(), false, true, 1, 3, 10),
        makeCell(people[i].full_name, false, false, 1, 15, 10)
      ];
      for (let j = 0; j < 26; j++) {
        cells.push(makeCell('', false, true, 1, subWidths[j + 2], 10));
      }
      dataRows.push(new TableRow({ children: cells }));
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margins: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          new Paragraph({
            text: 'Сводная оценочная ведомость учащихся',
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: schoolInfo.edu_org,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `за учебные сборы в период с ${period}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            rows: [headerRow1, headerRow2, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun('Представитель учебной организации ___________________________ В.Н.Литвиненко'),
              new TextRun({ text: '\n\n', break: 1 }),
              new TextRun('Представитель воинской части (соединения) ___________________________'),
              new TextRun({ text: '\n\n', break: 1 }),
              new TextRun('м.п.'),
              new TextRun({ text: '\n\n', break: 1 }),
              new TextRun('Генеральный директор ООО «Центр +» ___________________________ К. К. Ляхов'),
              new TextRun({ text: '\n', break: 1 }),
              new TextRun('м.п.')
            ]
          })
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

// ========== ГЕНЕРАТОР ДЛЯ ФИЗО (100М) ==========
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
    if (!people.length) {
      return res.status(404).json({ error: 'В выбранных сборах нет участников' });
    }
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