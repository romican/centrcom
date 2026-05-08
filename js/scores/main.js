import { 
  setCollectionId, setSchoolId, setPlatoonId, setSubjectId, setSearchTerm, setSchoolName, setSubjectName,
  scores_currentCollectionId, scores_currentSchoolId, scores_allSubjects
} from './state.js';
import { updatePlatoonButtonsState, updateSchoolButtonsState } from './helpers.js';
import { fetchCollections } from './api.js';
import { loadAllSubjects, loadSchools, loadStudentsByCurrentFilter, loadTopicsOrFinalForDisplay, loadPlatoonsBySchool, loadPlatoonsByCollection } from './loaders.js';
import { computeAndSaveFinalScores, attachBulkHandlers } from './handlers.js';
import { renderScoresTable } from './ui.js';

function getAutoSelectCollectionId(collections) {
  if (!collections.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const current = collections.find(c => c.date_start <= today && c.date_end >= today);
  if (current) return current.id;
  return collections[0].id;
}

async function schoolChangeHandler(e) {
  const id = e.target.value;
  if (id === 'all') {
    setSchoolId(null);
    setSchoolName('Все школы');
  } else if (id) {
    setSchoolId(parseInt(id));
    const resp = await fetch(`/api/collections/${scores_currentCollectionId}/schools`);
    const schools = await resp.json();
    const found = schools.find(s => s.id == id);
    setSchoolName(found ? found.edu_org : '');
  } else {
    setSchoolId(null);
    setSchoolName('');
  }
  setPlatoonId(null);
  setSubjectId('all');
  const subjectSelect = document.getElementById('scoresSubjectSelect');
  if (subjectSelect) subjectSelect.value = 'all';
  await loadPlatoons();
  await loadStudentsByCurrentFilter();
  await loadTopicsOrFinalForDisplay();
  updatePlatoonButtonsState();
  updateSchoolButtonsState();
}

async function platoonChangeHandler(e) {
  const val = e.target.value;
  if (!val) setPlatoonId(null);
  else setPlatoonId(parseInt(val));
  await loadStudentsByCurrentFilter();
  await loadTopicsOrFinalForDisplay();
  updatePlatoonButtonsState();
}

async function loadPlatoons() {
  const select = document.getElementById('scoresPlatoonSelect');
  if (!select) return;
  if (scores_currentSchoolId === null) {
    if (!scores_currentCollectionId) return;
    const platoons = await loadPlatoonsByCollection(scores_currentCollectionId);
    if (!platoons.length) {
      select.innerHTML = '<option value="">-- Нет взводов в этом сборе --</option>';
      select.disabled = true;
      return;
    }
    select.innerHTML = '<option value="">-- Все взводы --</option>' +
      platoons.map(p => `<option value="${p.id}">${window.escapeHtml(p.name)} (${p.people_count || 0} чел.)</option>`).join('');
    select.disabled = false;
  } else {
    if (!scores_currentSchoolId) return;
    const platoons = await loadPlatoonsBySchool(scores_currentSchoolId);
    if (!platoons.length) {
      select.innerHTML = '<option value="">-- Нет взводов в этой школе --</option>';
      select.disabled = true;
      return;
    }
    select.innerHTML = '<option value="">-- Все взводы --</option>' +
      platoons.map(p => `<option value="${p.id}">${window.escapeHtml(p.name)} (${p.people_count || 0} чел.)</option>`).join('');
    select.disabled = false;
  }
  select.removeEventListener('change', platoonChangeHandler);
  select.addEventListener('change', platoonChangeHandler);
}

window.renderScores = async function() {
  // ТОЧНАЯ КОПИЯ ОРИГИНАЛЬНОГО HTML ИЗ scores.js
  window.contentBody.innerHTML = `
    <div class="scores-layout">
      <div class="scores-sidebar">
        <div class="scores-filters">
          <div class="filter-group"><label>Сбор:</label><select id="scoresCollectionSelect"></select></div>
          <div class="filter-group"><label>Школа:</label><select id="scoresSchoolSelect" disabled></select></div>
          <div class="filter-group"><label>Взвод:</label><select id="scoresPlatoonSelect" disabled></select></div>
        </div>
        <div class="scores-actions">
          <div class="action-group">
            <div class="action-group-title">Для взвода (по предмету)</div>
            <button id="platoonAll5Btn" class="btn action-btn grade-5" disabled>Всем 5</button>
            <button id="platoonAll4Btn" class="btn action-btn grade-4" disabled>Всем 4</button>
            <button id="platoonAll3Btn" class="btn action-btn grade-3" disabled>Всем 3</button>
            <button id="platoonClearBtn" class="btn action-btn danger" disabled>Очистить все оценки</button>
          </div>
          <div class="action-group">
            <div class="action-group-title">Для школы (по ВСЕМ предметам)</div>
            <button id="schoolAll5Btn" class="btn action-btn grade-5" disabled>Всем 5</button>
            <button id="schoolAll4Btn" class="btn action-btn grade-4" disabled>Всем 4</button>
            <button id="schoolAll3Btn" class="btn action-btn grade-3" disabled>Всем 3</button>
            <button id="schoolClearBtn" class="btn action-btn danger" disabled>Очистить все оценки</button>
          </div>
          <div class="action-group">
            <button id="calcFinalBtn" class="btn action-btn calc-final" style="background: #106061;">Рассчитать итоговые оценки</button>
            <button id="exportExcelBtn" class="btn action-btn export-excel" style="background: #2c3e50;">Выгрузить в Excel</button>
          </div>
        </div>
      </div>
      <div class="scores-main">
        <div class="scores-search">
          <input type="text" id="scoresSearchInput" placeholder="Поиск по фамилии..." class="search-input">
          <select id="scoresSubjectSelect" class="subject-select"><option value="all">-- Все предметы --</option></select>
        </div>
        <div id="scoresTableContainer" class="scores-table-container"><p style="text-align:center; padding:40px;">Выберите сбор, школу, взвод и предмет</p></div>
      </div>
    </div>
  `;

  await loadAllSubjects();
  const subjectSelect = document.getElementById('scoresSubjectSelect');
  if (!subjectSelect) return;
  subjectSelect.innerHTML = '<option value="all">-- Все предметы --</option>' +
    scores_allSubjects.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
  subjectSelect.value = 'all';
  setSubjectId('all');
  subjectSelect.addEventListener('change', async e => {
    const val = e.target.value;
    setSubjectId(val === 'all' ? 'all' : parseInt(val));
    setSubjectName(val === 'all' ? 'Все предметы' : subjectSelect.options[subjectSelect.selectedIndex].text);
    await loadStudentsByCurrentFilter();
    await loadTopicsOrFinalForDisplay();
  });

  const collections = await fetchCollections();
  const collectionSelect = document.getElementById('scoresCollectionSelect');
  if (!collectionSelect) return;
  if (!collections.length) {
    collectionSelect.innerHTML = '<option>-- Нет сборов --</option>';
    return;
  }
  collectionSelect.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');

  const autoId = getAutoSelectCollectionId(collections);
  if (autoId) {
    collectionSelect.value = autoId;
    setCollectionId(autoId);
    const schools = await loadSchools(autoId);
    const schoolSelect = document.getElementById('scoresSchoolSelect');
    if (!schoolSelect) return;
    let options = '<option value="all">-- Все школы --</option>';
    options += schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
    schoolSelect.innerHTML = options;
    schoolSelect.disabled = false;
    schoolSelect.removeEventListener('change', schoolChangeHandler);
    schoolSelect.addEventListener('change', schoolChangeHandler);
    if (schools.length) {
      schoolSelect.value = schools[0].id;
      await schoolChangeHandler({ target: schoolSelect });
    }
  }

  collectionSelect.addEventListener('change', async e => {
    setCollectionId(e.target.value);
    setSchoolId(null);
    setPlatoonId(null);
    setSubjectId('all');
    setSearchTerm('');
    const searchInput = document.getElementById('scoresSearchInput');
    if (searchInput) searchInput.value = '';
    if (scores_currentCollectionId) {
      const schools = await loadSchools(scores_currentCollectionId);
      const schoolSelect = document.getElementById('scoresSchoolSelect');
      if (!schoolSelect) return;
      let options = '<option value="all">-- Все школы --</option>';
      options += schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
      schoolSelect.innerHTML = options;
      schoolSelect.disabled = false;
      schoolSelect.removeEventListener('change', schoolChangeHandler);
      schoolSelect.addEventListener('change', schoolChangeHandler);
      if (schools.length) {
        schoolSelect.value = schools[0].id;
        await schoolChangeHandler({ target: schoolSelect });
      }
    } else {
      const schoolSelect = document.getElementById('scoresSchoolSelect');
      if (schoolSelect) {
        schoolSelect.innerHTML = '<option value="">-- Выберите сбор сначала --</option>';
        schoolSelect.disabled = true;
      }
      const platoonSelect = document.getElementById('scoresPlatoonSelect');
      if (platoonSelect) platoonSelect.disabled = true;
      const tableContainer = document.getElementById('scoresTableContainer');
      if (tableContainer) tableContainer.innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
    }
    updatePlatoonButtonsState();
    updateSchoolButtonsState();
  });

  const searchInput = document.getElementById('scoresSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      setSearchTerm(e.target.value.trim().toLowerCase());
      renderScoresTable();
    });
  }

  const calcBtn = document.getElementById('calcFinalBtn');
  if (calcBtn) calcBtn.addEventListener('click', computeAndSaveFinalScores);
  const exportBtn = document.getElementById('exportExcelBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => alert('Функция выгрузки в Excel будет добавлена позже.'));

  attachBulkHandlers();
};