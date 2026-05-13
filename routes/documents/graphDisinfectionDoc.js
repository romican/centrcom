const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function formatDateFancy(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const monthName = monthNames[parseInt(m) - 1];
  return `«${parseInt(d)}» ${monthName} ${y} г.`;
}

function getWeekDates(startDateStr) {
  const start = new Date(startDateStr);
  const day = start.getDay();
  const offsetToMonday = (day === 0) ? -6 : (1 - day);
  const monday = new Date(start);
  monday.setDate(start.getDate() + offsetToMonday);
  const res = {};
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = ['mon', 'tue', 'wed', 'thu', 'fri'][i];
    res[key] = formatDateDDMMYYYY(d.toISOString().slice(0, 10));
  }
  return res;
}

module.exports = async (req, res) => {
  const { barrackId, collectionId } = req.body;
  if (!barrackId || !collectionId) {
    return res.status(400).json({ error: 'Не указаны казарма или сбор' });
  }

  try {
    const collectionInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT date_start, date_end, military_unit FROM collections WHERE id = ?`, [collectionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!collectionInfo) return res.status(404).json({ error: 'Сбор не найден' });

    const barrackInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM barracks WHERE id = ? AND collection_id = ?`, [barrackId, collectionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!barrackInfo) return res.status(404).json({ error: 'Казарма не найдена в этом сборе' });

    const locations = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM barracks_locations WHERE barrack_id = ? ORDER BY name`, [barrackId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!locations.length) return res.status(404).json({ error: 'В казарме нет этажей' });

    const locationData = [];
    for (const loc of locations) {
      const schools = await new Promise((resolve, reject) => {
        db.all(`
          SELECT s.edu_org
          FROM school_barracks sb
          JOIN collection_schools s ON sb.school_id = s.id
          WHERE sb.location_id = ? AND s.collection_id = ?
          ORDER BY s.edu_org
        `, [loc.id, collectionId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      locationData.push({
        locationName: loc.name,
        schools: schools.map(s => s.edu_org)
      });
    }

    const weekDates = getWeekDates(collectionInfo.date_start);
    const templatePath = path.join(__dirname, '../../templates/contracts/graph_disinfection.xlsx');
    const buffers = [];

    for (let i = 0; i < locationData.length; i++) {
      const loc = locationData[i];

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet(1);

      sheet.eachRow(row => {
        row.eachCell(cell => {
          if (cell.value && typeof cell.value === 'string') {
            cell.value = cell.value
              .replace('{{MILITARY_UNIT}}', collectionInfo.military_unit)
              .replace('{{BARACK_LOCATION}}', `${barrackInfo.name}, ${loc.locationName}`)
              .replace('{{SCHOOLS_LIST}}', loc.schools.length ? `обучающиеся: ${loc.schools.join('; ')}` : 'нет школ')
              .replace('{{DATE_MON}}', weekDates.mon)
              .replace('{{DATE_TUE}}', weekDates.tue)
              .replace('{{DATE_WED}}', weekDates.wed)
              .replace('{{DATE_THU}}', weekDates.thu)
              .replace('{{DATE_FRI}}', weekDates.fri)
              .replace('{{DATE_FANCY}}', formatDateFancy(collectionInfo.date_start));
          }
        });
      });

      sheet.name = `Этаж ${i + 1}`;
      const tempBuffer = await workbook.xlsx.writeBuffer();
      buffers.push(tempBuffer);
    }

    // Собираем итоговую книгу и добавляем все объединения
    const finalWorkbook = new ExcelJS.Workbook();
    for (const buf of buffers) {
      const tempWorkbook = new ExcelJS.Workbook();
      await tempWorkbook.xlsx.load(buf);
      tempWorkbook.eachSheet(sheet => {
        const newSheet = finalWorkbook.addWorksheet(sheet.name);
        newSheet.model = JSON.parse(JSON.stringify(sheet.model));
        newSheet.name = sheet.name;

        // Очищаем модель от возможных объединений
        newSheet.model.merges = [];

        // Добавляем все нужные объединения
        newSheet.mergeCells(7, 5, 7, 6);   // E7:F7
        newSheet.mergeCells(7, 7, 7, 8);   // G7:H7
        newSheet.mergeCells(7, 12, 7, 13); // L7:M7 (L=12, M=13)
        newSheet.mergeCells(7, 14, 7, 15); // N7:O7 (N=14, O=15)

        newSheet.mergeCells(15, 3, 15, 7); // C15:G15 (C=3, G=7)
        newSheet.mergeCells(15, 8, 15, 11); // H15:K15 (H=8, K=11)
        newSheet.mergeCells(15, 12, 15, 15); // L15:O15

        newSheet.mergeCells(16, 3, 16, 7); // C16:G16
        newSheet.mergeCells(16, 8, 16, 11); // H16:K16
        newSheet.mergeCells(16, 12, 16, 15); // L16:O16

        newSheet.mergeCells(17, 3, 17, 7); // C17:G17 (добавил по аналогии с C16)
        newSheet.mergeCells(17, 8, 17, 11); // H17:K17
        newSheet.mergeCells(17, 12, 17, 15); // L17:O17

        newSheet.mergeCells(19, 2, 19, 15); // B19:O19 (B=2, O=15)
      });
    }

    const finalBuffer = await finalWorkbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Graph_disinfection_${Date.now()}.xlsx`);
    res.send(finalBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + err.message });
  }
};