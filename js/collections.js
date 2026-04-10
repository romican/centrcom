// ========== СБОРЫ (новая логика: школы) ==========
const colDateStart = document.getElementById('colDateStart');
const colDateEnd = document.getElementById('colDateEnd');
const militaryUnit = document.getElementById('militaryUnit');

const closeCollectionModal = document.getElementById('closeCollectionModalBtn');
const cancelCollectionBtn = document.getElementById('cancelCollectionBtn');
const collectionForm = document.getElementById('collectionForm');

let currentCollectionId = null;
let currentSchoolId = null;
let currentSchoolName = null;
let allSchools = [];

// Модальное окно списка школ
const schoolsModal = document.createElement('div');
schoolsModal.id = 'schoolsModal';
schoolsModal.className = 'modal';
schoolsModal.innerHTML = `
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
          <tr><th>Школа</th><th>Кол-во человек</th><th style="width:120px">Действия</th></tr>
        </thead>
        <tbody id="schoolsTableBody"></tbody>
      </table>
    </div>
    <div style="flex-shrink: 0; padding: 12px 20px 16px 20px; background: inherit; border-top: 1px solid #e2e8f0;">
      <button id="addSchoolBtn" class="btn add" style="width:100%;"><i class="fas fa-plus"></i> Добавить школу</button>
    </div>
  </div>
`;
document.body.appendChild(schoolsModal);

const closeSchoolsModalBtn = document.getElementById('closeSchoolsModalBtn');
const schoolsInfoDiv = document.getElementById('schoolsInfo');
const schoolsTableBody = document.getElementById('schoolsTableBody');
const addSchoolBtn = document.getElementById('addSchoolBtn');
const searchSchoolInput = document.getElementById('searchSchoolInput');

// Модальное окно добавления школы
const addSchoolModal = document.createElement('div');
addSchoolModal.id = 'addSchoolModal';
addSchoolModal.className = 'modal';
addSchoolModal.innerHTML = `
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
          <label><i class="fas fa-list-ul"></i> Список людей (ФИО, каждый с новой строки)</label>
          <textarea id="schoolPeopleList" rows="8" placeholder="Иванов Иван Иванович&#10;Петров Петр Петрович" required style="width:100%; padding:12px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit;"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn cancel" id="cancelAddSchoolBtn">Отменить</button>
          <button type="submit" class="btn add">Сохранить школу</button>
        </div>
      </form>
    </div>
  </div>
`;
document.body.appendChild(addSchoolModal);

const closeAddSchoolModalBtn = document.getElementById('closeAddSchoolModalBtn');
const cancelAddSchoolBtn = document.getElementById('cancelAddSchoolBtn');
const addSchoolForm = document.getElementById('addSchoolForm');
const schoolNameInput = document.getElementById('schoolName');
const schoolPeopleListTextarea = document.getElementById('schoolPeopleList');

// Модальное окно просмотра участников школы (с колонкой Взвод) – расширенное
const peopleModal = document.createElement('div');
peopleModal.id = 'peopleModal';
peopleModal.className = 'modal';
peopleModal.innerHTML = `
  <div class="modal-content" style="max-width: 90vw; width: auto; min-width: 800px; height: 80vh; display: flex; flex-direction: column;">
    <div class="modal-header" style="flex-shrink: 0;">
      <h2><i class="fas fa-users"></i> Участники</h2>
      <div style="display: flex; align-items: center; gap: 12px;">
        <input type="text" id="searchPersonInput" placeholder="Поиск по фамилии..." style="padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; width: 180px;">
        <button class="close-modal" id="closePeopleModalBtn">&times;</button>
      </div>
    </div>
    <div id="peopleInfo" style="margin: 0 24px 16px 24px; flex-shrink: 0;"></div>
    <div style="flex: 1; overflow-y: auto; overflow-x: auto; padding: 0 24px;" id="peopleListContainer">
      <table style="width:100%; border-collapse: collapse; min-width: 700px;" id="peopleTable">
        <thead>
          <tr>
            <th style="width: 60px;">№</th>
            <th style="min-width: 180px;">ФИО</th>
            <th style="width: 140px;">Взвод</th>
            <th style="min-width: 180px;">Организация</th>
            <th style="width: 50px;">Действия</th>
          </tr>
        </thead>
        <tbody id="peopleTableBody"></tbody>
      </table>
    </div>
    <div style="flex-shrink: 0; padding: 16px 24px; background: inherit; border-top: 1px solid #e2e8f0; margin-top: auto;" id="addPersonSection">
      <button id="addPersonBtn" class="btn add" style="width:100%;"><i class="fas fa-plus"></i> Добавить человека</button>
      <div id="addPersonForm" style="display: none; margin-top: 16px;">
        <div class="form-group"><label><i class="fas fa-user"></i> ФИО</label><input type="text" id="newPersonName" placeholder="Иванов Иван Иванович" required></div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancelAddPersonBtn" class="btn cancel">Отмена</button>
          <button id="savePersonBtn" class="btn add">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
`;
document.body.appendChild(peopleModal);

