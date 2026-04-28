// ========== ОСНОВНАЯ ЛОГИКА СБОРОВ ==========
window.loadCollections = async function() {
  try {
    const resp = await fetch('/api/collections');
    if (!resp.ok) throw new Error();
    const collections = await resp.json();
    renderCollections(collections);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="collections-table-container">Ошибка загрузки сборов</div>';
  }
};

function renderCollections(collections) {
  if (!collections.length) {
    window.contentBody.innerHTML = `<div class="collections-table-container"><table class="collections-table"><thead><tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Кол-во человек</th><th>Взводов</th><th>Войсковая часть</th><th>Действия</th></tr></thead><tbody><tr><td colspan="7" class="loading-cell">Нет сборов</tbody></table></div>`;
    return;
  }
  let html = `<div class="collections-table-container"><table class="collections-table"><thead><tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Кол-во человек</th><th>Взводов</th><th>Войсковая часть</th><th>Действия</th></tr></thead><tbody>`;
  collections.forEach((col, idx) => {
    html += `<tr data-collection-id="${col.id}" class="collection-row">
      <td>${idx+1}</td>
      <td>${window.formatDate(col.date_start)}</td>
      <td>${window.formatDate(col.date_end)}</td>
      <td>${col.people_count || 0}</td>
      <td>${col.platoons_count || 0}</td>
      <td>${window.escapeHtml(col.military_unit)}</td>
      <td>
        <button class="edit-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  window.contentBody.innerHTML = html;
  attachCollectionEvents();
}

function attachCollectionEvents() {
  document.querySelectorAll('.delete-btn[data-type="collection"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Удалить сбор со всеми школами и участниками?')) {
        fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(() => window.loadCollections());
      }
    });
  });
  document.querySelectorAll('.edit-btn[data-type="collection"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openEditCollectionModal(id);
    });
  });
  document.querySelectorAll('.collection-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;
      const id = row.getAttribute('data-collection-id');
      openSchoolsModal(id);
    });
  });
}

async function openEditCollectionModal(id) {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    const collection = collections.find(c => c.id == id);
    if (!collection) return;
    window.editModalContent.innerHTML = `
      <div class="modal-header">
        <h2><i class="fas fa-edit"></i> Редактировать сбор</h2>
        <button class="close-modal" id="closeEditModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <form id="editCollectionForm">
          <div class="form-row">
            <div class="form-group"><label><i class="fas fa-calendar-alt"></i> Дата заезда</label><input type="date" id="editDateStart" value="${collection.date_start}" required></div>
            <div class="form-group"><label><i class="fas fa-calendar-check"></i> Дата выезда</label><input type="date" id="editDateEnd" value="${collection.date_end}" required></div>
          </div>
          <div class="form-group"><label><i class="fas fa-shield-alt"></i> Войсковая часть</label><input type="text" id="editMilitaryUnit" value="${window.escapeHtml(collection.military_unit)}" required></div>
          <div class="form-actions">
            <button type="button" class="btn cancel" id="cancelEditBtn">Отменить</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    `;
    window.editModal.style.display = 'flex';
    document.getElementById('closeEditModalBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('cancelEditBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('editCollectionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        date_start: document.getElementById('editDateStart').value,
        date_end: document.getElementById('editDateEnd').value,
        military_unit: document.getElementById('editMilitaryUnit').value.trim()
      };
      try {
        await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        window.editModal.style.display = 'none';
        window.loadCollections();
      } catch (err) { alert('Ошибка обновления'); }
    });
  } catch (err) { alert('Ошибка загрузки данных'); }
}

// ========== МОДАЛКА ШКОЛ ==========
function ensureSchoolsModal() {
  if (document.getElementById('schoolsModal')) return;
  const modal = document.createElement('div');
  modal.id = 'schoolsModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px; height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="flex-shrink: 0;">
        <h2><i class="fas fa-school"></i> Школы в сборе</h2>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="text" id="searchSchoolInput" placeholder="Поиск по школе..." style="padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; width: 180px;">
          <button class="close-modal" id="closeSchoolsModalBtn">&times;</button>
        </div>
      </div>
      <div id="schoolsInfo" style="margin: 0 20px 12px 20px; flex-shrink: 0;"></div>
      <div style="flex: 1; overflow-y: auto; padding: 0 20px;" id="schoolsListContainer">
        <table style="width:100%; border-collapse: collapse;" id="schoolsTable">
          <thead>
            <tr><th>Школа</th><th>Руководитель</th><th>Кол-во человек</th><th style="width:120px">Действия</th></tr>
          </thead>
          <tbody id="schoolsTableBody"></tbody>
        </table>
      </div>
      <div style="flex-shrink: 0; padding: 12px 20px 16px 20px; background: inherit; border-top: 1px solid #e2e8f0;">
        <button id="addSchoolBtn" class="btn add" style="width:100%;"><i class="fas fa-plus"></i> Добавить школу</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function loadSchoolsAndRender(collectionId) {
  const resp = await fetch(`/api/collections/${collectionId}/schools`);
  const schools = await resp.json();
  const tbody = document.getElementById('schoolsTableBody');
  if (!tbody) return;
  if (!schools.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Нет школ. Нажмите "Добавить школу".<\/td></tr>';
  } else {
    tbody.innerHTML = schools.map(school => `
      <tr class="school-row" data-school-id="${school.id}">
        <td class="school-name">${window.escapeHtml(school.edu_org)}<\/td>
        <td class="school-head">${window.escapeHtml(school.head_teacher || '—')}<\/td>
        <td class="school-count">${school.people_count || 0}<\/td>
        <td class="school-actions">
          <button class="edit-school-btn" data-school-id="${school.id}"><i class="fas fa-edit"><\/i><\/button>
          <button class="delete-school-btn" data-school-id="${school.id}"><i class="fas fa-trash-alt"><\/i><\/button>
        <\/td>
      <\/tr>
    `).join('');
  }
  attachSchoolButtons();
  return schools;
}

async function openSchoolsModal(collectionId) {
  ensureSchoolsModal();
  window.currentCollectionIdForSchools = collectionId;
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const collection = allCollections.find(c => c.id == collectionId);
  const schoolsInfoDiv = document.getElementById('schoolsInfo');
  if (schoolsInfoDiv && collection) {
    schoolsInfoDiv.innerHTML = `
      <strong>Сбор:</strong> ${window.formatDate(collection.date_start)} — ${window.formatDate(collection.date_end)}<br>
      <strong>Войсковая часть:</strong> ${window.escapeHtml(collection.military_unit)}
    `;
  }
  await loadSchoolsAndRender(collectionId);
  const schoolsModal = document.getElementById('schoolsModal');
  if (schoolsModal) schoolsModal.style.display = 'flex';
  const searchInput = document.getElementById('searchSchoolInput');
  if (searchInput) searchInput.value = '';
  const closeBtn = document.getElementById('closeSchoolsModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      const modal = document.getElementById('schoolsModal');
      if (modal) modal.style.display = 'none';
    };
  }
  schoolsModal.onclick = (e) => {
    if (e.target === schoolsModal) schoolsModal.style.display = 'none';
  };
  const addSchoolBtn = document.getElementById('addSchoolBtn');
  if (addSchoolBtn) {
    addSchoolBtn.replaceWith(addSchoolBtn.cloneNode(true));
    const newBtn = document.getElementById('addSchoolBtn');
    newBtn.addEventListener('click', () => openAddSchoolModal(collectionId));
  }
}

// ========== УЛУЧШЕННЫЙ ПАРСИНГ WORD ==========
// Поиск названия школы в тексте документа
function detectSchoolName(text) {
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
      // Выбираем самую длинную и специфичную строку
      const candidate = matches.reduce((a, b) => a.length > b.length ? a : b, '');
      if (candidate.length > bestMatch.length) bestMatch = candidate;
    }
  }
  if (bestMatch) {
    // Убираем лишние кавычки и пробелы
    bestMatch = bestMatch.replace(/^["']|["']$/g, '').trim();
  }
  return bestMatch;
}

// Поиск колонки с ФИО (поддерживает разные варианты написания)
function findFIOColumn(tableRows) {
  const variants = [
    /ф\.?и\.?о\.?/i,
    /фио/i,
    /ф\s+и\s+о/i,
    /фамилия\s+имя\s+отчество/i,
    /фамилия,? имя,? отчество/i,
    /фио учащегося/i,
    /фио ученика/i,
    /фио обучающегося/i
  ];
  for (let r = 0; r < tableRows.length; r++) {
    const cells = tableRows[r].querySelectorAll('th, td');
    for (let c = 0; c < cells.length; c++) {
      const cellText = cells[c].innerText.trim().toLowerCase();
      for (const pattern of variants) {
        if (pattern.test(cellText)) {
          return { rowIndex: r, colIndex: c };
        }
      }
    }
  }
  return null;
}

// Извлечение ФИО из таблицы
function extractFIList(tableRows, headerRowIndex, fioColIndex) {
  const fioList = [];
  for (let r = headerRowIndex + 1; r < tableRows.length; r++) {
    const cells = tableRows[r].querySelectorAll('td');
    if (cells.length > fioColIndex) {
      const fio = cells[fioColIndex].innerText.trim();
      if (fio) fioList.push(fio);
    }
  }
  return fioList;
}

// Основная функция парсинга файла
function parseWordFile(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
      .then(result => {
        const html = result.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Сохраняем весь текст для поиска названия школы
        const fullText = doc.body.innerText;
        const schoolName = detectSchoolName(fullText);
        
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
          const fioInfo = findFIOColumn(rows);
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
        
        const fioList = extractFIList(bestTable, bestHeaderRowIndex, bestFioColIndex);
        callback({ schoolName: schoolName, fioList: fioList });
      })
      .catch(err => {
        console.error(err);
        alert('Ошибка обработки файла: ' + err.message);
        callback({ schoolName: null, fioList: [] });
      });
  };
  reader.readAsArrayBuffer(file);
}

// ========== МОДАЛКА ДОБАВЛЕНИЯ ШКОЛЫ (с загрузкой Word) ==========
function openAddSchoolModal(collectionId) {
  let addModal = document.getElementById('addSchoolModal');
  if (!addModal) {
    addModal = document.createElement('div');
    addModal.id = 'addSchoolModal';
    addModal.className = 'modal';
    addModal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2><i class="fas fa-plus-circle"></i> Добавить школу</h2>
          <button class="close-modal" id="closeAddSchoolModalBtn">&times;</button>
        </div>
        <div style="padding: 16px 24px;">
          <form id="addSchoolForm">
            <div class="form-group">
              <label><i class="fas fa-school"></i> Название школы</label>
              <input type="text" id="schoolName" placeholder="ГБОУ Школа №..." required>
            </div>
            <div class="form-group">
              <label><i class="fas fa-user-tie"></i> Руководитель сборов (школа)</label>
              <input type="text" id="headTeacher" placeholder="Иванов Иван Иванович">
            </div>
            <div class="form-group">
              <label><i class="fas fa-list-ul"></i> Список людей (ФИО, каждый с новой строки)</label>
              <textarea id="schoolPeopleList" rows="8" placeholder="Иванов Иван Иванович&#10;Петров Петр Петрович" required style="width:100%; padding:12px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit;"></textarea>
            </div>
            <div class="form-group">
              <button type="button" id="loadWordBtn" class="btn" style="background: #8b5cf6; color: white; width: 100%;"><i class="fas fa-file-word"></i> Загрузить файл Word</button>
              <input type="file" id="wordFileInput" accept=".docx" style="display: none;">
            </div>
            <div class="form-actions">
              <button type="button" class="btn cancel" id="cancelAddSchoolBtn">Отменить</button>
              <button type="submit" class="btn add">Сохранить школу</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(addModal);
  }

  const closeModal = () => {
    addModal.style.display = 'none';
  };
  document.getElementById('closeAddSchoolModalBtn').onclick = closeModal;
  document.getElementById('cancelAddSchoolBtn').onclick = closeModal;
  addModal.onclick = (e) => { if (e.target === addModal) closeModal(); };

  // Обработчик загрузки Word
  const loadWordBtn = document.getElementById('loadWordBtn');
  const fileInput = document.getElementById('wordFileInput');
  if (loadWordBtn && fileInput) {
    loadWordBtn.onclick = () => {
      fileInput.click();
    };
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      parseWordFile(file, (result) => {
        if (result.schoolName) {
          const schoolNameInput = document.getElementById('schoolName');
          if (schoolNameInput) schoolNameInput.value = result.schoolName;
        }
        if (result.fioList.length) {
          const textarea = document.getElementById('schoolPeopleList');
          if (textarea) {
            textarea.value = result.fioList.join('\n');
          }
        }
        fileInput.value = '';
      });
    };
  }

  const form = document.getElementById('addSchoolForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const edu_org = document.getElementById('schoolName').value.trim();
    const head_teacher = document.getElementById('headTeacher').value.trim();
    const peopleList = document.getElementById('schoolPeopleList').value;
    if (!edu_org || !peopleList) {
      alert('Заполните название школы и список людей');
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const response = await fetch(`/api/collections/${collectionId}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edu_org, head_teacher, peopleList })
      });
      if (!response.ok) throw new Error('Ошибка сервера');
      const data = await response.json();
      console.log('Школа добавлена, ответ:', data);
      closeModal();
      await loadSchoolsAndRender(collectionId);
      const expectedCount = peopleList.split(/\r?\n/).filter(l => l.trim().length > 0).length;
      const schoolAfter = (await fetch(`/api/collections/${collectionId}/schools`).then(r => r.json())).find(s => s.edu_org === edu_org);
      if (schoolAfter && schoolAfter.people_count !== expectedCount) {
        setTimeout(async () => {
          await loadSchoolsAndRender(collectionId);
        }, 500);
      }
      if (window.loadCollections) window.loadCollections();
      
      // Показываем уведомление
      alert(`✅ Школа "${edu_org}" успешно добавлена.\n👥 Добавлено ${expectedCount} учащихся.`);
    } catch (err) {
      alert('Ошибка добавления школы: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      form.reset();
    }
  };
  addModal.style.display = 'flex';
}

