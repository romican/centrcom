const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

function formatDateDDMM(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function applyCellStyle(cell, fontSize, horizontalAlign = 'center', verticalAlign = 'middle', bold = false, wrapText = false) {
  cell.font = { name: 'Times New Roman', size: fontSize, bold: bold };
  cell.alignment = { horizontal: horizontalAlign, vertical: verticalAlign, wrapText: wrapText };
}

function addBorders(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
}

async function getSubjectIdByName(name) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM subjects WHERE name = ?`, [name], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

async function getTopicScoresForSubject(collectionId, subjectId, studentIds, limit) {
  const topics = await new Promise((resolve, reject) => {
    db.all(`
      SELECT id, date
      FROM topics
      WHERE collection_id = ? AND subject_id = ?
      ORDER BY date
    `, [collectionId, subjectId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const topicsToUse = topics.slice(0, limit);
  if (!topicsToUse.length) return { scoresMap: new Map(), topicsUsed: [] };

  const topicIds = topicsToUse.map(t => t.id);
  const placeholders = topicIds.map(() => '?').join(',');
  const scoresRows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT person_id, topic_id, score
      FROM scores
      WHERE topic_id IN (${placeholders})
    `, topicIds, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const scoresMap = new Map();
  for (const row of scoresRows) {
    scoresMap.set(`${row.person_id}|${row.topic_id}`, row.score);
  }
  return { scoresMap, topicsUsed: topicsToUse };
}

async function getFinalScoresForSubject(subjectId, studentIds) {
  if (!studentIds.length) return new Map();
  const placeholders = studentIds.map(() => '?').join(',');
  const rows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT person_id, score
      FROM final_scores
      WHERE subject_id = ? AND person_id IN (${placeholders})
    `, [subjectId, ...studentIds], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const map = new Map();
  for (const row of rows) map.set(row.person_id, row.score);
  return map;
}

async function getAllFinalScoresForStudents(studentIds) {
  if (!studentIds.length) return new Map();
  const placeholders = studentIds.map(() => '?').join(',');
  const rows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT person_id, subject_id, score
      FROM final_scores
      WHERE person_id IN (${placeholders})
    `, studentIds, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.person_id)) map.set(row.person_id, {});
    map.get(row.person_id)[row.subject_id] = row.score;
  }
  return map;
}

