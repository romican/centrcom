const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

function formatDate(dateStr) {
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
    const schoolInfo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT s.edu_org, s.head_teacher, c.date_start, c.date_end
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

    const templatePath = path.join(__dirname, '../../templates/contracts/vrem_jurnal.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    workbook.eachSheet((worksheet) => {
      // Замена простых меток
      worksheet.eachRow(row => {
        row.eachCell(cell => {
          if (cell && cell.value && typeof cell.value === 'string') {
            let val = cell.value;
            val = val.replace('{{SCHOOL_NAME}}', schoolInfo.edu_org);
            val = val.replace('{{PLATOON_NAME}}', platoonInfo.name);
            val = val.replace('{{DATE_START}}', formatDate(schoolInfo.date_start));
            val = val.replace('{{DATE_END}}', formatDate(schoolInfo.date_end));
            if (val !== cell.value) cell.value = val;
          }
        });
      });

      // Сбор строк с меткой {{ROWS}}
      const rowsWithMeta = [];
      worksheet.eachRow((row, rowNumber) => {
        let hasMeta = false;
        row.eachCell(cell => {
          if (cell && cell.value && typeof cell.value === 'string' && cell.value === '{{ROWS}}') {
            hasMeta = true;
          }
        });
        if (hasMeta) rowsWithMeta.push(rowNumber);
      });

      for (const startRow of rowsWithMeta) {
        const templateRow = startRow > 1 ? worksheet.getRow(startRow - 1) : null;

        for (let i = 0; i < 32; i++) {
          const rowNum = startRow + i;
          const row = worksheet.getRow(rowNum);

          // Копируем стили из строки-образца
          if (templateRow) {
            for (let col = 1; col <= worksheet.columnCount; col++) {
              const sourceCell = templateRow.getCell(col);
              const targetCell = row.getCell(col);
              if (sourceCell && sourceCell.style) {
                targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
              }
            }
          }

          // Объединяем B-J
          try {
            worksheet.unMergeCells(rowNum, 2, rowNum, 10);
          } catch (e) {}
          worksheet.mergeCells(rowNum, 2, rowNum, 10);

          const nameCell = row.getCell(2);
          if (i < people.length) {
            nameCell.value = people[i].full_name;
            // Принудительно устанавливаем выравнивание по левому краю
            if (!nameCell.style) nameCell.style = {};
            if (!nameCell.style.alignment) nameCell.style.alignment = {};
            nameCell.style.alignment.horizontal = 'left';
            nameCell.style.alignment.wrapText = true;
            nameCell.style.alignment.vertical = 'middle';
          } else {
            nameCell.value = null;
          }
        }
      }
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