const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

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

    // Данные для вставки
    const schoolListString = schools.map(s => s.edu_org).join('; ');
    const schoolsOnlyList = schools.map(s => s.edu_org);
    const headTeachersList = schools.map(s => formatShortName(s.head_teacher || '—'));

    const templatePath = path.join(__dirname, '../../templates/contracts/Akt_water.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(500).json({ error: 'В шаблоне нет первого листа' });
    }

    // 1. Замена {{DATE_START}}
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        let val = cell.value;
        if (typeof val === 'string' && val.includes('{{DATE_START}}')) {
          cell.value = val.replace(/{{DATE_START}}/g, formatDateFull(collectionInfo.date_start));
        }
      });
    });

    // 2. Обработка {{SCHOOL_LIST}} (жирный, размер 14)
    let schoolListPos = null;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value && typeof cell.value === 'string' && cell.value.includes('{{SCHOOL_LIST}}')) {
          schoolListPos = { row: rowNumber, col: colNumber, original: cell.value };
        }
      });
    });
    if (schoolListPos) {
      const cell = worksheet.getRow(schoolListPos.row).getCell(schoolListPos.col);
      const original = schoolListPos.original;
      const parts = original.split(/({{SCHOOL_LIST}})/);
      if (parts.length === 3) {
        const richText = [];
        if (parts[0]) richText.push({ text: parts[0], font: { name: 'Times New Roman', size: 14 } });
        richText.push({ text: schoolListString, font: { name: 'Times New Roman', size: 14, bold: true } });
        if (parts[2]) richText.push({ text: parts[2], font: { name: 'Times New Roman', size: 14 } });
        cell.value = { richText };
      } else {
        cell.value = schoolListString;
        cell.font = { name: 'Times New Roman', size: 14, bold: true };
      }
    }

    // 3. Вставка вертикальных списков {{SCHOOLS_ONLY}} и {{HEAD_TEACHERS_ONLY}}
    let schoolsOnlyPos = null, headTeachersPos = null;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (typeof val === 'string') {
          if (val.includes('{{SCHOOLS_ONLY}}')) {
            schoolsOnlyPos = { row: rowNumber, col: colNumber };
            cell.value = null;
          }
          if (val.includes('{{HEAD_TEACHERS_ONLY}}')) {
            headTeachersPos = { row: rowNumber, col: colNumber };
            cell.value = null;
          }
        }
      });
    });

    let totalInsertedRows = 0;
    if (schoolsOnlyPos && headTeachersPos) {
      const startRowSchools = schoolsOnlyPos.row;
      const startRowTeachers = headTeachersPos.row;
      const colSchools = schoolsOnlyPos.col;
      const colTeachers = headTeachersPos.col;

      // Удаляем строки с тегами
      worksheet.spliceRows(startRowSchools, 1);
      worksheet.spliceRows(startRowTeachers, 1);

      const insertRow = Math.min(startRowSchools, startRowTeachers);
      const totalRows = schoolsOnlyList.length;
      totalInsertedRows = totalRows;

      // Вставляем пустые строки под список
      worksheet.spliceRows(insertRow, 0, ...new Array(totalRows).fill([]));

      // Заполняем строки списка
      for (let i = 0; i < totalRows; i++) {
        const row = worksheet.getRow(insertRow + i);
        const schoolCell = row.getCell(colSchools);
        schoolCell.value = schoolsOnlyList[i];
        schoolCell.alignment = { horizontal: 'right', vertical: 'middle' };
        const lineCell = row.getCell(4);
        lineCell.value = '______________________________';
        lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
        const teacherCell = row.getCell(colTeachers);
        teacherCell.value = headTeachersList[i];
        teacherCell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }

    // 4. Поиск всех {{DATE_END}} после вставки списков
    let dateEndPositions = [];
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (typeof val === 'string' && val.includes('{{DATE_END}}')) {
          dateEndPositions.push({ row: rowNumber, col: colNumber, originalValue: val });
        }
      });
    });

    if (dateEndPositions.length) {
      // Сортируем по убыванию строки (самая нижняя – первая)
      dateEndPositions.sort((a, b) => b.row - a.row);
      const bottom = dateEndPositions[0];
      
      // Вставляем пустую строку перед самой нижней датой, чтобы отделить её от списка
      worksheet.spliceRows(bottom.row, 0, []);
      // После вставки позиция даты увеличивается на 1
      const newBottomRow = bottom.row + 1;
      
      // Заменяем самую нижнюю дату на красивый формат
      const cellBottom = worksheet.getRow(newBottomRow).getCell(bottom.col);
      cellBottom.value = bottom.originalValue.replace(/{{DATE_END}}/g, formatDateFancy(collectionInfo.date_end));
      
      // Все остальные даты (если есть) заменяем на обычный формат
      for (let i = 1; i < dateEndPositions.length; i++) {
        const pos = dateEndPositions[i];
        // Для остальных дат вставка пустой строки не требуется, но строки могли сдвинуться из-за вставки перед нижней датой
        // Если эта дата расположена выше bottom, то её позиция не изменилась
        const cell = worksheet.getRow(pos.row).getCell(pos.col);
        cell.value = pos.originalValue.replace(/{{DATE_END}}/g, formatDateFull(collectionInfo.date_end));
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Akt_water_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};