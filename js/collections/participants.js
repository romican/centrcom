// ========== МОДАЛКА УЧАСТНИКОВ ШКОЛЫ ==========
let currentSchoolId = null;
let currentSchoolName = null;
let allPeople = [];
let currentSort = 'name';

if (!document.getElementById('peopleModal')) {
  const peopleModal = document.createElement('div');
  peopleModal.id = 'peopleModal';
  peopleModal.className = 'modal';
  peopleModal.innerHTML = `
    <div class="modal-content" style="max-width: 1100px; width: auto; min-width: 800px; height: 85vh; display: flex; flex-direction: row; padding: 0; overflow: hidden;">
      <!-- Левая часть: таблица участников -->
      <div style="flex: 2; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #e2e8f0;">
                <div class="modal-header" style="flex-shrink: 0;">
          <h2><i class="fas fa-users"></i> Участники</h2>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="text" id="searchPersonInput" placeholder="Поиск по фамилии..." style="padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; width: 180px;">
            <div style="display: flex; gap: 8px;">
              <button id="sortByNameBtn" class="btn small" style="background: #3b82f6; color: white; border: none; border-radius: 20px; padding: 6px 12px;">По алфавиту</button>
              <button id="sortByPlatoonBtn" class="btn small" style="background: #8b5cf6; color: white; border: none; border-radius: 20px; padding: 6px 12px;">По взводам</button>
            </div>
          </div>
        </div>
        <div id="peopleInfo" style="margin: 0 20px 12px 20px; flex-shrink: 0;"></div>
        <div style="flex: 1; overflow-y: auto; padding: 0 20px;" id="peopleListContainer">
          <table class="schools-table" id="peopleTable">
            <thead>
              <tr>
                <th style="width: 60px;">№</th>
                <th style="min-width: 180px;">ФИО</th>
                <th style="width: 140px;">Взвод</th>
                <th style="min-width: 180px;">Организация</th>
                <th style="width: 90px;">Действия</th>
              </tr>
            </thead>
            <tbody id="peopleTableBody"></tbody>
          </table>
        </div>
        <div style="flex-shrink: 0; padding: 12px 20px 16px 20px; background: inherit; border-top: 1px solid #e2e8f0;">
          <button id="addPersonBtn" class="btn add" style="width:100%;"><i class="fas fa-plus"></i> Добавить человека</button>
          <div id="addPersonForm" style="display: none; margin-top: 12px;">
            <div class="form-group"><label><i class="fas fa-user"></i> ФИО</label><input type="text" id="newPersonName" placeholder="Иванов Иван Иванович" required></div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button id="cancelAddPersonBtn" class="btn cancel">Отмена</button>
              <button id="savePersonBtn" class="btn add">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Правая часть: история -->
      <div style="flex: 1; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto;" class="status-panel">
        <div class="modal-header" style="border-bottom: none; justify-content: space-between;">
          <h2><i class="fas fa-history"></i> История изменений</h2>
          <button class="close-modal" id="closePeopleModalBtn">&times;</button>
        </div>
        <div id="schoolLogsList" style="padding: 16px; display: flex; flex-direction: column; gap: 20px;">Загрузка...</div>
      </div>
  `;
  document.body.appendChild(peopleModal);
}

