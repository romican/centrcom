// ========== РАЗДЕЛ ОЦЕНКИ ==========
let scores_currentCollectionId = null;
let scores_currentSchoolId = null;
let scores_currentPlatoonId = null;
let scores_currentPersonId = null;
let scores_subjects = [];
let scores_topics = [];
let scores_scores = {};
let scores_final = {};

window.renderScores = async function() {
  if (!window.contentBody) {
    console.error('contentBody not found');
    return;
  }
  window.contentBody.innerHTML = `
    <div class="scores-container">
      <div class="scores-filters">
        <div class="filter-group">
          <label>Сбор:</label>
          <select id="scoresCollectionSelect"></select>
        </div>
        <div class="filter-group">
          <label>Школа:</label>
          <select id="scoresSchoolSelect" disabled></select>
        </div>
        <div class="filter-group">
          <label>Взвод:</label>
          <select id="scoresPlatoonSelect" disabled>
            <option value="">Все взвода</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Ученик:</label>
          <select id="scoresPersonSelect" disabled></select>
        </div>
      </div>
      <div id="scoresContent">
        <p style="text-align:center; padding:40px;">Выберите сбор, школу и ученика</p>
      </div>
    </div>
  `;

  const collectionsResp = await fetch('/api/collections');
  const collections = await collectionsResp.json();
  const collectionSelect = document.getElementById('scoresCollectionSelect');
  if (!collectionSelect) return;
  if (collections.length === 0) {
    collectionSelect.innerHTML = '<option>-- Нет сборов --</option>';
    return;
  }
  collectionSelect.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  
  collectionSelect.addEventListener('change', async (e) => {
    scores_currentCollectionId = e.target.value;
    scores_currentSchoolId = null;
    scores_currentPlatoonId = null;
    scores_currentPersonId = null;
    if (scores_currentCollectionId) {
      await loadSchools();
      const schoolSelect = document.getElementById('scoresSchoolSelect');
      if (schoolSelect) schoolSelect.disabled = false;
    } else {
      const schoolSelect = document.getElementById('scoresSchoolSelect');
      if (schoolSelect) {
        schoolSelect.innerHTML = '<option value="">-- Выберите сбор сначала --</option>';
        schoolSelect.disabled = true;
      }
      const platoonSelect = document.getElementById('scoresPlatoonSelect');
      if (platoonSelect) platoonSelect.disabled = true;
      const personSelect = document.getElementById('scoresPersonSelect');
      if (personSelect) personSelect.disabled = true;
      const contentDiv = document.getElementById('scoresContent');
      if (contentDiv) contentDiv.innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
    }
  });
};

async function loadSchools() {
  if (!scores_currentCollectionId) return;
  const resp = await fetch(`/api/collections/${scores_currentCollectionId}/schools`);
  const schools = await resp.json();
  const schoolSelect = document.getElementById('scoresSchoolSelect');
  if (!schoolSelect) return;
  if (!schools.length) {
    schoolSelect.innerHTML = '<option value="">-- Нет школ в этом сборе --</option>';
    return;
  }
  schoolSelect.innerHTML = '<option value="">-- Выберите школу --</option>' +
    schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
  schoolSelect.disabled = false;
  schoolSelect.addEventListener('change', async (e) => {
    scores_currentSchoolId = e.target.value;
    scores_currentPlatoonId = null;
    scores_currentPersonId = null;
    if (scores_currentSchoolId) {
      await loadPlatoons();
      const platoonSelect = document.getElementById('scoresPlatoonSelect');
      if (platoonSelect) platoonSelect.disabled = false;
    } else {
      const platoonSelect = document.getElementById('scoresPlatoonSelect');
      if (platoonSelect) {
        platoonSelect.innerHTML = '<option value="">Все взвода</option>';
        platoonSelect.disabled = true;
      }
      const personSelect = document.getElementById('scoresPersonSelect');
      if (personSelect) {
        personSelect.innerHTML = '<option value="">-- Выберите школу --</option>';
        personSelect.disabled = true;
      }
      const contentDiv = document.getElementById('scoresContent');
      if (contentDiv) contentDiv.innerHTML = '<p style="text-align:center; padding:40px;">Выберите школу</p>';
    }
  });
}

async function loadPlatoons() {
  if (!scores_currentSchoolId) return;
  const resp = await fetch(`/api/schools/${scores_currentSchoolId}/platoons`);
  const platoons = await resp.json();
  const platoonSelect = document.getElementById('scoresPlatoonSelect');
  if (!platoonSelect) return;
  platoonSelect.innerHTML = '<option value="">Все взвода</option>' +
    platoons.map(p => `<option value="${p.id}">${window.escapeHtml(p.name)} (${p.people_count || 0} чел.)</option>`).join('');
  platoonSelect.disabled = false;
  platoonSelect.addEventListener('change', async (e) => {
    scores_currentPlatoonId = e.target.value || null;
    await loadStudents();
  });
}

