const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = require('docx');
const db = require('../../db/connection');

module.exports = async (req, res) => {
  const { collectionIds, docType } = req.body;
  if (!collectionIds || !collectionIds.length) {
    return res.status(400).json({ error: 'Не выбраны сборы' });
  }
  try {
    const placeholders = collectionIds.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT p.full_name
      FROM collection_people p
      JOIN collection_schools s ON p.school_id = s.id
      WHERE s.collection_id IN (${placeholders})
      ORDER BY p.full_name COLLATE NOCASE
    `;
    const people = await new Promise((resolve, reject) => {
      db.all(sql, collectionIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    if (!people.length) return res.status(404).json({ error: 'В выбранных сборах нет участников' });

    const maxRows = 28;
    const displayedPeople = people.slice(0, maxRows);
    const totalPeople = people.length;
    const tableRows = [];
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: '№ п/п', bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Ф.И.О.', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Результат', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Оценка', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })
      ]
    }));
    for (let i = 0; i < maxRows; i++) {
      if (i < displayedPeople.length) {
        tableRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: (i+1).toString() })] }),
            new TableCell({ children: [new Paragraph({ text: displayedPeople[i].full_name })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] })
          ]
        }));
      } else {
        tableRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: (i+1).toString() })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] })
          ]
        }));
      }
    }
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: 'СПИСОК', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, bold: true }),
          new Paragraph({ text: '1 ВЗВОДА учебных сборов', alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({ children: [new TextRun(`Всего сдавало ${totalPeople} чел.`)] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [
            new TextRun('Из них сдало на: '),
            new TextRun({ text: '«отлично»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«хорошо»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«удовлетворительно»', bold: true }), new TextRun(' _____ чел., '),
            new TextRun({ text: '«неудовлетворительно»', bold: true }), new TextRun(' _____ чел.')
          ] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('Средний балл _________________')] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('Командир взвода: ______________________________________')] })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Fizo_100m_${Date.now()}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации документа' });
  }
};