// Загрузка логов школы
async function loadSchoolLogs(schoolId) {
  const container = document.getElementById('schoolLogsList');
  if (!container) return;
  try {
    const resp = await fetch(`/api/schools/${schoolId}/logs`);
    if (!resp.ok) throw new Error();
    const logs = await resp.json();
    if (!logs.length) {
      container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">Нет записей</p>';
      return;
    }
    container.innerHTML = logs.map(log => {
      const date = window.formatDateTime(log.created_at);
      let icon = 'fa-plus-circle';
      let color = '#10b981';
      if (log.action === 'person_deleted') { icon = 'fa-trash-alt'; color = '#ef4444'; }
      else if (log.action === 'person_edited') { icon = 'fa-user-edit'; color = '#f59e0b'; }
      else if (log.action === 'school_renamed' || log.action === 'head_teacher_changed') { icon = 'fa-edit'; color = '#3b82f6'; }
      else if (log.action === 'mass_people_added') { icon = 'fa-users'; color = '#8b5cf6'; }
      let descHtml = window.escapeHtml(log.description);
      if (log.old_value && log.new_value && log.action === 'person_edited') {
        descHtml = `Изменён <del style="opacity:0.7;">${window.escapeHtml(log.old_value)}</del> → <strong>${window.escapeHtml(log.new_value)}</strong>`;
      } else if (log.action === 'school_renamed') {
        descHtml = `Название изменено: <del style="opacity:0.7;">${window.escapeHtml(log.old_value)}</del> → <strong>${window.escapeHtml(log.new_value)}</strong>`;
      } else if (log.action === 'head_teacher_changed') {
        descHtml = `Руководитель изменён: <del style="opacity:0.7;">${window.escapeHtml(log.old_value)}</del> → <strong>${window.escapeHtml(log.new_value)}</strong>`;
      }
      return `
        <div class="status-item active" style="padding-bottom: 16px;">
          <div class="status-icon" style="background: ${color}; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            <i class="fas ${icon}"></i>
          </div>
          <div class="status-content">
            <div class="status-name" style="font-weight:500; margin-bottom:2px;">${descHtml}</div>
            <div class="status-date">${date}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="text-align:center; color:#ef4444;">Ошибка загрузки истории</p>';
  }
}

async function openPeopleModal(schoolId, schoolName) {
  currentSchoolId = schoolId;
  currentSchoolName = schoolName;
  const schoolInfo = (window.allSchools || []).find(s => s.id == schoolId);
  const headTeacherHtml = schoolInfo && schoolInfo.head_teacher ? `<br><strong>Руководитель сборов:</strong> ${window.escapeHtml(schoolInfo.head_teacher)}` : '';
  const infoDiv = document.getElementById('peopleInfo');
  if (infoDiv) infoDiv.innerHTML = `<strong>Школа:</strong> ${window.escapeHtml(schoolName)}${headTeacherHtml}`;
  await loadPeopleForSchool(schoolId);
  await loadSchoolLogs(schoolId);
  const modal = document.getElementById('peopleModal');
  if (modal) modal.style.display = 'flex';
  const addForm = document.getElementById('addPersonForm');
  if (addForm) addForm.style.display = 'none';
  const nameInput = document.getElementById('newPersonName');
  if (nameInput) nameInput.value = '';
  const searchInput = document.getElementById('searchPersonInput');
  if (searchInput) searchInput.value = '';
  currentSort = 'name';
  filterPeople();
  
  const sortByName = document.getElementById('sortByNameBtn');
  if (sortByName) sortByName.onclick = () => { currentSort = 'name'; filterPeople(); };
  const sortByPlatoon = document.getElementById('sortByPlatoonBtn');
  if (sortByPlatoon) sortByPlatoon.onclick = () => { currentSort = 'platoon'; filterPeople(); };
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
  const searchTerm = document.getElementById('searchPersonInput')?.value.trim().toLowerCase() || '';
  let filtered = [...allPeople];
  if (searchTerm) filtered = filtered.filter(p => p.full_name.toLowerCase().includes(searchTerm));
  if (currentSort === 'name') filtered.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  else filtered.sort((a, b) => {
    const getOrder = (p) => {
      if (!p.platoon_name) return 0;
      const match = p.platoon_name.match(/\d+/);
      return match ? parseInt(match[0]) : 999;
    };
    return getOrder(a) - getOrder(b);
  });
  renderPeopleTable(filtered);
}

function renderPeopleTable(people) {
  const tbody = document.getElementById('peopleTableBody');
  if (!tbody) return;
  if (people.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="schools-table-empty">Нет участников</td></tr>';
    return;
  }
  tbody.innerHTML = people.map((p, idx) => {
    const platoonStatus = p.platoon_name 
      ? `<span class="platoon-badge assigned">${window.escapeHtml(p.platoon_name)}</span>`
      : `<span class="platoon-badge unassigned">Не распределён</span>`;
    return `
      <tr class="schools-table-row" data-person-id="${p.id}">
        <td style="text-align: center;">${idx+1}</td>
        <td class="schools-table-name">${window.escapeHtml(p.full_name)}</td>
        <td style="text-align: center;">${platoonStatus}</td>
        <td class="schools-table-head">${window.escapeHtml(p.organization)}</td>
        <td class="schools-table-actions">
          <button class="schools-table-edit" data-person-id="${p.id}"><i class="fas fa-edit"></i></button>
          <button class="schools-table-delete" data-person-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }).join('');
  attachPersonEvents();
}

function attachPersonEvents() {
  // Удаление участника
  document.querySelectorAll('#peopleTable .schools-table-delete').forEach(btn => {
    btn.removeEventListener('click', handleDeletePerson);
    btn.addEventListener('click', handleDeletePerson);
  });
  // Редактирование участника
  document.querySelectorAll('#peopleTable .schools-table-edit').forEach(btn => {
    btn.removeEventListener('click', handleEditPerson);
    btn.addEventListener('click', handleEditPerson);
  });
}

// Обработчик удаления
async function handleDeletePerson(e) {
  e.stopPropagation();
  const personId = e.currentTarget.getAttribute('data-person-id');
  if (confirm('Удалить этого человека?')) {
    await fetch(`/api/collection-people/${personId}`, { method: 'DELETE' });
    await loadPeopleForSchool(currentSchoolId);
    await loadSchoolLogs(currentSchoolId);
    if (window.loadCollections) window.loadCollections();
  }
}

// Обработчик редактирования
async function handleEditPerson(e) {
  e.stopPropagation();
  const personId = e.currentTarget.getAttribute('data-person-id');
  const row = e.currentTarget.closest('tr');
  const currentName = row ? row.querySelector('.schools-table-name').innerText : '';
  const newName = prompt('Введите новое ФИО:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    try {
      const response = await fetch(`/api/collection-people/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName.trim() })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка сервера');
      }
      await loadPeopleForSchool(currentSchoolId);
      await loadSchoolLogs(currentSchoolId);
      if (window.loadCollections) window.loadCollections();
    } catch (err) { alert('Ошибка редактирования: ' + err.message); }
  }
}

// Добавление человека
document.getElementById('addPersonBtn')?.addEventListener('click', () => {
  const addForm = document.getElementById('addPersonForm');
  if (addForm) addForm.style.display = 'block';
  const addBtn = document.getElementById('addPersonBtn');
  if (addBtn) addBtn.style.display = 'none';
  const nameInput = document.getElementById('newPersonName');
  if (nameInput) nameInput.value = '';
});
document.getElementById('cancelAddPersonBtn')?.addEventListener('click', () => {
  const addForm = document.getElementById('addPersonForm');
  if (addForm) addForm.style.display = 'none';
  const addBtn = document.getElementById('addPersonBtn');
  if (addBtn) addBtn.style.display = 'block';
});
document.getElementById('savePersonBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('newPersonName')?.value.trim();
  if (!name) { alert('Заполните ФИО'); return; }
  try {
    await fetch(`/api/schools/${currentSchoolId}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, organization: currentSchoolName })
    });
    await loadPeopleForSchool(currentSchoolId);
    await loadSchoolLogs(currentSchoolId);
    if (window.loadCollections) window.loadCollections();
    const addForm = document.getElementById('addPersonForm');
    if (addForm) addForm.style.display = 'none';
    const addBtn = document.getElementById('addPersonBtn');
    if (addBtn) addBtn.style.display = 'block';
    const nameInput = document.getElementById('newPersonName');
    if (nameInput) nameInput.value = '';
  } catch (err) { alert('Ошибка добавления: ' + err.message); }
});
document.getElementById('searchPersonInput')?.addEventListener('input', filterPeople);
document.getElementById('closePeopleModalBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('peopleModal');
  if (modal) modal.style.display = 'none';
});
document.getElementById('peopleModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('peopleModal')) {
    document.getElementById('peopleModal').style.display = 'none';
  }
});

window.openPeopleModal = openPeopleModal;