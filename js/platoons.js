// ========== РАЗДЕЛ ВЗВОДА ==========
let platoon_currentCollectionId = null;
let platoon_currentPlatoonId = null;
let platoon_platoons = [];
let platoon_allParticipants = [];
let autoDistributeModal = null; // глобальная ссылка на модалку

// Создаём модальное окно один раз при загрузке страницы
function createAutoDistributeModal() {
  if (document.getElementById('autoDistributeModal')) return;
  const modal = document.createElement('div');
  modal.id = 'autoDistributeModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 450px;">
      <div class="modal-header">
        <h2><i class="fas fa-magic"></i> Автоматическое распределение</h2>
        <button class="close-modal" id="closeAutoDistributeModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <div class="form-group">
          <label>Максимум человек во взводе:</label>
          <input type="number" id="maxPerPlatoon" value="31" min="1" step="1" required>
        </div>
        <div class="form-group">
          <label>Количество взводов (оставьте пустым для авто-расчёта):</label>
          <input type="number" id="targetPlatoonsCount" placeholder="Например, 5">
        </div>
        <div class="form-actions">
          <button type="button" class="btn cancel" id="cancelAutoDistributeBtn">Отмена</button>
          <button type="button" class="btn add" id="confirmAutoDistributeBtn">Распределить</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  autoDistributeModal = modal;

  // Обработчики закрытия
  const closeBtn = document.getElementById('closeAutoDistributeModalBtn');
  const cancelBtn = document.getElementById('cancelAutoDistributeBtn');
  const closeModal = () => { if (autoDistributeModal) autoDistributeModal.style.display = 'none'; };
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (autoDistributeModal) {
    autoDistributeModal.addEventListener('click', (e) => {
      if (e.target === autoDistributeModal) closeModal();
    });
  }
}
createAutoDistributeModal();

