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

function formatDateFancy(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const monthName = monthNames[parseInt(m) - 1];
  return `«${parseInt(d)}» ${monthName} ${y} г.`;
}

function formatShortName(fullName) {
  if (!fullName || fullName === '—') return '—';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts[0];
  const firstInitial = parts[1].charAt(0).toUpperCase();
  const middleInitial = parts[2] ? parts[2].charAt(0).toUpperCase() : '';
  return middleInitial ? `${lastName} ${firstInitial}.${middleInitial}.` : `${lastName} ${firstInitial}.`;
}

module.exports = async (req, res) => {
  const { collectionId } = req.body;
  if (!collectionId) {
    return res.status(400).json({ error: 'Не указан сбор' });
  }

  try {
    const collectionInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT date_start, date_end
        FROM collections
        WHERE id = ?
      `, [collectionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!collectionInfo) {
      return res.status(404).json({ error: 'Сбор не найден' });
    }

    const schools = await new Promise((resolve, reject) => {
      db.all(`
        SELECT edu_org, head_teacher
        FROM collection_schools
        WHERE collection_id = ?
        ORDER BY edu_org
      `, [collectionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!schools.length) {
      return res.status(404).json({ error: 'В выбранном сборе нет школ' });
    }

    const templatePath = path.join(__dirname, '../../templates/contracts/Akt_hygiene.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(500).json({ error: 'В шаблоне нет первого листа' });
    }

    // Собираем все позиции специальных тегов
    let schoolHeaderPos = null;
    let schoolsOnlyPos = null;
    let headTeachersPos = null;
    const dateTags = []; // { row, col, tagName, originalValue }

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (typeof val === 'string') {
          if (val.includes('{{SCHOOL_HEADER}}')) {
            schoolHeaderPos = { row: rowNumber, col: colNumber };
            cell.value = null;
          } else if (val.includes('{{SCHOOLS_ONLY}}')) {
            schoolsOnlyPos = { row: rowNumber, col: colNumber };
            cell.value = null;
          } else if (val.includes('{{HEAD_TEACHERS_ONLY}}')) {
            headTeachersPos = { row: rowNumber, col: colNumber };
            cell.value = null;
          } else {
            // Запоминаем ячейки с датными тегами для последующей замены с сохранением текста
            if (val.includes('{{DATE_START}}') || val.includes('{{DATE_END}}') ||
                val.includes('{{DATE_START_DDMM}}') || val.includes('{{DATE_END_DDMM}}')) {
              dateTags.push({ row: rowNumber, col: colNumber, originalVal: val });
            }
          }
        }
      });
    });

    // Сортируем теги {{DATE_END}} для определения самого нижнего
    const dateEndTags = dateTags.filter(t => t.originalVal.includes('{{DATE_END}}'));
    let bottomDateTag = null;
    if (dateEndTags.length) {
      dateEndTags.sort((a, b) => b.row - a.row);
      bottomDateTag = dateEndTags[0];
    }

    // Заменяем все датные теги с сохранением текста
    for (const tag of dateTags) {
      let newVal = tag.originalVal;
      // Заменяем {{DATE_START}}
      if (newVal.includes('{{DATE_START}}')) {
        newVal = newVal.replace(/{{DATE_START}}/g, formatDateFull(collectionInfo.date_start));
      }
      // Заменяем {{DATE_END}} – различаем обычный и красивый формат
      if (newVal.includes('{{DATE_END}}')) {
        const isBottom = (bottomDateTag && tag.row === bottomDateTag.row && tag.col === bottomDateTag.col);
        const replacement = isBottom ? formatDateFancy(collectionInfo.date_end) : formatDateFull(collectionInfo.date_end);
        newVal = newVal.replace(/{{DATE_END}}/g, replacement);
      }
      // Заменяем {{DATE_START_DDMM}}
      if (newVal.includes('{{DATE_START_DDMM}}')) {
        newVal = newVal.replace(/{{DATE_START_DDMM}}/g, formatDateDDMM(collectionInfo.date_start));
      }
      // Заменяем {{DATE_END_DDMM}}
      if (newVal.includes('{{DATE_END_DDMM}}')) {
        newVal = newVal.replace(/{{DATE_END_DDMM}}/g, formatDateDDMM(collectionInfo.date_end));
      }
      worksheet.getRow(tag.row).getCell(tag.col).value = newVal;
    }

    // Подготовка данных
    const schoolHeaderList = schools.map(s => `${s.edu_org} ${s.head_teacher || '—'}`);
    const schoolsOnlyList = schools.map(s => s.edu_org);
    const headTeachersList = schools.map(s => formatShortName(s.head_teacher || '—'));

    // Вставка SCHOOL_HEADER
    if (schoolHeaderPos) {
      const startRow = schoolHeaderPos.row;
      const col = schoolHeaderPos.col;
      worksheet.spliceRows(startRow, 1);
      worksheet.spliceRows(startRow, 0, ...new Array(schoolHeaderList.length).fill([]));
      for (let i = 0; i < schoolHeaderList.length; i++) {
        worksheet.getRow(startRow + i).getCell(col).value = schoolHeaderList[i];
      }
    }

    // Вставка SCHOOLS_ONLY и HEAD_TEACHERS_ONLY с линиями
    if (schoolsOnlyPos && headTeachersPos) {
      const startRowSchools = schoolsOnlyPos.row;
      const startRowTeachers = headTeachersPos.row;
      const colSchools = schoolsOnlyPos.col;
      const colTeachers = headTeachersPos.col;

      worksheet.spliceRows(startRowSchools, 1);
      worksheet.spliceRows(startRowTeachers, 1);

      const insertRow = Math.min(startRowSchools, startRowTeachers);
      const totalRows = schoolsOnlyList.length;

      worksheet.spliceRows(insertRow, 0, ...new Array(totalRows).fill([]));

      for (let i = 0; i < totalRows; i++) {
        const row = worksheet.getRow(insertRow + i);
        // Школа – правый край
        const schoolCell = row.getCell(colSchools);
        schoolCell.value = schoolsOnlyList[i];
        schoolCell.alignment = { horizontal: 'right', vertical: 'middle' };
        // Линия подчёркивания – на каждой строке
        const lineCell = row.getCell(4); // колонка D
        lineCell.value = '______________________________';
        lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Руководитель – левый край
        const teacherCell = row.getCell(colTeachers);
        teacherCell.value = headTeachersList[i];
        teacherCell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Akt_hygiene_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};