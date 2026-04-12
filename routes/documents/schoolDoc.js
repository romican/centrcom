const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
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

    const templatePath = path.join(__dirname, '../../templates/svodnaya_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Шаблон не найден. Положите файл svodnaya_template.xlsx в папку templates' });
    }
    const workbook = XLSX.readFile(templatePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Замена меток
    const replaceInSheet = (ws, replacements) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell && cell.t === 's') {
            let newVal = cell.v;
            for (const [key, value] of Object.entries(replacements)) {
              newVal = newVal.split(key).join(value);
            }
            if (newVal !== cell.v) cell.v = newVal;
          }
        }
      }
    };
    replaceInSheet(worksheet, {
      '{{SCHOOL_NAME}}': schoolInfo.edu_org,
      '{{DATE_START}}': formatDate(schoolInfo.date_start),
      '{{DATE_END}}': formatDate(schoolInfo.date_end),
    });

    // Вставка строк участников
    let startRow = -1;
    let startCol = -1;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr];
        if (cell && cell.t === 's' && cell.v === '{{ROWS}}') {
          startRow = R;
          startCol = C;
          break;
        }
      }
      if (startRow !== -1) break;
    }
    if (startRow === -1) {
      // Если нет метки {{ROWS}}, вставляем начиная с 10-й строки (0-индекс)
      startRow = 9;
      startCol = 0;
    } else {
      delete worksheet[XLSX.utils.encode_cell({ r: startRow, c: startCol })];
    }

    // Сдвиг строк
    const shiftRows = (ws, fromRow, offset) => {
      const rng = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      const newRng = { s: { r: rng.s.r, c: rng.s.c }, e: { r: rng.e.r + offset, c: rng.e.c } };
      for (let R = rng.e.r; R >= fromRow; R--) {
        for (let C = rng.s.c; C <= rng.e.c; C++) {
          const oldAddr = XLSX.utils.encode_cell({ r: R, c: C });
          const newAddr = XLSX.utils.encode_cell({ r: R + offset, c: C });
          if (ws[oldAddr]) {
            ws[newAddr] = ws[oldAddr];
            delete ws[oldAddr];
          }
        }
      }
      ws['!ref'] = XLSX.utils.encode_range(newRng);
      if (ws['!merges']) {
        ws['!merges'] = ws['!merges'].map(m => ({
          s: { r: m.s.r + (m.s.r >= fromRow ? offset : 0), c: m.s.c },
          e: { r: m.e.r + (m.e.r >= fromRow ? offset : 0), c: m.e.c }
        }));
      }
    };
    shiftRows(worksheet, startRow, people.length);

    for (let i = 0; i < people.length; i++) {
      const row = startRow + i;
      const numAddr = XLSX.utils.encode_cell({ r: row, c: startCol });
      worksheet[numAddr] = { t: 's', v: (i+1).toString() };
      const nameAddr = XLSX.utils.encode_cell({ r: row, c: startCol + 1 });
      worksheet[nameAddr] = { t: 's', v: people[i].full_name };
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Svodnaya_vedomost_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};