function renderPlatoonsSection() {
  window.contentBody.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'platoons-container';
  container.innerHTML = `
    <div class="platoons-sidebar">
      <div class="select-collection">
        <label>Выберите сбор:</label>
        <select id="collectionSelect" style="width:100%; padding:10px; border-radius:16px;"></select>
      </div>
      <h3>Взвода <button class="add-platoon-btn" id="addPlatoonBtn"><i class="fas fa-plus"></i> Добавить взвод</button></h3>
      <ul class="platoons-list" id="platoonsList"></ul>
    </div>
    <div class="platoons-main">
      <div class="platoon-title">
        <h2 id="platoonTitle">Выберите взвод</h2>
        <div class="platoon-actions">
          <button class="btn-auto-distribute" id="autoDistributeBtn"><i class="fas fa-magic"></i> Распределить автоматически</button>
          <button class="btn-add-to-platoon" id="addToPlatoonBtn" style="display:none;"><i class="fas fa-user-plus"></i> Добавить в взвод (<span id="selectedCountAdd">0</span>)</button>
          <button class="btn-remove-from-platoon" id="removeFromPlatoonBtn" style="display:none;"><i class="fas fa-user-minus"></i> Удалить из взвода (<span id="selectedCountRemove">0</span>)</button>
          <button class="btn-generate-doc" id="generatePlatoonDocBtn"><i class="fas fa-file-alt"></i> Сформировать документ</button>
        </div>
      </div>
      <div class="people-grid" id="peopleGrid">
        <div class="empty-message">Выберите сбор и взвод</div>
      </div>
    </div>
  `;
  window.contentBody.appendChild(container);

  // Загрузка списка сборов
  fetch('/api/collections')
    .then(res => res.json())
    .then(collections => {
      const select = document.getElementById('collectionSelect');
      if (!select) return;
      if (collections.length === 0) {
        select.innerHTML = '<option value="">-- Нет сборов, создайте в разделе "Сборы" --</option>';
        return;
      }
      select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
        collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
      select.addEventListener('change', (e) => {
        platoon_currentCollectionId = e.target.value;
        if (platoon_currentCollectionId) platoon_loadData();
        else platoon_clearUI();
      });
    })
    .catch(err => console.error(err));

  // Добавить взвод
  document.getElementById('addPlatoonBtn').addEventListener('click', () => {
    if (!platoon_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    const nextNumber = platoon_platoons.length + 1;
    const name = `ВЗВОД ${nextNumber}`;
    fetch(`/api/collections/${platoon_currentCollectionId}/platoons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
      .then(() => platoon_loadData())
      .catch(err => alert('Ошибка: ' + err.message));
  });

  // Автоматическое распределение
  document.getElementById('autoDistributeBtn').addEventListener('click', async () => {
    if (!platoon_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    if (!autoDistributeModal) {
      alert('Ошибка: модальное окно не создано');
      return;
    }
    autoDistributeModal.style.display = 'flex';
    // Убираем старый обработчик, чтобы не дублировать
    const confirmBtn = document.getElementById('confirmAutoDistributeBtn');
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const maxPerPlatoon = parseInt(document.getElementById('maxPerPlatoon').value) || 31;
        let targetPlatoonsCount = parseInt(document.getElementById('targetPlatoonsCount').value);
        if (isNaN(targetPlatoonsCount)) targetPlatoonsCount = null;
        if (maxPerPlatoon < 1) {
          alert('Максимум человек во взводе должен быть не менее 1');
          return;
        }
        autoDistributeModal.style.display = 'none';
        try {
          const response = await fetch(`/api/collections/${platoon_currentCollectionId}/auto-distribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxPerPlatoon, targetPlatoonsCount })
          });
          if (!response.ok) throw new Error('Ошибка сервера');
          const data = await response.json();
          alert(data.message);
          await platoon_loadData();
        } catch (err) {
          alert('Ошибка: ' + err.message);
        }
      };
    }
  });

  // Сформировать документ по взводу
  document.getElementById('generatePlatoonDocBtn').addEventListener('click', () => {
    if (platoon_currentPlatoonId) platoon_generateDocument(platoon_currentPlatoonId);
  });

  // Добавить выбранных в взвод
  document.getElementById('addToPlatoonBtn').addEventListener('click', async () => {
    const selectedIds = platoon_getSelectedIds('.person-checkbox:checked', 'unassigned-list');
    if (selectedIds.length === 0) return;
    if (!platoon_currentPlatoonId) return alert('Выберите взвод');
    try {
      await fetch('/api/people/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIds: selectedIds, platoonId: platoon_currentPlatoonId })
      });
      await platoon_loadData();
    } catch (err) {
      alert('Ошибка добавления: ' + err.message);
    }
  });

  // Удалить выбранных из взвода
  document.getElementById('removeFromPlatoonBtn').addEventListener('click', async () => {
    const selectedIds = platoon_getSelectedIds('.person-checkbox:checked', 'platoon-list');
    if (selectedIds.length === 0) return;
    try {
      await fetch('/api/people/bulk-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIds: selectedIds })
      });
      await platoon_loadData();
    } catch (err) {
      alert('Ошибка удаления: ' + err.message);
    }
  });
}

function platoon_getSelectedIds(selector, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const checkboxes = container.querySelectorAll(selector);
  return Array.from(checkboxes).map(cb => cb.getAttribute('data-person-id'));
}

function platoon_updateSelectedCounts() {
  const unassignedSelected = platoon_getSelectedIds('.person-checkbox:checked', 'unassigned-list').length;
  const platoonSelected = platoon_getSelectedIds('.person-checkbox:checked', 'platoon-list').length;
  const addBtn = document.getElementById('addToPlatoonBtn');
  const removeBtn = document.getElementById('removeFromPlatoonBtn');
  if (addBtn) {
    addBtn.style.display = unassignedSelected > 0 ? 'inline-flex' : 'none';
    document.getElementById('selectedCountAdd').innerText = unassignedSelected;
  }
  if (removeBtn) {
    removeBtn.style.display = platoonSelected > 0 ? 'inline-flex' : 'none';
    document.getElementById('selectedCountRemove').innerText = platoonSelected;
  }
}

