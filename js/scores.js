// ========== РАЗДЕЛ ОЦЕНКИ (финальная версия) ==========
let scores_currentCollectionId = null;
let scores_currentSchoolId = null;
let scores_currentSchoolName = '';
let scores_currentPlatoonId = null;
let scores_currentSubjectId = null;
let scores_currentSubjectName = '';
let scores_students = [];
let scores_topics = [];
let scores_scores = {};
let scores_final = {};
let scores_searchTerm = '';

window.renderScores = async function() {
  window.contentBody.innerHTML = `
    <div class="scores-layout">
      <div class="scores-sidebar">
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
            <select id="scoresPlatoonSelect" disabled></select>
          </div>
        </div>
        <div class="scores-actions">
          <div class="action-group">
            <div class="action-group-title">Для взвода (по предмету)</div>
            <button id="platoonAll5Btn" class="btn action-btn grade-5">Всем 5</button>
            <button id="platoonAll4Btn" class="btn action-btn grade-4">Всем 4</button>
            <button id="platoonAll3Btn" class="btn action-btn grade-3">Всем 3</button>
            <button id="platoonClearBtn" class="btn action-btn danger">Очистить все оценки</button>
          </div>
          <div class="action-group">
            <div class="action-group-title">Для школы (по ВСЕМ предметам)</div>
            <button id="schoolAll5Btn" class="btn action-btn grade-5">Всем 5</button>
            <button id="schoolAll4Btn" class="btn action-btn grade-4">Всем 4</button>
            <button id="schoolAll3Btn" class="btn action-btn grade-3">Всем 3</button>
            <button id="schoolClearBtn" class="btn action-btn danger">Очистить все оценки</button>
          </div>
        </div>
      </div>
      <div class="scores-main">
        <div class="scores-search">
          <input type="text" id="scoresSearchInput" placeholder="Поиск по фамилии..." class="search-input">
          <select id="scoresSubjectSelect" class="subject-select">
            <option value="">-- Выберите предмет --</option>
          </select>
        </div>
        <div id="scoresTableContainer" class="scores-table-container">
          <p style="text-align:center; padding:40px;">Выберите сбор, школу, взвод и предмет</p>
        </div>
      </div>
    </div>
  `;

  const collectionsResp = await fetch('/api/collections');
  const collections = await collectionsResp.json();
  const collectionSelect = document.getElementById('scoresCollectionSelect');
  if (collections.length === 0) {
    collectionSelect.innerHTML = '<option>-- Нет сборов --</option>';
    return;
  }
  collectionSelect.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}" data-start="${c.date_start}" data-end="${c.date_end}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  
  const today = new Date().toISOString().slice(0,10);
  let autoSelectedId = null;
  for (const c of collections) {
    if (c.date_start <= today && c.date_end >= today) {
      autoSelectedId = c.id;
      break;
    }
  }
  if (autoSelectedId) {
    collectionSelect.value = autoSelectedId;
    scores_currentCollectionId = autoSelectedId;
    await loadSchools();
    document.getElementById('scoresSchoolSelect').disabled = false;
  }

  collectionSelect.addEventListener('change', async (e) => {
    scores_currentCollectionId = e.target.value;
    scores_currentSchoolId = null;
    scores_currentPlatoonId = null;
    scores_currentSubjectId = null;
    scores_searchTerm = '';
    const searchInput = document.getElementById('scoresSearchInput');
    if (searchInput) searchInput.value = '';
    if (scores_currentCollectionId) {
      await loadSchools();
      document.getElementById('scoresSchoolSelect').disabled = false;
    } else {
      document.getElementById('scoresSchoolSelect').innerHTML = '<option value="">-- Выберите сбор сначала --</option>';
      document.getElementById('scoresSchoolSelect').disabled = true;
      document.getElementById('scoresPlatoonSelect').disabled = true;
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
    }
  });

  const searchInput = document.getElementById('scoresSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      scores_searchTerm = e.target.value.trim().toLowerCase();
      renderScoresTable();
    });
  }

  try {
    const subjectsResp = await fetch('/api/subjects');
    if (!subjectsResp.ok) throw new Error('Ошибка загрузки предметов');
    const allSubjects = await subjectsResp.json();
    const subjectSelect = document.getElementById('scoresSubjectSelect');
    subjectSelect.innerHTML = '<option value="">-- Выберите предмет --</option>' +
      allSubjects.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
    subjectSelect.addEventListener('change', async (e) => {
      scores_currentSubjectId = e.target.value;
      if (scores_currentSubjectId) {
        const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
        scores_currentSubjectName = selectedOption ? selectedOption.text : '';
        if (scores_currentPlatoonId) {
          await loadTopicsForSubject();
        } else {
          document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите взвод</p>';
        }
      } else {
        document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите предмет</p>';
      }
    });
  } catch (err) {
    console.error(err);
    const subjectSelect = document.getElementById('scoresSubjectSelect');
    if (subjectSelect) subjectSelect.innerHTML = '<option value="">-- Ошибка загрузки предметов --</option>';
  }
};

