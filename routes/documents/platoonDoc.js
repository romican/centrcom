const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = require('docx');
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
      db.get(`SELECT p.*, c.date_start, c.military_unit FROM platoons p JOIN collections c ON p.collection_id = c.id WHERE p.id = ?`, [platoonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!platoonInfo) return res.status(404).json({ error: 'Взвод не найден' });
    const people = await new Promise((resolve, reject) => {
      db.all(`SELECT cp.full_name, cs.edu_org as school_name FROM collection_people cp JOIN collection_schools cs ON cp.school_id = cs.id WHERE cp.platoon_id = ? ORDER BY cp.full_name`, [platoonId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'Во взводе нет участников' });
    const headers = ['№ п/п', 'Фамилия, имя, отчество', 'Школа'];
    const headerRow = new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true })] })) });
    const peopleRows = people.map((p, idx) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: (idx+1).toString() })] }),
        new TableCell({ children: [new Paragraph({ text: p.full_name })] }),
        new TableCell({ children: [new Paragraph({ text: p.school_name })] })
      ]
    }));
    const doc = new Document({
      sections: [{
        properties: { page: { margins: { top: 2000, right: 1400, bottom: 2000, left: 2800 } } },
        children: [
          new Paragraph({ text: `Сводная ведомость взвода "${platoonInfo.name}"`, alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Сбор: ${formatDate(platoonInfo.date_start)} (${platoonInfo.military_unit})`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({ rows: [headerRow, ...peopleRows], width: { size: 100, type: WidthType.PERCENTAGE } })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=platoon_${platoonInfo.name}_${Date.now()}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа' });
  }
};