function platoon_clearUI() {
  document.getElementById('platoonsList').innerHTML = '';
  document.getElementById('platoonTitle').innerText = 'Выберите взвод';
  document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Выберите сбор</div>';
  document.getElementById('addToPlatoonBtn').style.display = 'none';
  document.getElementById('removeFromPlatoonBtn').style.display = 'none';
}

async function platoon_loadData() {
  if (!platoon_currentCollectionId) return;
  try {
    const [platoonsRes, participantsRes] = await Promise.all([
      fetch(`/api/collections/${platoon_currentCollectionId}/platoons`),
      fetch(`/api/collections/${platoon_currentCollectionId}/participants`)
    ]);
    if (!platoonsRes.ok || !participantsRes.ok) throw new Error('Ошибка загрузки');
    platoon_platoons = await platoonsRes.json();
    platoon_allParticipants = await participantsRes.json();

    platoon_renderPlatoonsList();
    if (platoon_currentPlatoonId && platoon_platoons.find(p => p.id == platoon_currentPlatoonId)) {
      platoon_renderDetail(platoon_currentPlatoonId);
    } else if (platoon_platoons.length) {
      platoon_currentPlatoonId = platoon_platoons[0].id;
      platoon_renderDetail(platoon_currentPlatoonId);
    } else {
      platoon_currentPlatoonId = null;
      document.getElementById('platoonTitle').innerText = 'Нет взводов';
      document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Создайте взвод кнопкой выше</div>';
      document.getElementById('generatePlatoonDocBtn').style.display = 'inline-block';
      document.getElementById('addToPlatoonBtn').style.display = 'none';
      document.getElementById('removeFromPlatoonBtn').style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Ошибка загрузки</div>';
  }
}

// Сортировка взводов по числовому порядку
function sortPlatoonsByNumber(platoons) {
  return platoons.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name, 'ru');
  });
}

function platoon_renderPlatoonsList() {
  const list = document.getElementById('platoonsList');
  if (!list) return;
  const sortedPlatoons = sortPlatoonsByNumber([...platoon_platoons]);
  const platoonsWithCount = sortedPlatoons.map(p => ({
    ...p,
    count: platoon_allParticipants.filter(m => m.platoon_id === p.id).length
  }));
  list.innerHTML = platoonsWithCount.map(p => `
    <li class="platoon-item ${platoon_currentPlatoonId == p.id ? 'active' : ''}" data-id="${p.id}">
      <span class="platoon-name">${window.escapeHtml(p.name)}</span>
      <span class="platoon-count">(${p.count} чел.)</span>
      <div class="platoon-actions">
        <button class="edit-platoon" data-id="${p.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-platoon" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    </li>
  `).join('');
  // обработчики кликов
  document.querySelectorAll('.platoon-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.edit-platoon') || e.target.closest('.delete-platoon')) return;
      const id = el.getAttribute('data-id');
      platoon_currentPlatoonId = parseInt(id);
      platoon_renderPlatoonsList();
      platoon_renderDetail(platoon_currentPlatoonId);
    });
    const editBtn = el.querySelector('.edit-platoon');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = editBtn.getAttribute('data-id');
        platoon_editPlatoonName(id);
      });
    }
    const delBtn = el.querySelector('.delete-platoon');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = delBtn.getAttribute('data-id');
        if (confirm('Удалить взвод? Участники останутся без взвода.')) {
          fetch(`/api/platoons/${id}`, { method: 'DELETE' })
            .then(() => platoon_loadData());
        }
      });
    }
  });
}