async function loadSchools() {
  if (!scores_currentCollectionId) return;
  const resp = await fetch(`/api/collections/${scores_currentCollectionId}/schools`);
  const schools = await resp.json();
  const schoolSelect = document.getElementById('scoresSchoolSelect');
  if (!schools.length) {
    schoolSelect.innerHTML = '<option value="">-- Нет школ в этом сборе --</option>';
    return;
  }
  schoolSelect.innerHTML = '<option value="">-- Выберите школу --</option>' +
    schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
  schoolSelect.disabled = false;
  schoolSelect.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      const selectedSchool = schools.find(s => s.id == selectedId);
      scores_currentSchoolId = selectedId;
      scores_currentSchoolName = selectedSchool ? selectedSchool.edu_org : '';
    } else {
      scores_currentSchoolId = null;
      scores_currentSchoolName = '';
    }
    scores_currentPlatoonId = null;
    scores_currentSubjectId = null;
    scores_searchTerm = '';
    const searchInput = document.getElementById('scoresSearchInput');
    if (searchInput) searchInput.value = '';
    const subjectSelect = document.getElementById('scoresSubjectSelect');
    if (subjectSelect) subjectSelect.value = '';
    if (scores_currentSchoolId) {
      await loadPlatoons();
      document.getElementById('scoresPlatoonSelect').disabled = false;
    } else {
      document.getElementById('scoresPlatoonSelect').innerHTML = '<option value="">-- Выберите школу --</option>';
      document.getElementById('scoresPlatoonSelect').disabled = true;
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите школу</p>';
    }
  });
}

async function loadPlatoons() {
  if (!scores_currentSchoolId) return;
  const resp = await fetch(`/api/schools/${scores_currentSchoolId}/platoons`);
  const platoons = await resp.json();
  const platoonSelect = document.getElementById('scoresPlatoonSelect');
  if (!platoons.length) {
    platoonSelect.innerHTML = '<option value="">-- Нет взводов в этой школе --</option>';
    return;
  }
  platoonSelect.innerHTML = '<option value="">-- Выберите взвод --</option>' +
    platoons.map(p => `<option value="${p.id}">${window.escapeHtml(p.name)} (${p.people_count || 0} чел.)</option>`).join('');
  platoonSelect.disabled = false;
  platoonSelect.addEventListener('change', async (e) => {
    scores_currentPlatoonId = e.target.value;
    scores_currentSubjectId = null;
    const subjectSelect = document.getElementById('scoresSubjectSelect');
    if (subjectSelect) subjectSelect.value = '';
    document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите предмет</p>';
    if (scores_currentPlatoonId && scores_currentSchoolId) {
      await loadStudentsForPlatoon();
    } else {
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите взвод</p>';
    }
  });
}

async function loadStudentsForPlatoon() {
  if (!scores_currentPlatoonId || !scores_currentSchoolId) return;
  try {
    const studentsResp = await fetch(`/api/scores/platoon/${scores_currentPlatoonId}/students?schoolId=${scores_currentSchoolId}`);
    scores_students = await studentsResp.json();
  } catch (err) {
    console.error(err);
    document.getElementById('scoresTableContainer').innerHTML = '<p style="color:red;">Ошибка загрузки учеников</p>';
  }
}

async function loadTopicsForSubject() {
  if (!scores_currentPlatoonId || !scores_currentSubjectId) return;
  try {
    const topicsResp = await fetch(`/api/scores/platoon/${scores_currentPlatoonId}/topics`);
    if (!topicsResp.ok) throw new Error('Ошибка загрузки тем');
    const allTopics = await topicsResp.json();
    scores_topics = allTopics.filter(t => t.subject_id == scores_currentSubjectId);
    if (!scores_topics.length) {
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Для выбранного предмета нет тем</p>';
      return;
    }
    scores_scores = {};
    scores_final = {};
    for (const student of scores_students) {
      const scoresResp = await fetch(`/api/scores/student/${student.id}`);
      scores_scores[student.id] = await scoresResp.json();
      const finalResp = await fetch(`/api/scores/student/${student.id}/final`);
      scores_final[student.id] = await finalResp.json();
    }
    renderScoresTable();
  } catch (err) {
    console.error(err);
    document.getElementById('scoresTableContainer').innerHTML = '<p style="color:red;">Ошибка загрузки тем</p>';
  }
}

