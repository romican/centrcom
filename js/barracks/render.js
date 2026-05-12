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

export async function renderBarracksSection() {
  const container = document.getElementById('contentBody');
  container.innerHTML = `
    <div class="barracks-container">
      <div class="barracks-sidebar">
        <div class="select-collection">
          <label>Выберите сбор:</label>
          <select id="barracksCollectionSelect" class="barracks-collection-select"></select>
        </div>
        <div class="barracks-header">
          <h3>Казармы</h3>
          <button class="add-barrack-btn" id="addBarrackBtn"><i class="fas fa-plus"></i> Добавить казарму</button>
        </div>
        <ul class="barracks-list" id="barracksList"></ul>
      </div>
      <div class="barracks-main">
        <div class="barrack-title">
          <h2 id="barrackTitle">Выберите казарму</h2>
        </div>
        <div id="locationsPanel" style="display: none;">
          <div class="locations-header">
            <h3>Расположения (этажи)</h3>
            <button class="add-location-btn" id="addLocationBtn"><i class="fas fa-plus"></i> Добавить расположение</button>
          </div>
          <ul class="locations-list" id="locationsList"></ul>
        </div>
        <div id="schoolsPanel" style="display: none;">
          <div class="schools-header">
            <h3>Школы в расположении</h3>
          </div>
          <div class="schools-columns">
            <div class="assigned-schools">
              <h4>Привязанные школы</h4>
              <ul class="schools-list" id="assignedSchoolsList"></ul>
            </div>
            <div class="unassigned-schools">
              <h4>Доступные школы</h4>
              <ul class="schools-list" id="unassignedSchoolsList"></ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  await loadCollections();
  await loadBarracks();
  initBarracksHandlers();
}

async function loadCollections() {
  const collections = await api.fetchCollections();
  const select = document.getElementById('barracksCollectionSelect');
  if (!collections.length) {
    select.innerHTML = '<option>-- Нет сборов --</option>';
    return;
  }
  select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  const autoId = getAutoSelectCollectionId(collections);
  if (autoId) {
    select.value = autoId;
    setCurrentCollectionId(autoId);
  }
  select.addEventListener('change', async (e) => {
    setCurrentCollectionId(e.target.value);
    if (barracks_currentLocationId) await refreshSchoolsForCurrentLocation();
  });
}

async function loadBarracks() {
  const barracks = await api.fetchBarracks();
  setAllBarracks(barracks);
  renderBarracksList(barracks);
}

function renderBarracksList(barracks) {
  const list = document.getElementById('barracksList');
  if (!list) return;
  list.innerHTML = barracks.map(b => `
    <li class="barrack-item ${barracks_currentBarracksId === b.id ? 'active' : ''}" data-id="${b.id}">
      <span class="barrack-name">${window.escapeHtml(b.name)}</span>
      <div class="barrack-actions">
        <button class="edit-barrack" data-id="${b.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-barrack" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    </li>
  `).join('');
  attachBarrackEvents();
}

function attachBarrackEvents() {
  document.querySelectorAll('.barrack-item').forEach(item => {
    item.removeEventListener('click', handleBarrackClick);
    item.addEventListener('click', handleBarrackClick);
  });
  document.querySelectorAll('.edit-barrack').forEach(btn => {
    btn.removeEventListener('click', handleEditBarrack);
    btn.addEventListener('click', handleEditBarrack);
  });
  document.querySelectorAll('.delete-barrack').forEach(btn => {
    btn.removeEventListener('click', handleDeleteBarrack);
    btn.addEventListener('click', handleDeleteBarrack);
  });
}

async function handleBarrackClick(e) {
  if (e.target.closest('.edit-barrack') || e.target.closest('.delete-barrack')) return;
  const id = parseInt(e.currentTarget.dataset.id);
  await selectBarrack(id);
}

async function handleEditBarrack(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  const name = prompt('Введите новое название казармы');
  if (name && name.trim()) {
    await api.updateBarrack(id, name.trim());
    await loadBarracks();
    if (barracks_currentBarracksId === parseInt(id)) await selectBarrack(id);
  }
}

async function handleDeleteBarrack(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (confirm('Удалить казарму? Все расположения и привязки школ будут удалены.')) {
    await api.deleteBarrack(id);
    if (barracks_currentBarracksId === parseInt(id)) {
      setCurrentBarracksId(null);
      document.getElementById('barrackTitle').innerText = 'Выберите казарму';
      document.getElementById('locationsPanel').style.display = 'none';
      document.getElementById('schoolsPanel').style.display = 'none';
    }
    await loadBarracks();
    if (barracks_currentBarracksId) await selectBarrack(barracks_currentBarracksId);
  }
}

async function selectBarrack(barrackId) {
  setCurrentBarracksId(barrackId);
  renderBarracksList(barracks_allBarracks); // перерисовываем список казарм (обновляем активный класс)
  const found = barracks_allBarracks.find(b => b.id === barrackId);
  document.getElementById('barrackTitle').innerText = found?.name || 'Казарма';
  document.getElementById('locationsPanel').style.display = 'block';
  const locations = await api.fetchLocations(barrackId);
  setLocations(locations);
  renderLocationsList(locations);
}

function renderLocationsList(locations) {
  const list = document.getElementById('locationsList');
  list.innerHTML = locations.map(loc => `
    <li class="location-item ${barracks_currentLocationId === loc.id ? 'active' : ''}" data-id="${loc.id}">
      <span class="location-name">${window.escapeHtml(loc.name)}</span>
      <div class="location-actions">
        <button class="edit-location" data-id="${loc.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-location" data-id="${loc.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    </li>
  `).join('');
  attachLocationEvents();
}

function attachLocationEvents() {
  document.querySelectorAll('.location-item').forEach(item => {
    item.removeEventListener('click', handleLocationClick);
    item.addEventListener('click', handleLocationClick);
  });
  document.querySelectorAll('.edit-location').forEach(btn => {
    btn.removeEventListener('click', handleEditLocation);
    btn.addEventListener('click', handleEditLocation);
  });
  document.querySelectorAll('.delete-location').forEach(btn => {
    btn.removeEventListener('click', handleDeleteLocation);
    btn.addEventListener('click', handleDeleteLocation);
  });
}

async function handleLocationClick(e) {
  if (e.target.closest('.edit-location') || e.target.closest('.delete-location')) return;
  const id = parseInt(e.currentTarget.dataset.id);
  await selectLocation(id);
}

async function handleEditLocation(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  const name = prompt('Введите новое название расположения');
  if (name && name.trim()) {
    await api.updateLocation(id, name.trim());
    await selectBarrack(barracks_currentBarracksId);
  }
}

async function handleDeleteLocation(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (confirm('Удалить расположение? Привязки школ будут удалены.')) {
    await api.deleteLocation(id);
    if (barracks_currentLocationId === parseInt(id)) {
      setCurrentLocationId(null);
      document.getElementById('schoolsPanel').style.display = 'none';
    }
    await selectBarrack(barracks_currentBarracksId);
  }
}

async function selectLocation(locationId) {
  setCurrentLocationId(locationId);
  renderLocationsList(barracks_locations); // перерисовываем список расположений (обновляем активный класс)
  document.getElementById('schoolsPanel').style.display = 'block';
  await refreshSchoolsForCurrentLocation();
}

async function refreshSchoolsForCurrentLocation() {
  if (!barracks_currentCollectionId) {
    alert('Выберите сбор');
    return;
  }
  const assigned = await api.fetchAssignedSchools(barracks_currentLocationId, barracks_currentCollectionId);
  const unassigned = await api.fetchUnassignedSchools(barracks_currentLocationId, barracks_currentCollectionId);
  setAssignedSchools(assigned);
  setUnassignedSchools(unassigned);
  renderSchoolsLists();
}

function renderSchoolsLists() {
  const assignedList = document.getElementById('assignedSchoolsList');
  const unassignedList = document.getElementById('unassignedSchoolsList');
  
  assignedList.innerHTML = barracks_assignedSchools.map(s => `
    <li>
      <span>${window.escapeHtml(s.edu_org)}</span>
      <button class="unassign-school" data-school-id="${s.id}" title="Отвязать школу">
        <i class="fas fa-times"></i>
      </button>
    </li>
  `).join('');
  
  unassignedList.innerHTML = barracks_unassignedSchools.map(s => `
    <li>
      <span>${window.escapeHtml(s.edu_org)}</span>
      <button class="assign-school" data-school-id="${s.id}" title="Привязать школу">
        <i class="fas fa-plus"></i>
      </button>
    </li>
  `).join('');
  
  attachSchoolButtons();
}

function attachSchoolButtons() {
  document.querySelectorAll('.assign-school').forEach(btn => {
    btn.removeEventListener('click', handleAssign);
    btn.addEventListener('click', handleAssign);
  });
  document.querySelectorAll('.unassign-school').forEach(btn => {
    btn.removeEventListener('click', handleUnassign);
    btn.addEventListener('click', handleUnassign);
  });
}

async function handleAssign(e) {
  const schoolId = e.currentTarget.dataset.schoolId;
  await api.assignSchoolToLocation(barracks_currentLocationId, schoolId);
  await refreshSchoolsForCurrentLocation();
}

async function handleUnassign(e) {
  const schoolId = e.currentTarget.dataset.schoolId;
  await api.unassignSchoolFromLocation(barracks_currentLocationId, schoolId);
  await refreshSchoolsForCurrentLocation();
}

export function initBarracksHandlers() {
  const addBarrackBtn = document.getElementById('addBarrackBtn');
  if (addBarrackBtn) {
    addBarrackBtn.onclick = async () => {
      const name = prompt('Введите название казармы');
      if (name && name.trim()) {
        await api.addBarrack(name.trim());
        await loadBarracks();
      }
    };
  }
  const addLocationBtn = document.getElementById('addLocationBtn');
  if (addLocationBtn) {
    addLocationBtn.onclick = async () => {
      if (!barracks_currentBarracksId) {
        alert('Сначала выберите казарму');
        return;
      }
      const name = prompt('Введите название расположения (например, "Этаж 1")');
      if (name && name.trim()) {
        await api.addLocation(barracks_currentBarracksId, name.trim());
        await selectBarrack(barracks_currentBarracksId);
      }
    };
  }
}