// Обработчики удаления и редактирования школ
window.handleDeleteSchool = async function(btn) {
  const schoolId = btn.getAttribute('data-school-id');
  if (!confirm('Удалить школу и всех её участников?')) return;
  try {
    await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
    if (window.currentCollectionIdForSchools) {
      await loadSchoolsAndRender(window.currentCollectionIdForSchools);
    }
    if (window.loadCollections) window.loadCollections();
  } catch (err) { alert('Ошибка удаления школы'); }
};

window.handleEditSchool = async function(btn) {
  const schoolId = btn.getAttribute('data-school-id');
  const row = btn.closest('.school-row');
  const currentName = row.querySelector('.school-name').innerText;
  const currentHead = row.querySelector('.school-head').innerText === '—' ? '' : row.querySelector('.school-head').innerText;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>Редактировать школу</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <form id="editSchoolForm">
          <div class="form-group">
            <label>Название школы</label>
            <input type="text" id="editSchoolName" value="${window.escapeHtml(currentName)}" required>
          </div>
          <div class="form-group">
            <label>Руководитель сборов</label>
            <input type="text" id="editHeadTeacher" value="${window.escapeHtml(currentHead)}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel">Отмена</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
  modal.querySelector('#editSchoolForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('editSchoolName').value.trim();
    const newHead = document.getElementById('editHeadTeacher').value.trim();
    if (!newName) { alert('Название школы обязательно'); return; }
    try {
      await fetch(`/api/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edu_org: newName, head_teacher: newHead || null })
      });
      closeModal();
      if (window.currentCollectionIdForSchools) {
        await loadSchoolsAndRender(window.currentCollectionIdForSchools);
      }
      if (window.loadCollections) window.loadCollections();
    } catch (err) { alert('Ошибка редактирования: ' + err.message); }
  });
};

function attachSchoolButtons() {
  document.querySelectorAll('.delete-school-btn').forEach(btn => {
    btn.removeEventListener('click', window.deleteSchoolHandler);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.handleDeleteSchool(btn);
    });
  });
  document.querySelectorAll('.edit-school-btn').forEach(btn => {
    btn.removeEventListener('click', window.editSchoolHandler);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.handleEditSchool(btn);
    });
  });
  document.querySelectorAll('.school-row').forEach(row => {
    row.removeEventListener('click', window.rowClickHandler);
    row.addEventListener('click', (e) => {
      if (e.target.closest('.edit-school-btn') || e.target.closest('.delete-school-btn')) return;
      const schoolId = row.getAttribute('data-school-id');
      const schoolName = row.querySelector('.school-name').innerText;
      if (window.openPeopleModal) {
        window.openPeopleModal(schoolId, schoolName);
      } else {
        console.error('window.openPeopleModal не определена');
      }
    });
  });
}

// Форма создания сбора
const collectionForm = document.getElementById('collectionForm');
if (collectionForm) {
  collectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date_start = document.getElementById('colDateStart')?.value;
    const date_end = document.getElementById('colDateEnd')?.value;
    const military_unit = document.getElementById('militaryUnit')?.value.trim();
    if (!date_start || !date_end || !military_unit) {
      alert('Заполните даты и войсковую часть');
      return;
    }
    if (date_start > date_end) {
      alert('Дата заезда не может быть позже даты выезда');
      return;
    }
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_start, date_end, military_unit })
      });
      if (!response.ok) throw new Error('Ошибка сервера');
      const modal = document.getElementById('collectionModal');
      if (modal) modal.style.display = 'none';
      window.loadCollections();
    } catch (err) { alert('Ошибка добавления сбора: ' + err.message); }
  });
}

window.openCollectionModal = function() {
  const modal = document.getElementById('collectionModal');
  if (modal) modal.style.display = 'flex';
  const form = document.getElementById('collectionForm');
  if (form) form.reset();
};

window.addEventListener('click', (e) => {
  const modal = document.getElementById('collectionModal');
  if (modal && e.target === modal) modal.style.display = 'none';
});

window.loadCollections();