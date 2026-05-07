// ========== ЯДРО: общие функции и парсинг Word ==========
window.formatDate = function(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

window.formatDateTime = function(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

window.escapeHtml = function(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
};

// ========== ПАРСИНГ WORD (ваши готовые функции) ==========
window.detectSchoolName = function(text) {
  const patterns = [
    /(ГБОУ|ГБПОУ|ГАПОУ|ГБОУ Школа|ГБПОУ "?[^"]+"?|ГАПОУ [^,\n]+)/gi,
    /Школа №\s*\d+/gi,
    /Школа №\s*\d+\s+имени\s+[А-Яа-я\.\s]+/gi,
    /[А-Яа-я\s]+(?:колледж|техникум|лицей|гимназия)/gi,
    /"([^"]+)"\s*–\s*(?:ГБОУ|ГБПОУ|ГАПОУ)/,
    /ИТ\.МОСКВА/i
  ];
  let bestMatch = '';
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length) {
      const candidate = matches.reduce((a, b) => a.length > b.length ? a : b, '');
      if (candidate.length > bestMatch.length) bestMatch = candidate;
    }
  }
  return bestMatch ? bestMatch.replace(/^["']|["']$/g, '').trim() : '';
};

window.findFIOColumn = function(tableRows) {
  const variants = [
    /ф\.?и\.?о\.?/i, /фио/i, /ф\s+и\s+о/i,
    /фамилия\s+имя\s+отчество/i, /фамилия,? имя,? отчество/i,
    /фио учащегося/i, /фио ученика/i, /фио обучающегося/i
  ];
  for (let r = 0; r < tableRows.length; r++) {
    const cells = tableRows[r].querySelectorAll('th, td');
    for (let c = 0; c < cells.length; c++) {
      const cellText = cells[c].innerText.trim().toLowerCase();
      for (const pattern of variants) {
        if (pattern.test(cellText)) return { rowIndex: r, colIndex: c };
      }
    }
  }
  return null;
};

window.extractFIList = function(tableRows, headerRowIndex, fioColIndex) {
  const fioList = [];
  for (let r = headerRowIndex + 1; r < tableRows.length; r++) {
    const cells = tableRows[r].querySelectorAll('td');
    if (cells.length > fioColIndex) {
      const fio = cells[fioColIndex].innerText.trim();
      if (fio) fioList.push(fio);
    }
  }
  return fioList;
};

window.parseWordFile = function(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
      .then(result => {
        const html = result.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const fullText = doc.body.innerText;
        const schoolName = window.detectSchoolName(fullText);
        const tables = doc.querySelectorAll('table');
        if (!tables.length) {
          alert('В документе не найдено таблиц');
          callback({ schoolName: null, fioList: [] });
          return;
        }
        let bestTable = null;
        let bestFioColIndex = -1;
        let bestHeaderRowIndex = -1;
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          const fioInfo = window.findFIOColumn(rows);
          if (fioInfo) {
            bestTable = rows;
            bestHeaderRowIndex = fioInfo.rowIndex;
            bestFioColIndex = fioInfo.colIndex;
            break;
          }
        }
        if (bestFioColIndex === -1) {
          alert('Не найдена колонка с ФИО (искали: Ф.И.О., ФИО, Ф И О и т.д.)');
          callback({ schoolName: schoolName, fioList: [] });
          return;
        }
        const fioList = window.extractFIList(bestTable, bestHeaderRowIndex, bestFioColIndex);
        callback({ schoolName: schoolName, fioList: fioList });
      })
      .catch(err => {
        console.error(err);
        alert('Ошибка обработки файла: ' + err.message);
        callback({ schoolName: null, fioList: [] });
      });
  };
  reader.readAsArrayBuffer(file);
};