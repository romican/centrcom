import { 
  barracks_currentCollectionId, barracks_currentBarracksId, barracks_currentLocationId,
  barracks_allBarracks, barracks_locations, barracks_assignedSchools, barracks_unassignedSchools,
  setCurrentCollectionId, setCurrentBarracksId, setCurrentLocationId,
  setAllBarracks, setLocations, setAssignedSchools, setUnassignedSchools
} from './state.js';
import * as api from './api.js';

function getAutoSelectCollectionId(collections) {
  if (!collections.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const current = collections.find(c => c.date_start <= today && c.date_end >= today);
  if (current) return current.id;
  return collections[0].id;
}

// Универсальная модалка для редактирования
function openEditModal(title, currentValue, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px;">
      <div class="modal-header"><h2>${title}</h2><button class="close-modal">&times;</button></div>
      <div style="padding:16px 24px;">
        <div class="form-group"><label>Название</label><input type="text" id="editInput" value="${window.escapeHtml(currentValue)}" style="width:100%; padding:10px; border-radius:12px; border:1px solid #ccc;"></div>
        <div class="form-actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;"><button class="btn cancel">Отмена</button><button class="btn add">Сохранить</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
  modal.querySelector('.btn.add').addEventListener('click', () => {
    const newValue = modal.querySelector('#editInput').value.trim();
    if (newValue) onSave(newValue);
    closeModal();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modal.style.display = 'flex';
}

export async function renderBarracksSection() {
  const container = document.getElementById('contentBody');
  container.innerHTML = `
    <div class="barracks-container">
      <div class="barracks-sidebar">
        <div class="select-collection"><label>Выберите сбор:</label><select id="barracksCollectionSelect" class="barracks-collection-select"></select></div>
        <div class="barracks-header"><h3>Казармы</h3><button class="add-barrack-btn" id="addBarrackBtn"><i class="fas fa-plus"></i> Добавить казарму</button></div>
        <ul class="barracks-list" id="barracksList"></ul>
      </div>
      <div class="barracks-main">
        <div class="barrack-title"><h2 id="barrackTitle">Выберите казарму</h2></div>
        <div id="locationsPanel" style="display: none;">
          <div class="locations-header"><h3>Расположения (этажи)</h3><button class="add-location-btn" id="addLocationBtn"><i class="fas fa-plus"></i> Добавить расположение</button></div>
          <ul class="locations-list" id="locationsList"></ul>
        </div>
        <div id="schoolsPanel" style="display: none;">
          <div class="schools-header"><h3>Школы в расположении</h3></div>
          <div class="schools-columns">
            <div class="assigned-schools"><h4><i class="fas fa-check-circle" style="color:#10b981;"></i> Привязанные школы</h4><ul class="schools-list" id="assignedSchoolsList"></ul></div>
            <div class="unassigned-schools"><h4><i class="fas fa-plus-circle" style="color:#3b82f6;"></i> Доступные школы</h4><ul class="schools-list" id="unassignedSchoolsList"></ul></div>
          </div>
        </div>
      </div>
      <div class="barracks-info-panel"><h3><i class="fas fa-info-circle"></i> Расстановка по казармам</h3><div id="infoPanelContent">Выберите сбор</div></div>
    </div>
  `;
  await initBarracks();
}

async function initBarracks() {
  await loadCollections();
  await loadBarracksForCurrentCollection();
  initBarracksHandlers();
}

async function loadCollections() {
  const collections = await api.fetchCollections();
  const select = document.getElementById('barracksCollectionSelect');
  if (!collections.length) { select.innerHTML = '<option>-- Нет сборов --</option>'; return; }
  select.innerHTML = '<option value="">-- Выберите сбор --</option>' + collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  const autoId = getAutoSelectCollectionId(collections);
  if (autoId) {
    select.value = autoId;
    setCurrentCollectionId(autoId);
    // Явно загружаем казармы и выбираем первую казарму и этаж
    await loadBarracksForCurrentCollection();
    if (barracks_allBarracks.length) {
      await selectBarrack(barracks_allBarracks[0].id);
    } else {
      document.getElementById('barrackTitle').innerText = 'Выберите казарму';
      document.getElementById('locationsPanel').style.display = 'none';
      document.getElementById('schoolsPanel').style.display = 'none';
    }
    await updateInfoPanel();
  }
  select.addEventListener('change', async (e) => {
    setCurrentCollectionId(e.target.value);
    setCurrentBarracksId(null); setCurrentLocationId(null);
    await loadBarracksForCurrentCollection();
    if (barracks_allBarracks.length) await selectBarrack(barracks_allBarracks[0].id);
    else { document.getElementById('barrackTitle').innerText = 'Выберите казарму'; document.getElementById('locationsPanel').style.display = 'none'; document.getElementById('schoolsPanel').style.display = 'none'; }
    await updateInfoPanel();
  });
}

async function loadBarracksForCurrentCollection() {
  if (!barracks_currentCollectionId) return;
  const barracks = await api.fetchBarracks(barracks_currentCollectionId);
  setAllBarracks(barracks);
  renderBarracksList(barracks);
  await updateInfoPanel();
}

function renderBarracksList(barracks) {
  const list = document.getElementById('barracksList');
  if (!list) return;
  list.innerHTML = barracks.map(b => `<li class="barrack-item ${barracks_currentBarracksId === b.id ? 'active' : ''}" data-id="${b.id}"><span class="barrack-name">${window.escapeHtml(b.name)}</span><div class="barrack-actions"><button class="edit-barrack" data-id="${b.id}"><i class="fas fa-edit"></i></button><button class="delete-barrack" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button></div></li>`).join('');
  attachBarrackEvents();
}

function attachBarrackEvents() {
  document.querySelectorAll('.barrack-item').forEach(item => { item.removeEventListener('click', handleBarrackClick); item.addEventListener('click', handleBarrackClick); });
  document.querySelectorAll('.edit-barrack').forEach(btn => { btn.removeEventListener('click', handleEditBarrack); btn.addEventListener('click', handleEditBarrack); });
  document.querySelectorAll('.delete-barrack').forEach(btn => { btn.removeEventListener('click', handleDeleteBarrack); btn.addEventListener('click', handleDeleteBarrack); });
}

async function handleBarrackClick(e) {
  if (e.target.closest('.edit-barrack') || e.target.closest('.delete-barrack')) return;
  const id = parseInt(e.currentTarget.dataset.id);
  await selectBarrack(id);
}

async function handleEditBarrack(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  const barrack = barracks_allBarracks.find(b => b.id == id);
  if (!barrack) return;
  openEditModal('Редактировать казарму', barrack.name, async (newName) => {
    await api.updateBarrack(id, newName);
    await loadBarracksForCurrentCollection();
    if (barracks_currentBarracksId === parseInt(id)) await selectBarrack(id);
    await updateInfoPanel();
  });
}

async function handleDeleteBarrack(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (confirm('Удалить казарму? Все расположения и привязки школ будут удалены.')) {
    await api.deleteBarrack(id);
    if (barracks_currentBarracksId === parseInt(id)) { setCurrentBarracksId(null); setCurrentLocationId(null); document.getElementById('barrackTitle').innerText = 'Выберите казарму'; document.getElementById('locationsPanel').style.display = 'none'; document.getElementById('schoolsPanel').style.display = 'none'; }
    await loadBarracksForCurrentCollection();
    if (barracks_allBarracks.length) await selectBarrack(barracks_allBarracks[0].id);
    await updateInfoPanel();
  }
}

async function selectBarrack(barrackId) {
  setCurrentBarracksId(barrackId);
  renderBarracksList(barracks_allBarracks);
  const found = barracks_allBarracks.find(b => b.id === barrackId);
  document.getElementById('barrackTitle').innerText = found?.name || 'Казарма';
  document.getElementById('locationsPanel').style.display = 'block';
  const locations = await api.fetchLocations(barrackId);
  setLocations(locations);
  renderLocationsList(locations);
  if (locations.length) {
    const firstLocation = locations[0];
    setCurrentLocationId(firstLocation.id);
    renderLocationsList(locations);
    await selectLocation(firstLocation.id);
  } else {
    setCurrentLocationId(null);
    document.getElementById('schoolsPanel').style.display = 'none';
  }
}

function renderLocationsList(locations) {
  const list = document.getElementById('locationsList');
  list.innerHTML = locations.map(loc => `<li class="location-item ${barracks_currentLocationId === loc.id ? 'active' : ''}" data-id="${loc.id}"><span class="location-name">${window.escapeHtml(loc.name)}</span><div class="location-actions"><button class="edit-location" data-id="${loc.id}"><i class="fas fa-edit"></i></button><button class="delete-location" data-id="${loc.id}"><i class="fas fa-trash-alt"></i></button></div></li>`).join('');
  attachLocationEvents();
}

function attachLocationEvents() {
  document.querySelectorAll('.location-item').forEach(item => { item.removeEventListener('click', handleLocationClick); item.addEventListener('click', handleLocationClick); });
  document.querySelectorAll('.edit-location').forEach(btn => { btn.removeEventListener('click', handleEditLocation); btn.addEventListener('click', handleEditLocation); });
  document.querySelectorAll('.delete-location').forEach(btn => { btn.removeEventListener('click', handleDeleteLocation); btn.addEventListener('click', handleDeleteLocation); });
}

async function handleLocationClick(e) {
  if (e.target.closest('.edit-location') || e.target.closest('.delete-location')) return;
  const id = parseInt(e.currentTarget.dataset.id);
  await selectLocation(id);
}

async function handleEditLocation(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  const location = barracks_locations.find(l => l.id == id);
  if (!location) return;
  openEditModal('Редактировать расположение', location.name, async (newName) => {
    await api.updateLocation(id, newName);
    await selectBarrack(barracks_currentBarracksId);
    await updateInfoPanel();
  });
}

async function handleDeleteLocation(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (confirm('Удалить расположение? Привязки школ будут удалены.')) {
    await api.deleteLocation(id);
    if (barracks_currentLocationId === parseInt(id)) { setCurrentLocationId(null); document.getElementById('schoolsPanel').style.display = 'none'; }
    await selectBarrack(barracks_currentBarracksId);
    await updateInfoPanel();
  }
}

async function selectLocation(locationId) {
  setCurrentLocationId(locationId);
  renderLocationsList(barracks_locations);
  document.getElementById('schoolsPanel').style.display = 'block';
  await refreshSchoolsForCurrentLocation();
  await updateInfoPanel();
}

async function refreshSchoolsForCurrentLocation() {
  if (!barracks_currentCollectionId) { alert('Выберите сбор'); return; }
  const assigned = await api.fetchAssignedSchools(barracks_currentLocationId, barracks_currentCollectionId);
  const unassigned = await api.fetchUnassignedSchools(barracks_currentLocationId, barracks_currentCollectionId);
  setAssignedSchools(assigned); setUnassignedSchools(unassigned);
  renderSchoolsLists();
}

function renderSchoolsLists() {
  const assignedList = document.getElementById('assignedSchoolsList');
  const unassignedList = document.getElementById('unassignedSchoolsList');
  assignedList.innerHTML = barracks_assignedSchools.map(s => `<li><span><i class="fas fa-check-circle" style="color:#10b981; margin-right:8px;"></i> ${window.escapeHtml(s.edu_org)} <span style="color:#64748b;">(${s.people_count || 0} чел.)</span></span><button class="unassign-school" data-school-id="${s.id}" title="Отвязать школу"><i class="fas fa-times"></i></button></li>`).join('');
  unassignedList.innerHTML = barracks_unassignedSchools.map(s => `<li><span>${window.escapeHtml(s.edu_org)} <span style="color:#64748b;">(${s.people_count || 0} чел.)</span></span><button class="assign-school" data-school-id="${s.id}" title="Привязать школу"><i class="fas fa-plus"></i></button></li>`).join('');
  attachSchoolButtons();
}

function attachSchoolButtons() {
  document.querySelectorAll('.assign-school').forEach(btn => { btn.removeEventListener('click', handleAssign); btn.addEventListener('click', handleAssign); });
  document.querySelectorAll('.unassign-school').forEach(btn => { btn.removeEventListener('click', handleUnassign); btn.addEventListener('click', handleUnassign); });
}

async function handleAssign(e) {
  const schoolId = e.currentTarget.dataset.schoolId;
  await api.assignSchoolToLocation(barracks_currentLocationId, schoolId);
  await refreshSchoolsForCurrentLocation();
  await updateInfoPanel();
}

async function handleUnassign(e) {
  const schoolId = e.currentTarget.dataset.schoolId;
  await api.unassignSchoolFromLocation(barracks_currentLocationId, schoolId);
  await refreshSchoolsForCurrentLocation();
  await updateInfoPanel();
}

// Обновлённая информационная панель с подсчётом человек на этаже и красивыми иконками
async function updateInfoPanel() {
  const panel = document.getElementById('infoPanelContent');
  if (!barracks_currentCollectionId) {
    panel.innerHTML = '<div class="info-placeholder"><i class="fas fa-building"></i> Выберите сбор</div>';
    return;
  }
  const barracks = await api.fetchBarracks(barracks_currentCollectionId);
  if (!barracks.length) {
    panel.innerHTML = '<div class="info-placeholder"><i class="fas fa-folder-open"></i> Нет казарм в этом сборе</div>';
    return;
  }
  let html = '<div class="info-list">';
  for (const barrack of barracks) {
    const locations = await api.fetchLocations(barrack.id);
    html += `<div class="info-barrack-card"><div class="info-barrack-title"><i class="fas fa-warehouse"></i> ${window.escapeHtml(barrack.name)}</div>`;
    for (const loc of locations) {
      const assignedSchools = await api.fetchAssignedSchools(loc.id, barracks_currentCollectionId);
      let totalPeople = 0;
      assignedSchools.forEach(s => totalPeople += (s.people_count || 0));
      html += `<div class="info-location-card"><div class="info-location-title"><i class="fas fa-layer-group"></i> ${window.escapeHtml(loc.name)} <span class="info-total-people">(👥 ${totalPeople} чел.)</span></div>`;
      if (assignedSchools.length) {
        html += `<div class="info-schools-list">`;
        assignedSchools.forEach(school => {
          html += `<div class="info-school-item"><i class="fas fa-school"></i> <strong>${window.escapeHtml(school.edu_org)}</strong> <span class="school-count">${school.people_count || 0} чел.</span></div>`;
        });
        html += `</div>`;
      } else {
        html += `<div class="info-empty"><i class="fas fa-ban"></i> нет привязанных школ</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  panel.innerHTML = html;
}

export function initBarracksHandlers() {
  const addBarrackBtn = document.getElementById('addBarrackBtn');
  if (addBarrackBtn) {
    addBarrackBtn.onclick = async () => {
      if (!barracks_currentCollectionId) { alert('Сначала выберите сбор'); return; }
      const nextNum = barracks_allBarracks.length + 1;
      const name = `Казарма ${nextNum}`;
      await api.addBarrack(name, barracks_currentCollectionId);
      await loadBarracksForCurrentCollection();
      if (barracks_allBarracks.length) await selectBarrack(barracks_allBarracks[barracks_allBarracks.length - 1].id);
      await updateInfoPanel();
    };
  }
  const addLocationBtn = document.getElementById('addLocationBtn');
  if (addLocationBtn) {
    addLocationBtn.onclick = async () => {
      if (!barracks_currentBarracksId) { alert('Сначала выберите казарму'); return; }
      const nextNum = barracks_locations.length + 1;
      const name = `Этаж ${nextNum}`;
      await api.addLocation(barracks_currentBarracksId, name);
      await selectBarrack(barracks_currentBarracksId);
      await updateInfoPanel();
    };
  }
}