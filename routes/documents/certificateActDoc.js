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

function numberToWords(num) {
  if (num === 0) return 'ноль';
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const thousands = ['', 'одна тысяча', 'две тысячи', 'три тысячи', 'четыре тысячи', 'пять тысяч', 'шесть тысяч', 'семь тысяч', 'восемь тысяч', 'девять тысяч'];

  function convertHundreds(n) {
    let result = '';
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)] + ' ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += units[n] + ' ';
    }
    return result.trim();
  }

  let result = '';
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000);
    result += thousands[thousand] + ' ';
    num %= 1000;
  }
  if (num > 0) {
    result += convertHundreds(num);
  }
  return result.trim();
}

function formatShortNameInitialsFirst(fullName) {
  if (!fullName || fullName === '—' || fullName.toLowerCase() === 'undefined') return '—';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts[0];
  const firstName = parts[1];
  const middleName = parts[2] || '';
  const firstInitial = firstName.charAt(0).toUpperCase();
  const middleInitial = middleName ? middleName.charAt(0).toUpperCase() : '';
  if (middleInitial) {
    return `${firstInitial}.${middleInitial}. ${lastName}`;
  } else {
    return `${firstInitial}. ${lastName}`;
  }
}

module.exports = async (req, res) => {
  const { collectionId } = req.body;
  if (!collectionId) return res.status(400).json({ error: 'Не указан сбор' });

  try {
    const collectionInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT date_start, date_end, military_unit FROM collections WHERE id = ?`, [collectionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!collectionInfo) return res.status(404).json({ error: 'Сбор не найден' });

    const schools = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.id, s.edu_org, s.head_teacher, COUNT(p.id) as people_count
        FROM collection_schools s
        LEFT JOIN collection_people p ON p.school_id = s.id
        WHERE s.collection_id = ?
        GROUP BY s.id
        ORDER BY s.edu_org
      `, [collectionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!schools.length) return res.status(404).json({ error: 'В сборе нет школ' });

    const totalParticipants = schools.reduce((sum, s) => sum + s.people_count, 0);
    const totalParticipantsWords = numberToWords(totalParticipants);

    const startDate = new Date(collectionInfo.date_start);
    const fridayDate = new Date(startDate);
    fridayDate.setDate(startDate.getDate() + 4);
    const fridayDateStr = fridayDate.toISOString().slice(0, 10);
    const fridayDateFancy = formatDateFancy(fridayDateStr);

    const schoolRows = schools.map((school, idx) => ({
      num: idx + 1,
      edu_org: school.edu_org,
      head_teacher: school.head_teacher || '—',
      count: school.people_count
    }));

    const headTeacherLines = schools.map(school => {
      const shortName = formatShortNameInitialsFirst(school.head_teacher);
      return `Руководитель сборов__________________________ ${shortName}`;
    });

    const templatePath = path.join(__dirname, '../../templates/contracts/Akt_certificate.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return res.status(500).json({ error: 'В шаблоне нет первого листа' });

    // ----- 1. Глобальная замена тегов с поддержкой простых строк и RichText -----
    const replaceInValue = (val) => {
      if (typeof val === 'string') {
        val = val.replace(/{{FRIDAY_DATE}}/g, fridayDateFancy);
        val = val.replace(/{{MILITARY_UNIT}}/g, collectionInfo.military_unit);
        val = val.replace(/{{TOTAL_PARTICIPANTS}}/g, totalParticipants.toString());
        val = val.replace(/{{TOTAL_PARTICIPANTS_WORDS}}/g, totalParticipantsWords);
        val = val.replace(/{{BOTTOM_DATE}}/g, formatDateFancy(collectionInfo.date_end));
        return val;
      } else if (val && typeof val === 'object' && val.richText) {
        // Обрабатываем richText массив
        const newRichText = val.richText.map(chunk => {
          let text = chunk.text;
          text = text.replace(/{{FRIDAY_DATE}}/g, fridayDateFancy);
          text = text.replace(/{{MILITARY_UNIT}}/g, collectionInfo.military_unit);
          text = text.replace(/{{TOTAL_PARTICIPANTS}}/g, totalParticipants.toString());
          text = text.replace(/{{TOTAL_PARTICIPANTS_WORDS}}/g, totalParticipantsWords);
          text = text.replace(/{{BOTTOM_DATE}}/g, formatDateFancy(collectionInfo.date_end));
          return { ...chunk, text };
        });
        return { richText: newRichText };
      }
      return val;
    };

    worksheet.eachRow(row => {
      row.eachCell(cell => {
        cell.value = replaceInValue(cell.value);
      });
    });

    // ----- 2. Обработка тега {{SCHOOLS_TABLE}} – вставка таблицы с высотой строк 40 пикселей -----
    let tableStartRow = null;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        if (cell.value === '{{SCHOOLS_TABLE}}') {
          tableStartRow = rowNumber;
          cell.value = null;
        }
      });
    });

    if (tableStartRow !== null) {
      worksheet.spliceRows(tableStartRow, 1);
      const totalRows = schoolRows.length;
      worksheet.spliceRows(tableStartRow, 0, ...new Array(totalRows).fill([]));

      for (let i = 0; i < totalRows; i++) {
        const rowNum = tableStartRow + i;
        const row = worksheet.getRow(rowNum);
        const school = schoolRows[i];

        row.height = 40;

        const numCell = row.getCell(2);
        numCell.value = school.num;
        numCell.alignment = { horizontal: 'center', vertical: 'middle' };
        numCell.font = { name: 'Times New Roman', size: 14 };

        try { worksheet.unMergeCells(rowNum, 3, rowNum, 4); } catch(e) {}
        const orgCell = row.getCell(3);
        orgCell.value = school.edu_org;
        orgCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        orgCell.font = { name: 'Times New Roman', size: 14, bold: true };
        worksheet.mergeCells(rowNum, 3, rowNum, 4);

        try { worksheet.unMergeCells(rowNum, 5, rowNum, 7); } catch(e) {}
        const teacherCell = row.getCell(5);
        teacherCell.value = school.head_teacher;
        teacherCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        teacherCell.font = { name: 'Times New Roman', size: 14 };
        worksheet.mergeCells(rowNum, 5, rowNum, 7);

        const countCell = row.getCell(8);
        countCell.value = school.count;
        countCell.alignment = { horizontal: 'center', vertical: 'middle' };
        countCell.font = { name: 'Times New Roman', size: 14 };

        for (let c = 2; c <= 9; c++) {
          const cell = row.getCell(c);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
    }

    // ----- 3. Обработка тега {{HEAD_TEACHERS_LIST}} – список руководителей -----
    let headListStartRow = null, headListStartCol = null;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value === '{{HEAD_TEACHERS_LIST}}') {
          headListStartRow = rowNumber;
          headListStartCol = colNumber;
          cell.value = null;
        }
      });
    });

    if (headListStartRow !== null) {
      worksheet.spliceRows(headListStartRow, 1);
      const totalRows = headTeacherLines.length;
      worksheet.spliceRows(headListStartRow, 0, ...new Array(totalRows).fill([]));
      for (let i = 0; i < totalRows; i++) {
        const row = worksheet.getRow(headListStartRow + i);
        const cell = row.getCell(headListStartCol);
        cell.value = headTeacherLines[i];
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 14 };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Akt_certificate_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};