function renderScoresTable() {
  const container = document.getElementById('scoresTableContainer');
  if (!scores_students.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">В выбранном взводе нет учеников</p>';
    return;
  }
  if (!scores_topics.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Для выбранного предмета нет тем</p>';
    return;
  }

  let filteredStudents = scores_students;
  if (scores_searchTerm) {
    filteredStudents = scores_students.filter(s => s.full_name.toLowerCase().includes(scores_searchTerm));
  }

  let html = '<div class="scores-table-wrapper">';
  html += '<table class="scores-table" id="scoresTable">';
  html += '<thead>';
  html += '<tr>';
  html += '<th rowspan="2">№</th>';
  html += '<th rowspan="2">Действия</th>';
  html += '<th rowspan="2">Ученик</th>';
  html += '<th rowspan="2">Школа</th>';
  html += `<th colspan="${scores_topics.length}" class="subject-header">${window.escapeHtml(scores_currentSubjectName)}</th>`;
  html += '<th rowspan="2">Итоговая</th>';
  html += '</tr>';
  html += '<tr>';
  for (const topic of scores_topics) {
    const shortName = topic.name.length > 30 ? topic.name.slice(0,27)+'...' : topic.name;
    html += `<th title="${window.escapeHtml(topic.name)}">${window.escapeHtml(shortName)}</th>`;
  }
  html += '</tr>';
  html += '</thead><tbody>';

  for (let idx = 0; idx < filteredStudents.length; idx++) {
    const student = filteredStudents[idx];
    html += `<tr data-person-id="${student.id}">`;
    html += `<td class="number-cell">${idx+1}</td>`;
    html += `<td class="actions-cell">
              <div class="student-actions">
                <button class="student-grade-btn grade-5" data-person-id="${student.id}" data-grade="5">5</button>
                <button class="student-grade-btn grade-4" data-person-id="${student.id}" data-grade="4">4</button>
                <button class="student-grade-btn grade-3" data-person-id="${student.id}" data-grade="3">3</button>
              </div>
             </td>`;
    html += `<td class="student-name">${window.escapeHtml(student.full_name)}</td>`;
    html += `<td class="school-name">${window.escapeHtml(scores_currentSchoolName)}</td>`;
    for (const topic of scores_topics) {
      const currentScore = scores_scores[student.id][topic.id] || '';
      let scoreClass = '';
      if (currentScore === 5) scoreClass = 'score-5';
      else if (currentScore === 4) scoreClass = 'score-4';
      else if (currentScore === 3) scoreClass = 'score-3';
      html += `
        <td class="score-cell ${scoreClass}">
          <select class="score-select" data-person-id="${student.id}" data-topic-id="${topic.id}">
            <option value="">—</option>
            ${[1,2,3,4,5].map(v => `<option value="${v}" ${currentScore == v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
         </td>
      `;
    }
    let finalScore = null;
    if (scores_final[student.id] && scores_final[student.id][scores_currentSubjectId]) {
      finalScore = scores_final[student.id][scores_currentSubjectId];
    }
    html += `<td class="final-score">${finalScore !== null ? finalScore : '—'}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  container.innerHTML = html;

  document.querySelectorAll('.score-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const personId = select.getAttribute('data-person-id');
      const topicId = select.getAttribute('data-topic-id');
      let score = select.value ? parseInt(select.value) : null;
      if (score && (score < 1 || score > 5)) {
        alert('Оценка должна быть от 1 до 5');
        select.value = '';
        score = null;
      }
      await fetch('/api/scores/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, topic_id: topicId, score })
      });
      if (score === null) {
        delete scores_scores[personId][topicId];
      } else {
        scores_scores[personId][topicId] = score;
      }
      await recalcFinalForPerson(personId);
      renderScoresTable();
    });
  });

  document.querySelectorAll('.student-grade-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const personId = btn.getAttribute('data-person-id');
      const grade = parseInt(btn.getAttribute('data-grade'));
      if (!scores_currentSubjectId) {
        alert('Сначала выберите предмет');
        return;
      }
      for (const topic of scores_topics) {
        if (scores_scores[personId][topic.id] !== grade) {
          await fetch('/api/scores/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_id: personId, topic_id: topic.id, score: grade })
          });
          scores_scores[personId][topic.id] = grade;
        }
      }
      await recalcFinalForPerson(personId);
      renderScoresTable();
    });
  });
}