const closePeopleModalBtn = document.getElementById('closePeopleModalBtn');
const searchPersonInput = document.getElementById('searchPersonInput');
const addPersonBtn = document.getElementById('addPersonBtn');
const addPersonFormDiv = document.getElementById('addPersonForm');
const cancelAddPersonBtn = document.getElementById('cancelAddPersonBtn');
const savePersonBtn = document.getElementById('savePersonBtn');
const newPersonName = document.getElementById('newPersonName');
const peopleInfoDiv = document.getElementById('peopleInfo');
const peopleTableBody = document.getElementById('peopleTableBody');

let allPeople = [];

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========
window.openCollectionModal = function() {
  window.collectionModal.style.display = 'flex';
  collectionForm.reset();
};

function closeCollectionModalFunc() {
  window.collectionModal.style.display = 'none';
}

async function loadCollections() {
  try {
    const resp = await fetch('/api/collections');
    if (!resp.ok) throw new Error();
    const collections = await resp.json();
    renderCollections(collections);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="collections-table-container">Ошибка загрузки сборов</div>';
  }
}

function renderCollections(collections) {
  if (!collections.length) {
    window.contentBody.innerHTML = `<div class="collections-table-container"><table class="collections-table"><thead><tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Кол-во человек</th><th>Взводов</th><th>Войсковая часть</th><th>Действия</th></tr></thead><tbody><tr><td colspan="7" class="loading-cell">Нет сборов</td></tr></tbody></table></div>`;
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
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'collection') deleteCollection(id);
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'collection') openEditCollectionModal(id);
    });
  });
  document.querySelectorAll('.collection-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn') || e.target.classList.contains('edit-btn')) return;
      const id = row.getAttribute('data-collection-id');
      openSchoolsModal(id);
    });
  });
}

async function deleteCollection(id) {
  if (!confirm('Удалить сбор со всеми школами и участниками?')) return;
  try {
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    loadCollections();
  } catch (err) { alert('Ошибка удаления'); }
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
        loadCollections();
      } catch (err) { alert('Ошибка обновления'); }
    });
  } catch (err) { alert('Ошибка загрузки данных'); }
}

// ========== МОДАЛКА СПИСКА ШКОЛ ==========
async function openSchoolsModal(collectionId) {
  currentCollectionId = collectionId;
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const collection = allCollections.find(c => c.id == collectionId);
  if (collection) {
    schoolsInfoDiv.innerHTML = `
      <strong>Сбор:</strong> ${window.formatDate(collection.date_start)} — ${window.formatDate(collection.date_end)}<br>
      <strong>Войсковая часть:</strong> ${window.escapeHtml(collection.military_unit)}
    `;
  }
  await loadSchools(collectionId);
  schoolsModal.style.display = 'flex';
  searchSchoolInput.value = '';
  filterSchools();
}

async function loadSchools(collectionId) {
  try {
    const resp = await fetch(`/api/collections/${collectionId}/schools`);
    if (!resp.ok) throw new Error();
    allSchools = await resp.json();
    filterSchools();
  } catch (err) {
    schoolsTableBody.innerHTML = '<td><td colspan="3">Ошибка загрузки школ</td></tr>';
  }
}

