// ========== МОДАЛКА ШКОЛ, СТАТУСЫ, ДОБАВЛЕНИЕ/УДАЛЕНИЕ/РЕДАКТИРОВАНИЕ ШКОЛ ==========
// Красивое уведомление о статусе закрепления
function showLockStatusModal(message, locked) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const icon = locked ? 'fa-lock' : 'fa-lock-open';
    const color = locked ? '#10b981' : '#f59e0b';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:320px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:${color}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas ${icon}" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.3rem; font-weight:600;">${message}</h2>
        <button class="btn add" style="min-width:100px;">Ок</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const closeModal = () => {
      modal.remove();
      resolve();
    };
    modal.querySelector('.btn.add').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  });
}

function formatShortName(fullName) {
  if (!fullName || fullName === '—') return '—';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts[0];
  const firstInitial = parts[1].charAt(0).toUpperCase() + '.';
  const middleInitial = parts[2] ? parts[2].charAt(0).toUpperCase() + '.' : '';
  return `${lastName} ${firstInitial}${middleInitial}`;
}

window.refreshCollectionStatus = async function(collectionId) {
  await new Promise(r => setTimeout(r, 200));
  const resp = await fetch('/api/collections', { cache: 'no-store' });
  const all = await resp.json();
  const collection = all.find(c => c.id == collectionId);
  if (collection) {
    window.renderCollectionStatus(collection);
    const lockBtn = document.getElementById('lockCollectionBtn');
    const unlockBtn = document.getElementById('unlockCollectionBtn');
    if (lockBtn && unlockBtn) {
      const hasSchools = (collection.schools_count > 0);
      const isLocked = (collection.status === 'locked');
      if (hasSchools) {
        if (isLocked) {
          lockBtn.disabled = true;
          unlockBtn.disabled = false;
        } else {
          lockBtn.disabled = false;
          unlockBtn.disabled = true;
        }
      } else {
        lockBtn.disabled = true;
        unlockBtn.disabled = true;
      }
      lockBtn.style.opacity = lockBtn.disabled ? '0.5' : '1';
      unlockBtn.style.opacity = unlockBtn.disabled ? '0.5' : '1';
    }
  }

  const addSchoolBtn = document.getElementById('addSchoolBtn');
  if (addSchoolBtn) {
    addSchoolBtn.disabled = (collection.status === 'locked');
    addSchoolBtn.style.opacity = addSchoolBtn.disabled ? '0.5' : '1';
    addSchoolBtn.style.cursor = addSchoolBtn.disabled ? 'not-allowed' : 'pointer';
  }
};

window.renderCollectionStatus = function(collection) {
  const statusContainer = document.getElementById('collectionStatusList');
  if (!statusContainer) return;
  const statuses = [];
  const createdDate = collection.created_at ? window.formatDateTime(collection.created_at) : window.formatDate(collection.date_start);
  statuses.push({ name: 'Сбор создан', date: createdDate, active: true, completed: true });
  const hasSchools = (collection.schools_count > 0);
  statuses.push({
    name: 'Добавление школ и участников',
    date: hasSchools ? (collection.first_school_added_at ? window.formatDateTime(collection.first_school_added_at) : '—') : '—',
    active: hasSchools,
    completed: hasSchools
  });
  const isLocked = (collection.status === 'locked');
  statuses.push({
    name: 'Сбор сформирован',
    date: isLocked ? (collection.locked_at ? window.formatDateTime(collection.locked_at) : window.formatDate(collection.date_end)) : '—',
    active: isLocked,
    completed: isLocked
  });
  let statusHtml = '';
  statuses.forEach((st, idx) => {
    const icon = st.completed ? 'fas fa-check-circle' : 'far fa-circle';
    const lineClass = (idx < statuses.length-1) ? 'status-line' : '';
    statusHtml += `<div class="status-item ${st.active ? 'active' : ''}">
      <div class="status-icon"><i class="${icon}"></i></div>
      <div class="status-content"><div class="status-name">${st.name}</div><div class="status-date">${st.date !== '—' ? st.date : 'не начат'}</div></div>
      ${lineClass ? `<div class="${lineClass}"></div>` : ''}
    </div>`;
  });
  statusContainer.innerHTML = statusHtml;
};

