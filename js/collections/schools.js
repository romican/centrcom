// ========== МОДАЛКА СПИСКА ШКОЛ И ДОБАВЛЕНИЕ ШКОЛЫ ==========
let currentCollectionId = null;
let allSchools = [];

// 1. Создаём модальное окно списка школ
if (!document.getElementById('schoolsModal')) {
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
  document.body.appendChild(schoolsModal);
}

// 2. Создаём модальное окно добавления школы
if (!document.getElementById('addSchoolModal')) {
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
            <label><i class="fas fa-user-tie"></i> Руководитель сборов (школа)</label>
            <input type="text" id="headTeacher" placeholder="Иванов Иван Иванович">
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
}

// ========== ФУНКЦИИ РАБОТЫ СО ШКОЛАМИ ==========
async function loadSchools(collectionId) {
  currentCollectionId = collectionId;
  try {
    const resp = await fetch(`/api/collections/${collectionId}/schools`);
    if (!resp.ok) throw new Error();
    allSchools = await resp.json();
    window.allSchools = allSchools;
    filterSchools();
  } catch (err) {
    const tbody = document.getElementById('schoolsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">Ошибка загрузки школ<\/td></tr>';
  }
}

function filterSchools() {
  const searchTerm = document.getElementById('searchSchoolInput')?.value.trim().toLowerCase() || '';
  let filtered = allSchools;
  if (searchTerm) filtered = allSchools.filter(s => s.edu_org.toLowerCase().includes(searchTerm));
  renderSchoolsTable(filtered);
}

function renderSchoolsTable(schools) {
  const tbody = document.getElementById('schoolsTableBody');
  if (!tbody) return;
  if (!schools.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Нет школ. Нажмите "Добавить школу".<\/td></tr>';
    return;
  }
  tbody.innerHTML = schools.map(school => `
    <tr class="school-row" data-school-id="${school.id}">
      <td class="school-name">${window.escapeHtml(school.edu_org)}<\/td>
      <td class="school-head">${window.escapeHtml(school.head_teacher || '—')}<\/td>
      <td class="school-count">${school.people_count || 0}<\/td>
      <td class="school-actions">
        <button class="edit-school-btn" data-school-id="${school.id}" style="background:none; border:none; cursor:pointer; color:#3b82f6; margin-right:8px;"><i class="fas fa-edit"><\/i><\/button>
        <button class="delete-school-btn" data-school-id="${school.id}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"><\/i><\/button>
      <\/td>
    <\/tr>
  `).join('');
  attachSchoolRowEvents();
}

function attachSchoolRowEvents() {
  document.querySelectorAll('.school-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.edit-school-btn') || e.target.closest('.delete-school-btn')) return;
      const schoolId = row.getAttribute('data-school-id');
      const schoolName = row.querySelector('.school-name').innerText;
      if (window.openPeopleModal) window.openPeopleModal(schoolId, schoolName);
    });
  });
  document.querySelectorAll('.delete-school-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const schoolId = btn.getAttribute('data-school-id');
      if (confirm('Удалить школу и всех её участников?')) {
        try {
          await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
          await loadSchools(currentCollectionId);
          if (window.loadCollections) window.loadCollections();
        } catch (err) { alert('Ошибка удаления школы'); }
      }
    });
  });
  document.querySelectorAll('.edit-school-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const schoolId = btn.getAttribute('data-school-id');
      const row = btn.closest('.school-row');
      const currentName = row.querySelector('.school-name').innerText;
      const currentHead = row.querySelector('.school-head').innerText === '—' ? '' : row.querySelector('.school-head').innerText;
      openEditSchoolModal(schoolId, currentName, currentHead);
    });
  });
}

async function openEditSchoolModal(schoolId, currentName, currentHead) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'editSchoolModalTemp';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2><i class="fas fa-edit"></i> Редактировать школу</h2>
        <button class="close-modal" id="closeEditSchoolModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <form id="editSchoolForm">
          <div class="form-group">
            <label><i class="fas fa-school"></i> Название школы</label>
            <input type="text" id="editSchoolName" value="${window.escapeHtml(currentName)}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-user-tie"></i> Руководитель сборов</label>
            <input type="text" id="editHeadTeacher" value="${window.escapeHtml(currentHead)}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel" id="cancelEditSchoolBtn">Отменить</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  document.getElementById('closeEditSchoolModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelEditSchoolBtn').addEventListener('click', closeModal);
  document.getElementById('editSchoolForm').addEventListener('submit', async (e) => {
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
      await loadSchools(currentCollectionId);
      if (window.loadCollections) window.loadCollections();
      closeModal();
    } catch (err) { alert('Ошибка редактирования: ' + err.message); }
  });
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ МОДАЛКИ ШКОЛ ==========
document.getElementById('addSchoolBtn')?.addEventListener('click', () => {
  document.getElementById('addSchoolModal').style.display = 'flex';
  document.getElementById('addSchoolForm').reset();
});
document.getElementById('closeSchoolsModalBtn')?.addEventListener('click', () => {
  document.getElementById('schoolsModal').style.display = 'none';
});
document.getElementById('schoolsModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('schoolsModal')) {
    document.getElementById('schoolsModal').style.display = 'none';
  }
});
document.getElementById('searchSchoolInput')?.addEventListener('input', () => filterSchools());

// ========== ОБРАБОТЧИКИ ДЛЯ МОДАЛКИ ДОБАВЛЕНИЯ ШКОЛЫ ==========
document.getElementById('closeAddSchoolModalBtn')?.addEventListener('click', () => {
  document.getElementById('addSchoolModal').style.display = 'none';
});
document.getElementById('cancelAddSchoolBtn')?.addEventListener('click', () => {
  document.getElementById('addSchoolModal').style.display = 'none';
});
document.getElementById('addSchoolForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const edu_org = document.getElementById('schoolName').value.trim();
  const head_teacher = document.getElementById('headTeacher').value.trim();
  const peopleList = document.getElementById('schoolPeopleList').value;
  if (!edu_org || !peopleList) {
    alert('Заполните название школы и список людей');
    return;
  }
  try {
    const response = await fetch(`/api/collections/${currentCollectionId}/schools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edu_org, head_teacher, peopleList })
    });
    if (!response.ok) throw new Error('Ошибка сервера');
    const data = await response.json();
    if (data.schools) {
      allSchools = data.schools;
      filterSchools();
    } else {
      await loadSchools(currentCollectionId);
    }
    if (window.loadCollections) window.loadCollections();
    document.getElementById('addSchoolModal').style.display = 'none';
    document.getElementById('schoolName').value = '';
    document.getElementById('headTeacher').value = '';
    document.getElementById('schoolPeopleList').value = '';
  } catch (err) {
    alert('Ошибка добавления школы: ' + err.message);
  }
});

// Экспорт в глобальную область
window.loadSchools = loadSchools;
window.filterSchools = filterSchools;
window.renderSchoolsTable = renderSchoolsTable;