function filterSchools() {
  const searchTerm = searchSchoolInput.value.trim().toLowerCase();
  let filtered = allSchools;
  if (searchTerm) filtered = allSchools.filter(s => s.edu_org.toLowerCase().includes(searchTerm));
  renderSchoolsTable(filtered);
}

function renderSchoolsTable(schools) {
  if (!schools.length) {
    schoolsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Нет школ. Нажмите "Добавить школу".</td></tr>';
    return;
  }
  schoolsTableBody.innerHTML = schools.map(school => `
    <tr class="school-row" data-school-id="${school.id}">
      <td class="school-name">${window.escapeHtml(school.edu_org)}</td>
      <td class="school-count">${school.people_count || 0}</td>
      <td class="school-actions">
        <button class="edit-school-btn" data-school-id="${school.id}" style="background:none; border:none; cursor:pointer; color:#3b82f6; margin-right:8px;"><i class="fas fa-edit"></i></button>
        <button class="delete-school-btn" data-school-id="${school.id}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>
  `).join('');
  
  // Обработчик клика по строке (открыть список участников)
  document.querySelectorAll('.school-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.edit-school-btn') || e.target.closest('.delete-school-btn')) return;
      const schoolId = row.getAttribute('data-school-id');
      const schoolName = row.querySelector('.school-name').innerText;
      openPeopleModal(schoolId, schoolName);
    });
  });
  // Удаление школы
  document.querySelectorAll('.delete-school-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const schoolId = btn.getAttribute('data-school-id');
      if (confirm('Удалить школу и всех её участников?')) {
        try {
          await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
          await loadSchools(currentCollectionId);
          loadCollections();
        } catch (err) { alert('Ошибка удаления школы'); }
      }
    });
  });
  // Редактирование школы
  document.querySelectorAll('.edit-school-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const schoolId = btn.getAttribute('data-school-id');
      const currentName = btn.closest('.school-row').querySelector('.school-name').innerText;
      const newName = prompt('Введите новое название школы:', currentName);
      if (newName && newName.trim() && newName.trim() !== currentName) {
        try {
          await fetch(`/api/schools/${schoolId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ edu_org: newName.trim() })
          });
          await loadSchools(currentCollectionId);
          loadCollections(); // обновить количество участников в основной таблице
        } catch (err) {
          alert('Ошибка редактирования: ' + err.message);
        }
      }
    });
  });
}

// ========== МОДАЛКА ДОБАВЛЕНИЯ ШКОЛЫ ==========
addSchoolBtn.addEventListener('click', () => {
  addSchoolModal.style.display = 'flex';
  addSchoolForm.reset();
});
closeAddSchoolModalBtn.addEventListener('click', () => addSchoolModal.style.display = 'none');
cancelAddSchoolBtn.addEventListener('click', () => addSchoolModal.style.display = 'none');

addSchoolForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const edu_org = schoolNameInput.value.trim();
  const peopleList = schoolPeopleListTextarea.value;
  if (!edu_org || !peopleList) {
    alert('Заполните название школы и список людей');
    return;
  }
  try {
    const response = await fetch(`/api/collections/${currentCollectionId}/schools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edu_org, peopleList })
    });
    if (!response.ok) throw new Error('Ошибка сервера');
    const data = await response.json();
    if (data.schools) {
      allSchools = data.schools;
      filterSchools();
    } else {
      await loadSchools(currentCollectionId);
    }
    loadCollections();
    addSchoolModal.style.display = 'none';
    schoolNameInput.value = '';
    schoolPeopleListTextarea.value = '';
  } catch (err) {
    alert('Ошибка добавления школы: ' + err.message);
  }
});

// ========== МОДАЛКА ПРОСМОТРА УЧАСТНИКОВ ШКОЛЫ ==========
async function openPeopleModal(schoolId, schoolName) {
  currentSchoolId = schoolId;
  currentSchoolName = schoolName;
  peopleInfoDiv.innerHTML = `<strong>Школа:</strong> ${window.escapeHtml(schoolName)}`;
  await loadPeopleForSchool(schoolId);
  peopleModal.style.display = 'flex';
  addPersonFormDiv.style.display = 'none';
  newPersonName.value = '';
  searchPersonInput.value = '';
  filterPeople();
}

