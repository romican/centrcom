function renderPlatoonDetail(platoonId) {
  const platoon = window.platoon_platoons.find(p => p.id == platoonId);
  if (!platoon) return;
  document.getElementById('platoonTitle').innerText = platoon.name;
  document.getElementById('generatePlatoonDocBtn').style.display = 'inline-block';

  const members = window.platoonsHelpers.sortBySchoolAndName((window.platoon_allParticipants || []).filter(p => p.platoon_id === platoonId));
  const unassigned = window.platoonsHelpers.sortBySchoolAndName((window.platoon_allParticipants || []).filter(p => !p.platoon_id));

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

  initDragAndDrop(platoonId);
  initCheckboxEvents();
  updateSelectedCounts();
}

function initDragAndDrop(platoonId) {
  const platoonList = document.getElementById('platoon-list');
  const unassignedList = document.getElementById('unassigned-list');
  if (platoonList && unassignedList && typeof Sortable !== 'undefined') {
    new Sortable(platoonList, {
      group: { name: 'participants', pull: true, revertClone: false },
      animation: 150,
      onEnd: (evt) => {
        const personId = evt.item.getAttribute('data-person-id');
        const targetPlatoonId = evt.to.id === 'platoon-list' ? platoonId : null;
        updatePersonPlatoon(personId, targetPlatoonId);
      }
    });
    new Sortable(unassignedList, {
      group: { name: 'participants', pull: true, revertClone: false },
      animation: 150,
      onEnd: (evt) => {
        const personId = evt.item.getAttribute('data-person-id');
        const targetPlatoonId = evt.to.id === 'platoon-list' ? platoonId : null;
        updatePersonPlatoon(personId, targetPlatoonId);
      }
    });
  }
}

function initCheckboxEvents() {
  const selectAllPlatoon = document.getElementById('selectAllPlatoon');
  const selectAllUnassigned = document.getElementById('selectAllUnassigned');
  const platoonList = document.getElementById('platoon-list');
  const unassignedList = document.getElementById('unassigned-list');

  if (selectAllPlatoon) {
    selectAllPlatoon.addEventListener('change', (e) => {
      const checkboxes = platoonList.querySelectorAll('.person-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateSelectedCounts();
    });
  }
  if (selectAllUnassigned) {
    selectAllUnassigned.addEventListener('change', (e) => {
      const checkboxes = unassignedList.querySelectorAll('.person-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateSelectedCounts();
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
      updateSelectedCounts();
    });
  });
}

function updateSelectedCounts() {
  const unassignedSelected = document.querySelectorAll('#unassigned-list .person-checkbox:checked').length;
  const platoonSelected = document.querySelectorAll('#platoon-list .person-checkbox:checked').length;
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

async function updatePersonPlatoon(personId, newPlatoonId) {
  try {
    await fetch(`/api/people/${personId}/platoon`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platoon_id: newPlatoonId })
    });
    if (window.platoon_loadData) window.platoon_loadData();
  } catch (err) { alert('Ошибка обновления взвода: ' + err.message); }
}

async function bulkAddToPlatoon() {
  const selectedIds = Array.from(document.querySelectorAll('#unassigned-list .person-checkbox:checked')).map(cb => cb.getAttribute('data-person-id'));
  if (selectedIds.length === 0) return;
  if (!window.platoon_currentPlatoonId) return alert('Выберите взвод');
  try {
    await fetch('/api/people/bulk-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds: selectedIds, platoonId: window.platoon_currentPlatoonId })
    });
    if (window.platoon_loadData) window.platoon_loadData();
  } catch (err) { alert('Ошибка добавления: ' + err.message); }
}

async function bulkRemoveFromPlatoon() {
  const selectedIds = Array.from(document.querySelectorAll('#platoon-list .person-checkbox:checked')).map(cb => cb.getAttribute('data-person-id'));
  if (selectedIds.length === 0) return;
  try {
    await fetch('/api/people/bulk-remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds: selectedIds })
    });
    if (window.platoon_loadData) window.platoon_loadData();
  } catch (err) { alert('Ошибка удаления: ' + err.message); }
}

window.renderPlatoonDetail = renderPlatoonDetail;
window.updateSelectedCounts = updateSelectedCounts;
window.bulkAddToPlatoon = bulkAddToPlatoon;
window.bulkRemoveFromPlatoon = bulkRemoveFromPlatoon;