function ensureSchoolsModal() {
  if (document.getElementById('schoolsModal')) return;
  const modal = document.createElement('div');
  modal.id = 'schoolsModal';
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content" style="max-width:1100px; height:85vh; display:flex; flex-direction:row; padding:0; overflow:hidden;">
    <div style="flex:2; display:flex; flex-direction:column; overflow:hidden; border-right:1px solid #e2e8f0;">
      <div class="modal-header" style="flex-shrink:0;"><h2><i class="fas fa-school"></i> Школы в сборе</h2><div style="display:flex; align-items:center; gap:12px;"><input type="text" id="searchSchoolInput" placeholder="Поиск по школе..." style="padding:8px 12px; border-radius:20px; border:1px solid #ccc; width:180px;"></div></div>
      <div id="schoolsInfo" style="margin:0 20px 12px 20px; flex-shrink:0;"></div>
      <div style="flex:1; overflow-y:auto; padding:0 20px;" id="schoolsListContainer">
        <table class="schools-table" id="schoolsTable">
          <thead>
            <tr>
              <th class="schools-table-header-cell">Школа</th>
              <th class="schools-table-header-cell">Руководитель</th>
              <th class="schools-table-header-cell schools-table-header-center">Кол‑во человек</th>
              <th class="schools-table-header-cell" style="width:120px">Действия</th>
            </tr>
          </thead>
          <tbody id="schoolsTableBody"></tbody>
        </table>
      </div>
      <div style="flex-shrink:0; padding:12px 20px 16px 20px; background:inherit; border-top:1px solid #e2e8f0;">
        <button id="addSchoolBtn" class="btn add" style="width:100%;"><i class="fas fa-plus"></i> Добавить школу</button>
        <div style="display:flex; gap:12px; margin-top:12px;"><button id="lockCollectionBtn" class="btn" style="background:#10b981; color:white; width:100%;"><i class="fas fa-lock"></i> Закрепить</button><button id="unlockCollectionBtn" class="btn" style="background:#ef4444; color:white; width:100%;"><i class="fas fa-lock-open"></i> Открепить</button></div>
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; background:#f8fafc; overflow-y:auto;" class="status-panel">
      <div class="modal-header" style="border-bottom:none; justify-content:space-between;">
        <h2><i class="fas fa-chart-line"></i> Статус сборов</h2>
        <button class="close-modal" id="closeSchoolsModalBtn">&times;</button>
      </div>
      <div id="collectionStatusList" style="padding:16px; display:flex; flex-direction:column; gap:20px;"></div>
    </div>`;
  document.body.appendChild(modal);
}

async function loadSchoolsAndRender(collectionId) {
  const tbody = document.getElementById('schoolsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4"><div class="schools-loader"><div class="loader-spinner"></div></div></td></tr>`;

  const resp = await fetch(`/api/collections/${collectionId}/schools?_=${Date.now()}`, { cache: 'no-store' });
  const schools = await resp.json();

  if (!schools.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="schools-table-empty">Нет школ. Нажмите «Добавить школу».</td></tr>';
  } else {
    tbody.innerHTML = schools.map(school => `
      <tr class="schools-table-row" data-school-id="${school.id}">
        <td class="schools-table-name">${window.escapeHtml(school.edu_org)}</td>
        <td class="schools-table-head">${window.escapeHtml(formatShortName(school.head_teacher))}</td>
        <td class="schools-table-count">${school.people_count || 0}</td>
        <td class="schools-table-actions">
          <button class="schools-table-edit" data-school-id="${school.id}"><i class="fas fa-edit"></i></button>
          <button class="schools-table-delete" data-school-id="${school.id}"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `).join('');
  }
  attachSchoolButtons();
  return schools;
}

/**
 * Ожидает, пока количество участников в новой школе станет равным expectedCount.
 * Показывает лоадер в таблице школ.
 */