async function loadPeopleForSchool(schoolId) {
  try {
    const resp = await fetch(`/api/schools/${schoolId}/people`);
    if (!resp.ok) throw new Error();
    allPeople = await resp.json();
    filterPeople();
  } catch (err) { console.error(err); }
}

function filterPeople() {
  const searchTerm = searchPersonInput.value.trim().toLowerCase();
  let filtered = [...allPeople];
  if (searchTerm) filtered = filtered.filter(p => p.full_name.toLowerCase().includes(searchTerm));
  renderPeopleTable(filtered);
}

function renderPeopleTable(people) {
  const tbody = document.getElementById('peopleTableBody');
  if (people.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Нет участников</td></tr>';
    return;
  }
  tbody.innerHTML = people.map((p, idx) => {
    const platoonStatus = p.platoon_name 
      ? `<span class="platoon-badge assigned">${window.escapeHtml(p.platoon_name)}</span>`
      : `<span class="platoon-badge unassigned">Не распределён</span>`;
    return `
      <tr>
        <td style="text-align: center;">${idx+1}</td>
        <td>${window.escapeHtml(p.full_name)}</td>
        <td>${platoonStatus}</td>
        <td>${window.escapeHtml(p.organization)}</td>
        <td><button class="delete-person-btn" data-person-id="${p.id}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times-circle"></i></button></td>
      </tr>
    `;
  }).join('');
  document.querySelectorAll('.delete-person-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const personId = btn.getAttribute('data-person-id');
      if (confirm('Удалить этого человека?')) {
        await fetch(`/api/collection-people/${personId}`, { method: 'DELETE' });
        await loadPeopleForSchool(currentSchoolId);
        loadCollections();
      }
    });
  });
}

addPersonBtn.addEventListener('click', () => {
  addPersonFormDiv.style.display = 'block';
  addPersonBtn.style.display = 'none';
  newPersonName.value = '';
});
cancelAddPersonBtn.addEventListener('click', () => {
  addPersonFormDiv.style.display = 'none';
  addPersonBtn.style.display = 'block';
});
savePersonBtn.addEventListener('click', async () => {
  const name = newPersonName.value.trim();
  if (!name) { alert('Заполните ФИО'); return; }
  try {
    await fetch(`/api/schools/${currentSchoolId}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, organization: currentSchoolName })
    });
    await loadPeopleForSchool(currentSchoolId);
    loadCollections();
    addPersonFormDiv.style.display = 'none';
    addPersonBtn.style.display = 'block';
    newPersonName.value = '';
  } catch (err) { alert('Ошибка добавления: ' + err.message); }
});
searchPersonInput.addEventListener('input', filterPeople);
closePeopleModalBtn.addEventListener('click', () => peopleModal.style.display = 'none');
peopleModal.addEventListener('click', (e) => { if (e.target === peopleModal) peopleModal.style.display = 'none'; });

// Закрытие модалок
closeSchoolsModalBtn.addEventListener('click', () => schoolsModal.style.display = 'none');
schoolsModal.addEventListener('click', (e) => { if (e.target === schoolsModal) schoolsModal.style.display = 'none'; });
addSchoolModal.addEventListener('click', (e) => { if (e.target === addSchoolModal) addSchoolModal.style.display = 'none'; });
searchSchoolInput.addEventListener('input', filterSchools);

collectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const date_start = colDateStart.value;
  const date_end = colDateEnd.value;
  const military_unit = militaryUnit.value.trim();
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
    closeCollectionModalFunc();
    loadCollections();
  } catch (err) { alert('Ошибка добавления сбора: ' + err.message); }
});

closeCollectionModal.addEventListener('click', closeCollectionModalFunc);
cancelCollectionBtn.addEventListener('click', closeCollectionModalFunc);
window.addEventListener('click', (e) => { if (e.target === window.collectionModal) closeCollectionModalFunc(); });
window.editModal.addEventListener('click', (e) => { if (e.target === window.editModal) window.editModal.style.display = 'none'; });

window.loadCollections = loadCollections;
window.deleteCollection = deleteCollection;