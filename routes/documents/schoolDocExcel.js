const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

module.exports = async (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) return res.status(400).json({ error: 'Не указана школа' });

  try {
    // 1. Получаем данные
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT s.edu_org, c.date_start, c.date_end
        FROM collection_schools s
        JOIN collections c ON s.collection_id = c.id
        WHERE s.id = ?
      `, [schoolId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!schoolInfo) return res.status(404).json({ error: 'Школа не найдена' });

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
    if (!people.length) return res.status(404).json({ error: 'В школе нет участников' });

    // 2. Загружаем шаблон
    const templatePath = path.join(__dirname, '../../templates/svodnaya_template.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    // 3. Заменяем метки
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        let value = cell.text;
        if (typeof value === 'string') {
          value = value.replace('{{SCHOOL_NAME}}', schoolInfo.edu_org);
          value = value.replace('{{DATE_START}}', formatDate(schoolInfo.date_start));
          value = value.replace('{{DATE_END}}', formatDate(schoolInfo.date_end));
          if (value !== cell.text) cell.value = value;
        }
      });
    });

    // 4. Находим строку с меткой {{ROWS}}
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

    // 5. Строка-образец для копирования стилей (строка над местом вставки)
    let templateRow = null;
    if (startRowIndex > 1) {
      templateRow = worksheet.getRow(startRowIndex - 1);
    } else {
      templateRow = worksheet.getRow(startRowIndex + 1);
    }

    // 6. Вставляем пустые строки
    worksheet.spliceRows(startRowIndex, 0, ...new Array(people.length).fill([]));

    // 7. Заполняем данные и копируем стили
    for (let i = 0; i < people.length; i++) {
      const row = worksheet.getRow(startRowIndex + i);
      
      // Номер п/п
      const numCell = row.getCell(1);
      numCell.value = (i + 1).toString();
      
      // ФИО
      const nameCell = row.getCell(nameColIndex);
      nameCell.value = people[i].full_name;
      
      // Копируем стили из строки-образца для всех колонок
      if (templateRow) {
        for (let col = 1; col <= row.cellCount; col++) {
          const targetCell = row.getCell(col);
          const sourceCell = templateRow.getCell(col);
          if (sourceCell && sourceCell.style) {
            targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
          }
        }
      }
      
      // Принудительно включаем перенос текста для ФИО
      if (nameCell.style && nameCell.style.alignment) {
        nameCell.style.alignment.wrapText = true;
      } else {
        nameCell.style = { alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' } };
      }

      // ========== ДОБАВЛЯЕМ ГРАНИЦЫ ДЛЯ ВСЕХ ЯЧЕЕК СТРОКИ ==========
      // Проходим по всем колонкам до последней используемой
      const lastCol = worksheet.columnCount;
      for (let col = 1; col <= lastCol; col++) {
        const cell = row.getCell(col);
        // Если у ячейки уже есть стиль, дополняем его границами, иначе создаём новый
        if (!cell.style) cell.style = {};
        if (!cell.style.border) cell.style.border = {};
        // Устанавливаем тонкую сплошную границу со всех сторон
        cell.style.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    }

    // 8. Сохраняем и отправляем
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Svodnaya_vedomost_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};