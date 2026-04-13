const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

module.exports = async (req, res) => {
  const { platoonId } = req.body;
  if (!platoonId) return res.status(400).json({ error: 'Не указан взвод' });

  try {
    const platoonInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT p.name, c.date_start, c.date_end
        FROM platoons p
        JOIN collections c ON p.collection_id = c.id
        WHERE p.id = ?
      `, [platoonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!platoonInfo) return res.status(404).json({ error: 'Взвод не найден' });

    const people = await new Promise((resolve, reject) => {
      db.all(`
        SELECT cp.full_name
        FROM collection_people cp
        JOIN collection_schools cs ON cp.school_id = cs.id
        WHERE cp.platoon_id = ?
        ORDER BY cp.full_name COLLATE NOCASE
      `, [platoonId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'Во взводе нет участников' });

    const templatePath = path.join(__dirname, '../../templates/internal/Fizo_100m.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    // Замена меток
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        let value = cell.text;
        if (typeof value === 'string') {
          value = value.replace('{{PLATOON_NAME}}', platoonInfo.name);
          value = value.replace('{{DATE_START}}', formatDate(platoonInfo.date_start));
          value = value.replace('{{DATE_END}}', formatDate(platoonInfo.date_end));
          if (value !== cell.text) cell.value = value;
        }
      });
    });

    // Поиск метки {{ROWS}}
    let startRowIndex = -1;
    let nameColIndex = -1;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.text === '{{ROWS}}') {
          startRowIndex = rowNumber;
          nameColIndex = colNumber;
        }
      });
    });

    if (startRowIndex === -1) {
      startRowIndex = 10;
      nameColIndex = 2;
    } else {
      worksheet.spliceRows(startRowIndex, 1);
    }

    // Строка-образец для копирования основных стилей (шрифт, выравнивание, заливка)
    let templateRow = null;
    if (startRowIndex > 1) {
      templateRow = worksheet.getRow(startRowIndex - 1);
    } else {
      templateRow = worksheet.getRow(startRowIndex + 1);
    }

    // Вставляем пустые строки
    worksheet.spliceRows(startRowIndex, 0, ...new Array(people.length).fill([]));

    for (let i = 0; i < people.length; i++) {
      const row = worksheet.getRow(startRowIndex + i);
      
      // Номер п/п – в ячейку слева от метки
      const numCell = row.getCell(nameColIndex - 1);
      numCell.value = (i + 1).toString();
      
      // ФИО – в ячейку метки
      const nameCell = row.getCell(nameColIndex);
      nameCell.value = people[i].full_name;
      
      // Копируем стили из строки-образца (шрифт, выравнивание, заливка)
      if (templateRow) {
        for (let col = 1; col <= row.cellCount; col++) {
          const targetCell = row.getCell(col);
          const sourceCell = templateRow.getCell(col);
          if (sourceCell && sourceCell.style) {
            // Копируем всё, кроме border
            const styleCopy = JSON.parse(JSON.stringify(sourceCell.style));
            if (styleCopy.border) delete styleCopy.border;
            targetCell.style = styleCopy;
          }
        }
      }
      
      // ========== ПРИНУДИТЕЛЬНЫЕ ГРАНИЦЫ (кроме колонки A) ==========
      // Границы будут у всех колонок, начиная с колонки 2 (B) и до последней.
      // Если вы хотите, чтобы границы были и в колонке A, измените startCol на 1.
      const startCol = 2; // ← сюда можно поставить 1, если нужны границы и в номере
      const lastCol = worksheet.columnCount;
      for (let col = startCol; col <= lastCol; col++) {
        const cell = row.getCell(col);
        if (!cell.style) cell.style = {};
        cell.style.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Fizo_100m_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};