function platoon_editPlatoonName(platoonId) {
  const platoon = platoon_platoons.find(p => p.id == platoonId);
  if (!platoon) return;
  const newName = prompt('Введите новое название взвода:', platoon.name);
  if (newName && newName.trim()) {
    fetch(`/api/platoons/${platoonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    })
      .then(() => platoon_loadData())
      .catch(err => alert('Ошибка: ' + err.message));
  }
}

// Сортировка участников по школе и ФИО
function sortBySchoolAndName(participants) {
  return [...participants].sort((a, b) => {
    const schoolCompare = (a.school_name || a.organization || '').localeCompare(b.school_name || b.organization || '', 'ru');
    if (schoolCompare !== 0) return schoolCompare;
    return (a.full_name || '').localeCompare(b.full_name || '', 'ru');
  });
}

function platoon_renderDetail(platoonId) {
  const platoon = platoon_platoons.find(p => p.id == platoonId);
  if (!platoon) return;
  document.getElementById('platoonTitle').innerText = platoon.name;
  document.getElementById('generatePlatoonDocBtn').style.display = 'inline-block';

  const members = sortBySchoolAndName(platoon_allParticipants.filter(p => p.platoon_id === platoonId));
  const unassigned = sortBySchoolAndName(platoon_allParticipants.filter(p => !p.platoon_id));

  const grid = document.getElementById('peopleGrid');
  grid.innerHTML = `
    <div class="people-list-container">
      <div class="list-header">
        <label class="select-all-label">
          <input type="checkbox" id="selectAllPlatoon" class="select-all-checkbox"> Выбрать всех
        </label>
        <h4>Участники взвода (${members.length})</h4>
      </div>
      <ul class="people-list" id="platoon-list">
        ${members.map(m => `
          <li data-person-id="${m.id}">
            <input type="checkbox" class="person-checkbox" data-person-id="${m.id}">
            <span class="person-name">${window.escapeHtml(m.full_name)}</span>
            <span class="person-school">${window.escapeHtml(m.school_name || m.organization)}</span>
            <span class="person-platoon">${window.escapeHtml(platoon.name)}</span>
          </li>
        `).join('')}
      </ul>
      <div class="list-header">
        <label class="select-all-label">
          <input type="checkbox" id="selectAllUnassigned" class="select-all-checkbox"> Выбрать всех
        </label>
        <h4 style="margin-top:24px;">Не распределены (${unassigned.length})</h4>
      </div>
      <ul class="people-list" id="unassigned-list">
        ${unassigned.map(m => `
          <li data-person-id="${m.id}">
            <input type="checkbox" class="person-checkbox" data-person-id="${m.id}">
            <span class="person-name">${window.escapeHtml(m.full_name)}</span>
            <span class="person-school">${window.escapeHtml(m.school_name || m.organization)}</span>
            <span class="person-platoon">Не распределен</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  const selectAllPlatoon = document.getElementById('selectAllPlatoon');
  const selectAllUnassigned = document.getElementById('selectAllUnassigned');
  const platoonList = document.getElementById('platoon-list');
  const unassignedList = document.getElementById('unassigned-list');

  if (selectAllPlatoon) {
    selectAllPlatoon.addEventListener('change', (e) => {
      const checkboxes = platoonList.querySelectorAll('.person-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      platoon_updateSelectedCounts();
    });
  }
  if (selectAllUnassigned) {
    selectAllUnassigned.addEventListener('change', (e) => {
      const checkboxes = unassignedList.querySelectorAll('.person-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      platoon_updateSelectedCounts();
    });
  }

  document.querySelectorAll('.person-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (selectAllPlatoon) {
        const allPlatoonCb = platoonList.querySelectorAll('.person-checkbox');
        const allPlatoonChecked = Array.from(allPlatoonCb).every(c => c.checked);
        selectAllPlatoon.checked = allPlatoonCb.length > 0 && allPlatoonChecked;
      }
      if (selectAllUnassigned) {
        const allUnassignedCb = unassignedList.querySelectorAll('.person-checkbox');
        const allUnassignedChecked = Array.from(allUnassignedCb).every(c => c.checked);
        selectAllUnassigned.checked = allUnassignedCb.length > 0 && allUnassignedChecked;
      }
      platoon_updateSelectedCounts();
    });
  });
  platoon_updateSelectedCounts();
}

async function platoon_generateDocument(platoonId) {
  try {
    const response = await fetch('/api/generate-platoon-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platoonId })
    });
    if (!response.ok) throw new Error('Ошибка генерации');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platoon_${platoonId}_${Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

window.renderPlatoons = renderPlatoonsSection;