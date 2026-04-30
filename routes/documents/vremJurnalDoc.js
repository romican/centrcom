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

// Получить ID предмета по его точному названию
async function getSubjectIdByName(name) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM subjects WHERE name = ?`, [name], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

// Применить стиль к ячейке (шрифт, размер, выравнивание)
function applyCellStyle(cell, fontSize, horizontalAlign = 'center', verticalAlign = 'middle') {
  cell.font = { name: 'Times New Roman', size: fontSize, bold: false };
  cell.alignment = { horizontal: horizontalAlign, vertical: verticalAlign };
}

// Обработка одного предмета: вставка списка учеников, дат и оценок + стили
async function processSubject(worksheet, subjectName, tagPrefix, people, collectionId) {
  // 1. Получить ID предмета
  const subjectId = await getSubjectIdByName(subjectName);
  if (!subjectId) {
    console.warn(`Предмет "${subjectName}" не найден в БД, пропускаем.`);
    return;
  }

  // 2. Получить уникальные даты занятий по этому предмету в данном сборе
  const topics = await new Promise((resolve, reject) => {
    db.all(`
      SELECT DISTINCT date
      FROM topics
      WHERE collection_id = ? AND subject_id = ?
      ORDER BY date
    `, [collectionId, subjectId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const uniqueDates = topics.map(t => t.date).slice(0, 6); // не более 6 дат (K..P)

  // 3. Получить оценки для всех учеников по этому предмету
  const scoresMap = new Map(); // ключ: `${personId}|${date}`
  if (uniqueDates.length) {
    const datePlaceholders = uniqueDates.map(() => '?').join(',');
    const query = `
      SELECT s.person_id, t.date, s.score
      FROM scores s
      JOIN topics t ON s.topic_id = t.id
      WHERE t.collection_id = ? AND t.subject_id = ? AND t.date IN (${datePlaceholders})
    `;
    const params = [collectionId, subjectId, ...uniqueDates];
    const scoresRows = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    for (const row of scoresRows) {
      const key = `${row.person_id}|${row.date}`;
      scoresMap.set(key, row.score);
    }
  }

  // 4. Обработка тега {{ROWS_ПРЕФИКС}} – список учеников
  let rowsStartRow = null;
  let rowsStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{ROWS_${tagPrefix}}}`) {
        rowsStartRow = rowNumber;
        rowsStartCol = colNumber;
        cell.value = null; // удаляем тег
      }
    });
  });
  if (rowsStartRow !== null) {
    for (let i = 0; i < Math.min(people.length, 32); i++) {
      const row = worksheet.getRow(rowsStartRow + i);
      const cell = row.getCell(rowsStartCol);
      cell.value = people[i].full_name;
      applyCellStyle(cell, 9, 'left', 'middle'); // выравнивание по левому краю
    }
  }

  // 5. Обработка тега {{DATES_ПРЕФИКС}} – даты в строке
  let datesRow = null;
  let datesStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{DATES_${tagPrefix}}}`) {
        datesRow = rowNumber;
        datesStartCol = colNumber;
        cell.value = null; // удаляем тег
      }
    });
  });
  if (datesRow !== null && uniqueDates.length) {
    for (let idx = 0; idx < uniqueDates.length; idx++) {
      const col = datesStartCol + idx;
      const cell = worksheet.getRow(datesRow).getCell(col);
      cell.value = formatDateDDMM(uniqueDates[idx]);
      applyCellStyle(cell, 7, 'center', 'middle');
    }
  }

  // 6. Обработка тега {{SCORES_ПРЕФИКС}} – таблица оценок
  let scoresStartRow = null;
  let scoresStartCol = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === `{{SCORES_${tagPrefix}}}`) {
        scoresStartRow = rowNumber;
        scoresStartCol = colNumber;
        cell.value = null; // удаляем тег
      }
    });
  });
  if (scoresStartRow !== null && uniqueDates.length) {
    for (let i = 0; i < Math.min(people.length, 32); i++) {
      const student = people[i];
      const row = worksheet.getRow(scoresStartRow + i);
      for (let dateIdx = 0; dateIdx < uniqueDates.length; dateIdx++) {
        const date = uniqueDates[dateIdx];
        const key = `${student.id}|${date}`;
        const score = scoresMap.get(key);
        const col = scoresStartCol + dateIdx;
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
    // 1. Информация о школе и сборе
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

    // 2. Взвод
    const platoonInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT name FROM platoons WHERE id = ?`, [platoonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!platoonInfo) return res.status(404).json({ error: 'Взвод не найден' });

    // 3. Список участников взвода (с id и ФИО)
    const people = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, full_name
        FROM collection_people
        WHERE platoon_id = ?
        ORDER BY full_name COLLATE NOCASE
      `, [platoonId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'Во взводе нет участников' });

    // 4. Определяем список предметов с их префиксами
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

    // 5. Загружаем шаблон
    const templatePath = path.join(__dirname, '../../templates/contracts/vrem_jurnal.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1); // работаем с первым листом
    if (!worksheet) {
      return res.status(500).json({ error: 'В шаблоне нет первого листа' });
    }

    // 6. Обрабатываем каждый предмет
    for (const subj of subjects) {
      await processSubject(worksheet, subj.name, subj.prefix, people, schoolInfo.collection_id);
    }

    // 7. Дополнительные метки (общие)
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

    // 8. Отправляем файл
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Vremenny_jurnal_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};