module.exports = async (req, res) => {
  const { schoolId, docType } = req.body;
  if (!schoolId) return res.status(400).json({ error: 'Не указана школа' });

  try {
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT s.edu_org, c.date_start, c.date_end, c.id as collection_id
        FROM collection_schools s
        JOIN collections c ON s.collection_id = c.id
        WHERE s.id = ?
      `, [schoolId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!schoolInfo) return res.status(404).json({ error: 'Школа не найдена' });

    const students = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, full_name
        FROM collection_people
        WHERE school_id = ?
        ORDER BY full_name COLLATE NOCASE
      `, [schoolId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!students.length) return res.status(404).json({ error: 'В школе нет учеников' });

    const studentIds = students.map(s => s.id);
    const collectionId = schoolInfo.collection_id;

    const subjectsConfig = [
      { name: 'Тактическая подготовка', prefix: 'TAKTIKA', count: 3, final: true },
      { name: 'Огневая подготовка', prefix: 'OGNEVAYA', count: 3, final: true },
      { name: 'Физическая подготовка', prefix: 'FIZO', count: 4, final: true },
      { name: 'Строевая подготовка', prefix: 'STROEVAYA', count: 3, final: true },
      { name: 'Военно-медицинская подготовка', prefix: 'MEDICINA', count: 2, final: true },
      { name: 'Радиационная, химическая и биологическая защита', prefix: 'RHBZ', count: 3, final: true }
    ];

    const subjectData = {};
    for (const cfg of subjectsConfig) {
      const subjectId = await getSubjectIdByName(cfg.name);
      if (!subjectId) {
        console.warn(`Предмет "${cfg.name}" не найден`);
        subjectData[cfg.prefix] = { scores: [], finalScores: new Map() };
        continue;
      }
      const { scoresMap, topicsUsed } = await getTopicScoresForSubject(collectionId, subjectId, studentIds, cfg.count);
      const studentScores = [];
      for (const student of students) {
        const arr = [];
        for (let i = 0; i < topicsUsed.length; i++) {
          const topic = topicsUsed[i];
          const score = scoresMap.get(`${student.id}|${topic.id}`);
          arr.push(score !== undefined ? score : null);
        }
        while (arr.length < cfg.count) {
          const lastVal = arr.length ? arr[arr.length - 1] : null;
          arr.push(lastVal);
        }
        studentScores.push(arr.slice(0, cfg.count));
      }
      const finalScores = await getFinalScoresForSubject(subjectId, studentIds);
      subjectData[cfg.prefix] = { scores: studentScores, finalScores };
    }

    const allFinalsMap = await getAllFinalScoresForStudents(studentIds);
    const overallScores = [];
    for (const student of students) {
      const finals = allFinalsMap.get(student.id) || {};
      let sum = 0, count = 0;
      for (const cfg of subjectsConfig) {
        const subjectId = await getSubjectIdByName(cfg.name);
        if (subjectId && finals[subjectId] !== undefined) {
          sum += finals[subjectId];
          count++;
        }
      }
      overallScores.push(count ? Math.round(sum / count) : null);
    }

    const templatePath = path.join(__dirname, '../../templates/contracts/svodnaya_template.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return res.status(500).json({ error: 'В шаблоне нет первого листа' });

    // 1. Находим строку с тегом {{ROWS}} и удаляем её, затем вставляем нужное количество строк
    let rowsStartRow = null;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        if (cell.value === '{{ROWS}}') rowsStartRow = rowNumber;
      });
    });
    if (rowsStartRow === null) return res.status(500).json({ error: 'В шаблоне нет метки {{ROWS}}' });

    // Удаляем строку с тегом и вставляем пустые строки для каждого ученика
    worksheet.spliceRows(rowsStartRow, 1);
    // Теперь в позиции rowsStartRow будут новые строки
    worksheet.spliceRows(rowsStartRow, 0, ...new Array(students.length).fill([]));

    // 2. Заполняем номера (колонка A) и ФИО (колонка B) в этих строках
    for (let i = 0; i < students.length; i++) {
      const row = worksheet.getRow(rowsStartRow + i);
      const numCell = row.getCell(1);
      numCell.value = i + 1;
      applyCellStyle(numCell, 9, 'center', 'middle', false, false);
      addBorders(numCell);

      const nameCell = row.getCell(2); // колонка B
      nameCell.value = students[i].full_name;
      applyCellStyle(nameCell, 9, 'left', 'middle', false, true);
      addBorders(nameCell);
    }

    // 3. Заполняем оценки, итоговые и финальную оценку
    // Сначала собираем все позиции тегов (кроме {{ROWS}}, который уже удалён)
    const tagPositions = new Map(); // key: tagName (без {{}}) -> { row, col }
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value && typeof cell.value === 'string' && cell.value.startsWith('{{') && cell.value.endsWith('}}')) {
          const tag = cell.value.slice(2, -2);
          if (tag !== 'ROWS') tagPositions.set(tag, { row: rowNumber, col: colNumber });
        }
      });
    });

    // Для каждого ученика записываем значения, сдвигая строки вниз
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      for (const cfg of subjectsConfig) {
        const prefix = cfg.prefix;
        const scoresArray = subjectData[prefix].scores[i];
        for (let idx = 1; idx <= cfg.count; idx++) {
          const tagName = `${prefix}_${idx}`;
          const pos = tagPositions.get(tagName);
          if (pos) {
            const targetRow = pos.row + i;
            const cell = worksheet.getRow(targetRow).getCell(pos.col);
            const val = scoresArray[idx - 1];
            cell.value = (val !== null && val !== undefined) ? val : '—';
            applyCellStyle(cell, 11, 'center', 'middle', false, false);
            addBorders(cell);
          }
        }
        const finalTag = `${prefix}_FINAL`;
        const finalPos = tagPositions.get(finalTag);
        if (finalPos) {
          const targetRow = finalPos.row + i;
          const cell = worksheet.getRow(targetRow).getCell(finalPos.col);
          const finalScore = subjectData[prefix].finalScores.get(student.id);
          cell.value = (finalScore !== undefined) ? finalScore : '—';
          applyCellStyle(cell, 11, 'center', 'middle', true, false);
          addBorders(cell);
        }
      }
      const overallTagPos = tagPositions.get('FINAL_OVERALL');
      if (overallTagPos) {
        const targetRow = overallTagPos.row + i;
        const cell = worksheet.getRow(targetRow).getCell(overallTagPos.col);
        cell.value = (overallScores[i] !== null) ? overallScores[i] : '—';
        applyCellStyle(cell, 11, 'center', 'middle', true, false);
        addBorders(cell);
      }
    }

    // 4. Общие метки (школа, даты) – заменяем во всех ячейках однократно
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        if (cell && cell.value && typeof cell.value === 'string') {
          let val = cell.value;
          val = val.replace('{{SCHOOL_NAME}}', schoolInfo.edu_org);
          val = val.replace('{{DATE_START}}', formatDateFull(schoolInfo.date_start));
          val = val.replace('{{DATE_END}}', formatDateFull(schoolInfo.date_end));
          val = val.replace('{{DATE_START_DDMM}}', formatDateDDMM(schoolInfo.date_start));
          val = val.replace('{{DATE_END_DDMM}}', formatDateDDMM(schoolInfo.date_end));
          if (val !== cell.value) cell.value = val;
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Svodnaya_vedomost_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};