async function waitForSchoolCount(collectionId, expectedCount, maxWaitMs = 10000) {
  const tbody = document.getElementById('schoolsTableBody');
  if (!tbody) return false;
  tbody.innerHTML = `<tr><td colspan="4"><div class="schools-loader"><div class="loader-spinner"></div></div></td></tr>`;

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(`/api/collections/${collectionId}/schools?_=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) break;
    const schools = await resp.json();
    // Ищем школу с максимальным id (последняя добавленная)
    const lastSchool = schools.reduce((max, s) => (s.id > max.id ? s : max), schools[0]);
    if (lastSchool && lastSchool.people_count >= expectedCount) {
      return true; // данные актуальны
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false; // таймаут
}

function attachSchoolButtons() {
  document.querySelectorAll('.schools-table-delete').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); window.handleDeleteSchool(btn); };
  });
  document.querySelectorAll('.schools-table-edit').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); window.handleEditSchool(btn); };
  });
  document.querySelectorAll('.schools-table-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.schools-table-edit') || e.target.closest('.schools-table-delete')) return;
      const schoolId = row.getAttribute('data-school-id');
      const schoolName = row.querySelector('.schools-table-name').innerText;
      if (window.openPeopleModal) window.openPeopleModal(schoolId, schoolName);
    };
  });
}

window.openSchoolsModal = async function(collectionId) {
  ensureSchoolsModal();
  window.currentCollectionIdForSchools = collectionId;
  const collectionsResp = await fetch('/api/collections', { cache: 'no-store' });
  const allCollections = await collectionsResp.json();
  const collection = allCollections.find(c => c.id == collectionId);
  const schoolsInfoDiv = document.getElementById('schoolsInfo');
  if (schoolsInfoDiv && collection) {
    schoolsInfoDiv.innerHTML = `<strong>Сбор:</strong> ${window.formatDate(collection.date_start)} — ${window.formatDate(collection.date_end)}<br>
      <strong>Войсковая часть:</strong> ${window.escapeHtml(collection.military_unit)}<br>
      <strong>Руководитель:</strong> ${window.escapeHtml(collection.head_teacher || '—')}`;
  }
  await loadSchoolsAndRender(collectionId);
  window.renderCollectionStatus(collection);
  await window.refreshCollectionStatus(collectionId);

  const lockBtn = document.getElementById('lockCollectionBtn');
  const unlockBtn = document.getElementById('unlockCollectionBtn');
  if (lockBtn && unlockBtn) {
    const hasSchools = (collection.schools_count > 0);
    const isLocked = (collection.status === 'locked');
    if (hasSchools) {
      if (isLocked) {
        lockBtn.disabled = true;
        unlockBtn.disabled = false;
      } else {
        lockBtn.disabled = false;
        unlockBtn.disabled = true;
      }
    } else {
      lockBtn.disabled = true;
      unlockBtn.disabled = true;
    }
    lockBtn.style.opacity = lockBtn.disabled ? '0.5' : '1';
    unlockBtn.style.opacity = unlockBtn.disabled ? '0.5' : '1';
    lockBtn.onclick = async () => {
      const resp = await fetch(`/api/collections/${collectionId}/lock`, { method: 'POST' });
      if (resp.ok) {
        await showLockStatusModal('Сбор закреплён', true);
        await window.refreshCollectionStatus(collectionId);
        window.loadCollections();
      } else alert('Ошибка при закреплении');
    };
    unlockBtn.onclick = async () => {
      const resp = await fetch(`/api/collections/${collectionId}/unlock`, { method: 'POST' });
      if (resp.ok) {
        await showLockStatusModal('Сбор откреплён', false);
        await window.refreshCollectionStatus(collectionId);
        window.loadCollections();
      } else alert('Ошибка при откреплении');
    };
  }

  const schoolsModal = document.getElementById('schoolsModal');
  if (schoolsModal) schoolsModal.style.display = 'flex';
  document.getElementById('closeSchoolsModalBtn').onclick = () => schoolsModal.style.display = 'none';
  const addSchoolBtn = document.getElementById('addSchoolBtn');
  if (addSchoolBtn) {
    addSchoolBtn.replaceWith(addSchoolBtn.cloneNode(true));
    document.getElementById('addSchoolBtn').addEventListener('click', () => window.openAddSchoolModal(collectionId));
  }
};

window.openAddSchoolModal = function(collectionId) {
  let addModal = document.getElementById('addSchoolModal');
  if (!addModal) {
    addModal = document.createElement('div');
    addModal.id = 'addSchoolModal';
    addModal.className = 'modal';
    addModal.innerHTML = `<div class="modal-content" style="max-width:600px;"><div class="modal-header"><h2><i class="fas fa-plus-circle"></i> Добавить школу</h2><button class="close-modal" id="closeAddSchoolModalBtn">&times;</button></div>
      <div style="padding:16px 24px;"><form id="addSchoolForm">
        <div class="form-group"><label><i class="fas fa-school"></i> Название школы</label><input type="text" id="schoolName" placeholder="ГБОУ Школа №..." required></div>
        <div class="form-group"><label><i class="fas fa-user-tie"></i> Руководитель сборов (школа)</label><input type="text" id="headTeacher" placeholder="Иванов Иван Иванович"></div>
        <div class="form-group"><label><i class="fas fa-list-ul"></i> Список людей (ФИО, каждый с новой строки)</label><textarea id="schoolPeopleList" rows="8" placeholder="Иванов Иван Иванович&#10;Петров Петр Петрович" required style="width:100%; padding:12px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit;"></textarea></div>
        <div class="form-group"><button type="button" id="loadWordBtn" class="btn" style="background:#8b5cf6; color:white; width:100%;"><i class="fas fa-file-word"></i> Загрузить файл Word</button><input type="file" id="wordFileInput" accept=".docx" style="display:none;"></div>
        <div class="form-actions"><button type="button" class="btn cancel" id="cancelAddSchoolBtn">Отменить</button><button type="submit" class="btn add">Сохранить школу</button></div>
      </form></div></div>`;
    document.body.appendChild(addModal);
    const loadWordBtn = document.getElementById('loadWordBtn');
    const fileInput = document.getElementById('wordFileInput');
    if (loadWordBtn && fileInput) {
      loadWordBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (typeof window.parseWordFile === 'function') {
          window.parseWordFile(file, (result) => {
            if (result.schoolName) document.getElementById('schoolName').value = result.schoolName;
            if (result.fioList.length) document.getElementById('schoolPeopleList').value = result.fioList.join('\n');
            fileInput.value = '';
          });
        } else alert('Функция парсинга Word не загружена');
      };
    }
    document.getElementById('closeAddSchoolModalBtn').onclick = () => addModal.style.display = 'none';
    document.getElementById('cancelAddSchoolBtn').onclick = () => addModal.style.display = 'none';
  }
  const form = document.getElementById('addSchoolForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const edu_org = document.getElementById('schoolName').value.trim();
    const head_teacher = document.getElementById('headTeacher').value.trim();
    const peopleList = document.getElementById('schoolPeopleList').value;
    if (!edu_org || !peopleList) { alert('Заполните название школы и список людей'); return; }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const response = await fetch(`/api/collections/${collectionId}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edu_org, head_teacher, peopleList })
      });
