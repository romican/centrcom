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

async function getSubjectIdByName(name) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM subjects WHERE name = ?`, [name], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

function applyCellStyle(cell, fontSize, horizontalAlign = 'center', verticalAlign = 'middle') {
  cell.font = { name: 'Times New Roman', size: fontSize, bold: false };
  cell.alignment = { horizontal: horizontalAlign, vertical: verticalAlign };
}

async function processSubject(worksheet, subjectName, tagPrefix, people, collectionId) {
  const subjectId = await getSubjectIdByName(subjectName);
  if (!subjectId) {
    console.warn(`Предмет "${subjectName}" не найден в БД, пропускаем.`);
    return;
  }

  // Все темы по предмету (без DISTINCT) – максимум 8
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
  const topicsToUse = topics.slice(0, 8);
  console.log(`Предмет "${subjectName}": найдено ${topicsToUse.length} тем(ы) для вставки.`);

  // Оценки
  const scoresMap = new Map();
  if (topicsToUse.length) {
    const topicIdPlaceholders = topicsToUse.map(() => '?').join(',');
    const query = `
      SELECT person_id, topic_id, score
      FROM scores
      WHERE topic_id IN (${topicIdPlaceholders})
    `;
    const params = topicsToUse.map(t => t.id);
    const scoresRows = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    for (const row of scoresRows) {
      const key = `${row.person_id}|${row.topic_id}`;
      scoresMap.set(key, row.score);
    }
  }

  // ROWS – список учеников (тег)
  let rowsStartRow = null, rowsStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{ROWS_${tagPrefix}}}`) {
        rowsStartRow = rowNumber;
        rowsStartCol = colNumber;
        cell.value = null;
      }
    });
  });
  if (rowsStartRow !== null) {
    for (let i = 0; i < Math.min(people.length, 32); i++) {
      const row = worksheet.getRow(rowsStartRow + i);
      const cell = row.getCell(rowsStartCol);
      cell.value = people[i].full_name;
      applyCellStyle(cell, 9, 'left', 'middle');
    }
  }

  // DATES
  let datesRow = null, datesStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{DATES_${tagPrefix}}}`) {
        datesRow = rowNumber;
        datesStartCol = colNumber;
        cell.value = null;
      }
    });
  });
  if (datesRow !== null && topicsToUse.length) {
    for (let idx = 0; idx < topicsToUse.length; idx++) {
      const col = datesStartCol + idx;
      const cell = worksheet.getRow(datesRow).getCell(col);
      cell.value = formatDateDDMM(topicsToUse[idx].date);
      applyCellStyle(cell, 6, 'center', 'middle');
    }
  }

  // SCORES
  let scoresStartRow = null, scoresStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{SCORES_${tagPrefix}}}`) {
        scoresStartRow = rowNumber;
        scoresStartCol = colNumber;
        cell.value = null;
      }
    });
  });
  if (scoresStartRow !== null && topicsToUse.length) {
    for (let i = 0; i < Math.min(people.length, 32); i++) {
      const student = people[i];
      const row = worksheet.getRow(scoresStartRow + i);
      for (let topicIdx = 0; topicIdx < topicsToUse.length; topicIdx++) {
        const topic = topicsToUse[topicIdx];
        const key = `${student.id}|${topic.id}`;
        const score = scoresMap.get(key);
        const col = scoresStartCol + topicIdx;
        const cell = row.getCell(col);
        cell.value = (score !== undefined) ? score : null;
        if (cell.value !== null) {
          applyCellStyle(cell, 11, 'center', 'middle');
        }
      }
    }
  }
}

module.exports = async (req, res) => {
  const { schoolId, platoonId } = req.body;
  if (!schoolId || !platoonId) {
    return res.status(400).json({ error: 'Не указаны школа или взвод' });
  }

  try {
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT s.edu_org, s.head_teacher, c.date_start, c.date_end, c.id as collection_id
        FROM collection_schools s
        JOIN collections c ON s.collection_id = c.id
        WHERE s.id = ?
      `, [schoolId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!schoolInfo) return res.status(404).json({ error: 'Школа не найдена' });

    const platoonInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT name FROM platoons WHERE id = ?`, [platoonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!platoonInfo) return res.status(404).json({ error: 'Взвод не найден' });

    // ⚠️ ИСПРАВЛЕНИЕ: получаем участников ТОЛЬКО для выбранной школы и взвода
    const people = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, full_name
        FROM collection_people
        WHERE platoon_id = ? AND school_id = ?
        ORDER BY full_name COLLATE NOCASE
      `, [platoonId, schoolId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) {
      return res.status(404).json({ error: 'В выбранной школе и взводе нет участников' });
    }

    const subjects = [
      { name: 'Строевая подготовка', prefix: 'STROEVAYA' },
      { name: 'Огневая подготовка', prefix: 'OGNEVAYA' },
      { name: 'Радиационная, химическая и биологическая защита', prefix: 'RHBZ' },
      { name: 'Общевоинские уставы ВС РФ', prefix: 'USTAVY' },
      { name: 'Обеспечение безопасности военной службы', prefix: 'BEZOPASNOST' },
      { name: 'Военно-медицинская подготовка', prefix: 'MEDICINA' },
      { name: 'Тактическая подготовка', prefix: 'TAKTIKA' },
      { name: 'Физическая подготовка', prefix: 'FIZO' }
    ];

    const templatePath = path.join(__dirname, '../../templates/contracts/vrem_jurnal.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(500).json({ error: 'В шаблоне нет первого листа' });
    }

    for (const subj of subjects) {
      await processSubject(worksheet, subj.name, subj.prefix, people, schoolInfo.collection_id);
    }

    worksheet.eachRow(row => {
      row.eachCell(cell => {
        if (cell && cell.value && typeof cell.value === 'string') {
          let val = cell.value;
          val = val.replace('{{SCHOOL_NAME}}', schoolInfo.edu_org);
          val = val.replace('{{PLATOON_NAME}}', platoonInfo.name);
          val = val.replace('{{HEAD_TEACHER}}', schoolInfo.head_teacher || '—');
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
    res.setHeader('Content-Disposition', `attachment; filename=Vremenny_jurnal_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};