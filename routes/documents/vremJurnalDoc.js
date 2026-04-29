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

    // 3. Список предметов (все 8, фиксированный порядок)
    const subjects = await new Promise((resolve, reject) => {
      db.all(`SELECT id, name FROM subjects ORDER BY id`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const subjectMap = new Map(subjects.map(s => [s.name, s.id]));

    // 4. Данные для сводной таблицы: ученик, дата, предмет, оценка
    const rawData = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          cp.full_name AS student_name,
          t.date,
          sub.name AS subject_name,
          s.score
        FROM scores s
        JOIN collection_people cp ON cp.id = s.person_id
        JOIN topics t ON t.id = s.topic_id
        JOIN subjects sub ON sub.id = t.subject_id
        WHERE cp.platoon_id = ?
        ORDER BY cp.full_name, t.date, sub.id
      `, [platoonId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 5. Группируем в сводную структуру: { key: student_name|date, student, date, scores: { subject_id: score } }
    const pivotMap = new Map();
    for (const row of rawData) {
      const key = `${row.student_name}|${row.date}`;
      if (!pivotMap.has(key)) {
        pivotMap.set(key, {
          student_name: row.student_name,
          date: row.date,
          scores: {}
        });
      }
      const item = pivotMap.get(key);
      const subjObj = subjects.find(s => s.name === row.subject_name);
      if (subjObj) {
        item.scores[subjObj.id] = row.score;
      }
    }

    // Преобразуем в массив строк для вывода
    const pivotRows = Array.from(pivotMap.values()).map(item => ({
      student_name: item.student_name,
      date_ddmm: formatDateDDMM(item.date),
      scores: item.scores
    }));

    // 6. Загружаем шаблон
    const templatePath = path.join(__dirname, '../../templates/contracts/vrem_jurnal.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // 7. Обработка Листа1 (метки, список участников)
    const worksheet1 = workbook.getWorksheet(1);
    if (worksheet1) {
      // Простые замены
      worksheet1.eachRow(row => {
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

      // Вставка списка участников по метке {{ROWS}}
      const people = await new Promise((resolve, reject) => {
        db.all(`SELECT full_name FROM collection_people WHERE platoon_id = ? ORDER BY full_name COLLATE NOCASE`, [platoonId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      let rowsMeta = [];
      worksheet1.eachRow((row, rowNumber) => {
        let hasMeta = false;
        row.eachCell(cell => {
          if (cell && cell.value === '{{ROWS}}') hasMeta = true;
        });
        if (hasMeta) rowsMeta.push(rowNumber);
      });
      for (const startRow of rowsMeta) {
        worksheet1.spliceRows(startRow, 1);
        for (let i = 0; i < people.length; i++) {
          worksheet1.spliceRows(startRow + i, 0, []);
          const row = worksheet1.getRow(startRow + i);
          row.getCell(1).value = i + 1;
          row.getCell(2).value = people[i].full_name;
        }
      }
    }

    // 8. ЛИСТ2 – сводная таблица (ученик + дата, предметы по горизонтали)
    let worksheet2 = workbook.getWorksheet('Лист2');
    if (!worksheet2) {
      worksheet2 = workbook.addWorksheet('Лист2');
    } else {
      worksheet2.spliceRows(1, worksheet2.rowCount);
    }

    // Заголовки: Ученик, Дата, затем названия предметов по порядку
    const colCount = 2 + subjects.length; // колонка "Ученик", "Дата", и по одной на каждый предмет
    const headerRow = worksheet2.getRow(1);
    headerRow.getCell(1).value = 'Ученик';
    headerRow.getCell(2).value = 'Дата';
    subjects.forEach((subj, idx) => {
      headerRow.getCell(3 + idx).value = subj.name;
    });
    headerRow.font = { bold: true };
    for (let c = 1; c <= colCount; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EAF7' }
      };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    // Заполнение данными
    if (pivotRows.length === 0) {
      worksheet2.getRow(2).getCell(1).value = 'Нет данных об оценках';
    } else {
      for (let i = 0; i < pivotRows.length; i++) {
        const row = pivotRows[i];
        const excelRow = worksheet2.getRow(i + 2);
        excelRow.getCell(1).value = row.student_name;
        excelRow.getCell(2).value = row.date_ddmm;
        for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
          const subjectId = subjects[sIdx].id;
          const score = row.scores[subjectId] || '';
          excelRow.getCell(3 + sIdx).value = score;
        }
        // Границы для всех ячеек строки
        for (let c = 1; c <= colCount; c++) {
          const cell = excelRow.getCell(c);
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        }
      }
    }

    // Автоширина
    worksheet2.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const length = cell.value ? cell.value.toString().length : 10;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(maxLength + 2, 40);
    });

    // 9. Отправка
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Vremenny_jurnal_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};