async function recalcFinalForPerson(personId) {
  if (!scores_currentSubjectId) return;
  let scores = [];
  for (const topic of scores_topics) {
    const score = scores_scores[personId][topic.id];
    if (score) scores.push(score);
  }
  let finalScore = null;
  if (scores.length) {
    const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
    finalScore = Math.round(avg);
    if (finalScore < 1) finalScore = 1;
    if (finalScore > 5) finalScore = 5;
  }
  await fetch('/api/scores/calculate-final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, subject_id: scores_currentSubjectId })
  });
  if (finalScore) {
    if (!scores_final[personId]) scores_final[personId] = {};
    scores_final[personId][scores_currentSubjectId] = finalScore;
  } else {
    if (scores_final[personId]) delete scores_final[personId][scores_currentSubjectId];
  }
}

async function bulkPlatoonOperation(score) {
  if (!scores_currentPlatoonId) {
    alert('Сначала выберите взвод');
    return;
  }
  if (!scores_currentSubjectId) {
    alert('Сначала выберите предмет');
    return;
  }
  if (score === null) {
    if (!confirm(`Вы уверены, что хотите очистить все оценки взвода по этому предмету?`)) return;
  }
  try {
    if (score !== null) {
      await fetch('/api/scores/bulk-platoon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platoonId: scores_currentPlatoonId, score, subjectId: scores_currentSubjectId })
      });
      for (const student of scores_students) {
        for (const topic of scores_topics) {
          scores_scores[student.id][topic.id] = score;
        }
      }
    } else {
      await fetch(`/api/scores/platoon/${scores_currentPlatoonId}?subjectId=${scores_currentSubjectId}`, { method: 'DELETE' });
      for (const student of scores_students) {
        for (const topic of scores_topics) {
          delete scores_scores[student.id][topic.id];
        }
      }
    }
    for (const student of scores_students) {
      await recalcFinalForPerson(student.id);
    }
    renderScoresTable();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

async function bulkSchoolOperation(score) {
  if (!scores_currentSchoolId) {
    alert('Сначала выберите школу');
    return;
  }
  if (score === null) {
    if (!confirm(`Вы уверены, что хотите очистить все оценки школы?`)) return;
  }
  try {
    // Отправляем запрос на сервер (в фоне, не ждём результата для отображения)
    if (score !== null) {
      fetch('/api/scores/bulk-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: scores_currentSchoolId, score })
      }).catch(err => console.error('Ошибка фонового запроса:', err));
    } else {
      fetch(`/api/scores/school/${scores_currentSchoolId}`, { method: 'DELETE' })
        .catch(err => console.error('Ошибка фонового запроса:', err));
    }
    
    // Мгновенно обновляем локальные оценки для текущего взвода и предмета
    if (scores_currentPlatoonId && scores_currentSubjectId && scores_topics.length) {
      for (const student of scores_students) {
        for (const topic of scores_topics) {
          if (score !== null) {
            scores_scores[student.id][topic.id] = score;
          } else {
            delete scores_scores[student.id][topic.id];
          }
        }
        // Пересчитываем итоговую оценку для ученика
        await recalcFinalForPerson(student.id);
      }
      renderScoresTable();
    }
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

function attachBulkHandlers() {
  const platoon5 = document.getElementById('platoonAll5Btn');
  const platoon4 = document.getElementById('platoonAll4Btn');
  const platoon3 = document.getElementById('platoonAll3Btn');
  const platoonClear = document.getElementById('platoonClearBtn');
  const school5 = document.getElementById('schoolAll5Btn');
  const school4 = document.getElementById('schoolAll4Btn');
  const school3 = document.getElementById('schoolAll3Btn');
  const schoolClear = document.getElementById('schoolClearBtn');
  if (platoon5) platoon5.onclick = () => bulkPlatoonOperation(5);
  if (platoon4) platoon4.onclick = () => bulkPlatoonOperation(4);
  if (platoon3) platoon3.onclick = () => bulkPlatoonOperation(3);
  if (platoonClear) platoonClear.onclick = () => bulkPlatoonOperation(null);
  if (school5) school5.onclick = () => bulkSchoolOperation(5);
  if (school4) school4.onclick = () => bulkSchoolOperation(4);
  if (school3) school3.onclick = () => bulkSchoolOperation(3);
  if (schoolClear) schoolClear.onclick = () => bulkSchoolOperation(null);
}

setInterval(() => {
  attachBulkHandlers();
}, 500);