if (!response.ok) throw new Error('Ошибка сервера');
      await response.json();
      const lines = peopleList.split(/\r?\n/).filter(l => l.trim().length > 0);
      const expectedPeople = lines.length;
      addModal.style.display = 'none';
      // Ожидаем, пока сервер обновит количество участников
      await waitForSchoolCount(collectionId, expectedPeople);
      await loadSchoolsAndRender(collectionId);
      await window.refreshCollectionStatus(collectionId);
      window.loadCollections();
    } catch (err) { alert('Ошибка: ' + err.message); }
    finally { submitBtn.disabled = false; form.reset(); }
  };
  addModal.style.display = 'flex';
};

window.handleDeleteSchool = async function(btn) {
  const schoolId = btn.getAttribute('data-school-id');
  if (!confirm('Удалить школу и всех её участников?')) return;
  try {
    await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
    if (window.currentCollectionIdForSchools) {
      await loadSchoolsAndRender(window.currentCollectionIdForSchools);
      const collResp = await fetch('/api/collections', { cache: 'no-store' });
      const allColl = await collResp.json();
      const coll = allColl.find(c => c.id == window.currentCollectionIdForSchools);
      if (coll && coll.schools_count === 0 && coll.status !== 'locked') {
        await fetch(`/api/collections/${coll.id}/reset-status`, { method: 'POST' });
      }
      await window.refreshCollectionStatus(window.currentCollectionIdForSchools);
      window.loadCollections();
    }
  } catch (err) { alert('Ошибка удаления школы'); }
};

window.handleEditSchool = async function(btn) {
  const schoolId = btn.getAttribute('data-school-id');
  const row = btn.closest('.schools-table-row');
  const currentName = row.querySelector('.schools-table-name').innerText;
  const currentHead = row.querySelector('.schools-table-head').innerText === '—' ? '' : row.querySelector('.schools-table-head').innerText;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content" style="max-width:500px;"><div class="modal-header"><h2>Редактировать школу</h2><button class="close-modal">&times;</button></div>
    <div style="padding:16px 24px;"><form id="editSchoolForm">
      <div class="form-group"><label>Название школы</label><input type="text" id="editSchoolName" value="${window.escapeHtml(currentName)}" required></div>
      <div class="form-group"><label>Руководитель сборов</label><input type="text" id="editHeadTeacher" value="${window.escapeHtml(currentHead)}"></div>
      <div class="form-actions"><button type="button" class="btn cancel">Отмена</button><button type="submit" class="btn add">Сохранить</button></div>
    </form></div></div>`;
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
      if (window.currentCollectionIdForSchools) await loadSchoolsAndRender(window.currentCollectionIdForSchools);
      window.loadCollections();
    } catch (err) { alert('Ошибка редактирования: ' + err.message); }
  });
};