async function loadStudents() {
  if (!scores_currentSchoolId) return;
  let url = `/api/scores/school/${scores_currentSchoolId}/students`;
  if (scores_currentPlatoonId) {
    url += `?platoonId=${scores_currentPlatoonId}`;
  }
  const resp = await fetch(url);
  const students = await resp.json();
  const personSelect = document.getElementById('scoresPersonSelect');
  if (!personSelect) return;
  if (!students.length) {
    personSelect.innerHTML = '<option value="">-- Нет учеников --</option>';
    personSelect.disabled = true;
    const contentDiv = document.getElementById('scoresContent');
    if (contentDiv) contentDiv.innerHTML = '<p style="text-align:center; padding:40px;">Нет учеников в выбранной школе/взводе</p>';
    return;
  }
  personSelect.innerHTML = '<option value="">-- Выберите ученика --</option>' +
    students.map(s => `<option value="${s.id}">${window.escapeHtml(s.full_name)}</option>`).join('');
  personSelect.disabled = false;
  personSelect.addEventListener('change', async (e) => {
    scores_currentPersonId = e.target.value;
    if (scores_currentPersonId) {
      await loadScoresData();
    } else {
      const contentDiv = document.getElementById('scoresContent');
      if (contentDiv) contentDiv.innerHTML = '<p style="text-align:center; padding:40px;">Выберите ученика</p>';
    }
  });
}

async function loadScoresData() {
  if (!scores_currentPersonId) return;
  try {
    const subjectsResp = await fetch('/api/subjects');
    scores_subjects = await subjectsResp.json();
    const topicsResp = await fetch(`/api/topics?collection_id=${scores_currentCollectionId}`);
    scores_topics = await topicsResp.json();
    const scoresResp = await fetch(`/api/scores?person_id=${scores_currentPersonId}`);
    scores_scores = await scoresResp.json();
    const finalResp = await fetch(`/api/final-scores?person_id=${scores_currentPersonId}&subject_id=all`);
    scores_final = await finalResp.json();
    renderScoresTable();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('scoresContent');
    if (container) container.innerHTML = '<p style="color:red;">Ошибка загрузки данных</p>';
  }
}

function renderScoresTable() {
  const container = document.getElementById('scoresContent');
  if (!container) return;
  if (!scores_topics.length) {
    container.innerHTML = '<p style="text-align:center;">Нет тем для этого сбора. Сначала добавьте темы в разделе "Занятия".</p>';
    return;
  }
  let html = `
    <div style="overflow-x:auto;">
      <table class="scores-table">
        <thead>
          <tr>
            <th>Предмет</th>
            <th>Тема</th>
            <th>Дата</th>
            <th>Оценка</th>
            <th>Итоговая</th>
          </tr>
        </thead>
        <tbody>
  `;
  for (const topic of scores_topics) {
    const currentScore = scores_scores[topic.id] || '';
    const finalScore = scores_final[topic.subject_id] || '';
    html += `
      <tr data-topic-id="${topic.id}" data-subject-id="${topic.subject_id}">
        <td>${window.escapeHtml(topic.subject_name)}</td>
        <td>${window.escapeHtml(topic.name)}</td>
        <td>${topic.date ? window.formatDate(topic.date) : '—'}</td>
        <td>
          <select class="score-select" data-type="topic" data-id="${topic.id}" style="width:80px;">
            <option value="">—</option>
            ${[1,2,3,4,5].map(v => `<option value="${v}" ${currentScore == v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td class="final-score-${topic.subject_id}">
          ${finalScore ? finalScore : '—'}
        </td>
      </tr>
    `;
  }
  html += `
        </tbody>
      </table>
      <div style="margin-top:20px;">
        <button id="calculateAllFinalBtn" class="btn add">Рассчитать все итоговые оценки</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.querySelectorAll('.score-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const topicId = select.getAttribute('data-id');
      const score = select.value ? parseInt(select.value) : null;
      if (score && (score < 1 || score > 5)) {
        alert('Оценка должна быть от 1 до 5');
        select.value = '';
        return;
      }
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: scores_currentPersonId, topic_id: topicId, score })
      });
      const row = select.closest('tr');
      const subjectId = row.getAttribute('data-subject-id');
      await updateFinalScoreForSubject(subjectId);
    });
  });

  const calcBtn = document.getElementById('calculateAllFinalBtn');
  if (calcBtn) {
    calcBtn.addEventListener('click', async () => {
      for (const subject of scores_subjects) {
        await updateFinalScoreForSubject(subject.id);
      }
      alert('Итоговые оценки пересчитаны');
    });
  }
}

async function updateFinalScoreForSubject(subjectId) {
  const resp = await fetch('/api/calculate-final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: scores_currentPersonId, subject_id: subjectId })
  });
  const data = await resp.json();
  const finalScore = data.finalScore;
  const cell = document.querySelector(`.final-score-${subjectId}`);
  if (cell) cell.innerText = finalScore !== null ? finalScore : '—';
  if (finalScore !== null) scores_final[subjectId] = finalScore;
  else delete scores_final[subjectId];
}