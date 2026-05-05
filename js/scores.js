// ========== РАЗДЕЛ ОЦЕНКИ ==========
let scores_currentCollectionId = null;
let scores_currentSchoolId = null;
let scores_currentSchoolName = '';
let scores_currentPlatoonId = null;
let scores_currentSubjectId = 'all';
let scores_currentSubjectName = 'Все предметы';
let scores_students = [];
let scores_topics = [];
let scores_scores = {};
let scores_final = {};
let scores_searchTerm = '';

function showLoader() {
  const container = document.getElementById('scoresTableContainer');
  if (!container) return;
  let loader = container.querySelector('.scores-loader');
  if (loader) loader.remove();
  loader = document.createElement('div');
  loader.className = 'scores-loader';
  loader.innerHTML = '<div class="loader-spinner"></div>';
  container.style.position = 'relative';
  container.appendChild(loader);
}
function hideLoader() {
  const loader = document.querySelector('.scores-loader');
  if (loader) loader.remove();
  const container = document.getElementById('scoresTableContainer');
  if (container) container.style.position = '';
}

function updatePlatoonButtonsState() {
  const btns = ['platoonAll5Btn', 'platoonAll4Btn', 'platoonAll3Btn', 'platoonClearBtn'];
  const isSelected = scores_currentPlatoonId !== null && scores_currentPlatoonId !== '';
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !isSelected;
      btn.style.opacity = isSelected ? '1' : '0.5';
      btn.style.cursor = isSelected ? 'pointer' : 'not-allowed';
    }
  });
}

window.renderScores = async function() {
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
          <select id="scoresSubjectSelect" class="subject-select"><option value="all">-- Все предметы --</option></select>
        </div>
        <div id="scoresTableContainer" class="scores-table-container"><p style="text-align:center; padding:40px;">Выберите сбор, школу, взвод и предмет</p></div>
      </div>
    </div>
  `;

  // сборы
  const collectionsResp = await fetch('/api/collections');
  const collections = await collectionsResp.json();
  const collectionSelect = document.getElementById('scoresCollectionSelect');
  if (!collections.length) {
    collectionSelect.innerHTML = '<option>-- Нет сборов --</option>';
    return;
  }
  collectionSelect.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  const today = new Date().toISOString().slice(0,10);
  let autoId = collections.find(c => c.date_start <= today && c.date_end >= today)?.id || collections[0].id;
  if (autoId) {
    collectionSelect.value = autoId;
    scores_currentCollectionId = autoId;
    await loadSchools();
    const schoolSelect = document.getElementById('scoresSchoolSelect');
    if (schoolSelect && schoolSelect.options.length > 1) {
      schoolSelect.value = schoolSelect.options[1].value;
      schoolSelect.dispatchEvent(new Event('change'));
    }
    document.getElementById('scoresSchoolSelect').disabled = false;
  }
  collectionSelect.addEventListener('change', async e => {
    scores_currentCollectionId = e.target.value;
    scores_currentSchoolId = null;
    scores_currentPlatoonId = null;
    scores_currentSubjectId = 'all';
    scores_searchTerm = '';
    document.getElementById('scoresSearchInput').value = '';
    if (scores_currentCollectionId) {
      await loadSchools();
      document.getElementById('scoresSchoolSelect').disabled = false;
      const schoolSelect = document.getElementById('scoresSchoolSelect');
      if (schoolSelect.options.length > 1) schoolSelect.value = schoolSelect.options[1].value;
      schoolSelect.dispatchEvent(new Event('change'));
    } else {
      document.getElementById('scoresSchoolSelect').innerHTML = '<option value="">-- Выберите сбор сначала --</option>';
      document.getElementById('scoresSchoolSelect').disabled = true;
      document.getElementById('scoresPlatoonSelect').disabled = true;
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
    }
    updatePlatoonButtonsState();
  });

  document.getElementById('scoresSearchInput').addEventListener('input', e => {
    scores_searchTerm = e.target.value.trim().toLowerCase();
    renderScoresTable();
  });

  try {
    const subjectsResp = await fetch('/api/subjects');
    const allSubjects = await subjectsResp.json();
    const subjectSelect = document.getElementById('scoresSubjectSelect');
    subjectSelect.innerHTML = '<option value="all">-- Все предметы --</option>' +
      allSubjects.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
    subjectSelect.value = 'all';
    scores_currentSubjectId = 'all';
    subjectSelect.addEventListener('change', async e => {
      const val = e.target.value;
      scores_currentSubjectId = val === 'all' ? 'all' : parseInt(val);
      scores_currentSubjectName = val === 'all' ? 'Все предметы' : subjectSelect.options[subjectSelect.selectedIndex].text;
      if (scores_currentPlatoonId) {
        await loadStudentsForPlatoon();
        await loadTopicsForSubjectOrAll();
      } else if (scores_currentSchoolId) {
        await loadAllStudentsOfSchoolAndTopicsForSubject(scores_currentSubjectId === 'all' ? null : scores_currentSubjectId);
      }
    });
  } catch(e) { console.error(e); }
};

async function loadSchools() {
  if (!scores_currentCollectionId) return;
  const resp = await fetch(`/api/collections/${scores_currentCollectionId}/schools`);
  const schools = await resp.json();
  const schoolSelect = document.getElementById('scoresSchoolSelect');
  if (!schools.length) {
    schoolSelect.innerHTML = '<option value="">-- Нет школ --</option>';
    schoolSelect.disabled = true;
    return;
  }
  schoolSelect.innerHTML = '<option value="">-- Выберите школу --</option>' +
    schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
  schoolSelect.disabled = false;
  schoolSelect.addEventListener('change', async e => {
    const id = e.target.value;
    if (id) {
      scores_currentSchoolId = parseInt(id);
      scores_currentSchoolName = schools.find(s => s.id == id)?.edu_org || '';
    } else {
      scores_currentSchoolId = null;
    }
    scores_currentPlatoonId = null;
    scores_currentSubjectId = 'all';
    document.getElementById('scoresSubjectSelect').value = 'all';
    if (scores_currentSchoolId) {
      await loadPlatoons();
      await loadAllStudentsOfSchoolAndTopicsForSubject(null);
    } else {
      document.getElementById('scoresPlatoonSelect').innerHTML = '<option value="">-- Выберите школу --</option>';
      document.getElementById('scoresPlatoonSelect').disabled = true;
      document.getElementById('scoresTableContainer').innerHTML = '<p style="text-align:center; padding:40px;">Выберите школу</p>';
    }
    updatePlatoonButtonsState();
  });
}

async function loadPlatoons() {
  if (!scores_currentSchoolId) return;
  const resp = await fetch(`/api/schools/${scores_currentSchoolId}/platoons`);
  const platoons = await resp.json();
  const select = document.getElementById('scoresPlatoonSelect');
  if (!platoons.length) {
    select.innerHTML = '<option value="">-- Нет взводов --</option>';
    select.disabled = true;
    await loadAllStudentsOfSchoolAndTopicsForSubject(scores_currentSubjectId === 'all' ? null : scores_currentSubjectId);
    updatePlatoonButtonsState();
    return;
  }
  select.innerHTML = '<option value="">-- Все взводы --</option>' +
    platoons.map(p => `<option value="${p.id}">${window.escapeHtml(p.name)} (${p.people_count || 0} чел.)</option>`).join('');
  select.disabled = false;
  select.addEventListener('change', async e => {
    const val = e.target.value;
    if (!val) {
      scores_currentPlatoonId = null;
      await loadAllStudentsOfSchoolAndTopicsForSubject(scores_currentSubjectId === 'all' ? null : scores_currentSubjectId);
    } else {
      scores_currentPlatoonId = parseInt(val);
      await loadStudentsForPlatoon();
      await loadTopicsForSubjectOrAll();
    }
    updatePlatoonButtonsState();
  });
  updatePlatoonButtonsState();
}

async function loadStudentsForPlatoon() {
  if (!scores_currentPlatoonId || !scores_currentSchoolId) return;
  const resp = await fetch(`/api/scores/platoon/${scores_currentPlatoonId}/students?schoolId=${scores_currentSchoolId}`);
  scores_students = await resp.json();
}

async function loadAllStudentsOfSchoolAndTopicsForSubject(subjectId) {
  if (!scores_currentSchoolId) return;
  const resp = await fetch(`/api/schools/${scores_currentSchoolId}/people`);
  scores_students = await resp.json();
  if (subjectId === null) {
    await loadAllTopicsOfCollection();
  } else {
    const topicsResp = await fetch(`/api/topics/${scores_currentCollectionId}`);
    const data = await topicsResp.json();
    scores_topics = data.topics.filter(t => t.subject_id == subjectId);
    await loadScoresAndFinalsForStudents();
  }
}

async function loadAllTopicsOfCollection() {
  const resp = await fetch(`/api/topics/${scores_currentCollectionId}`);
  const data = await resp.json();
  scores_topics = data.topics;
  await loadScoresAndFinalsForStudents();
}

async function loadTopicsForSubjectOrAll() {
  if (scores_currentSubjectId === 'all') {
    await loadAllTopicsOfCollection();
  } else {
    const resp = await fetch(`/api/topics/${scores_currentCollectionId}`);
    const data = await resp.json();
    scores_topics = data.topics.filter(t => t.subject_id == scores_currentSubjectId);
    await loadScoresAndFinalsForStudents();
  }
}

async function loadScoresAndFinalsForStudents() {
  scores_scores = {};
  scores_final = {};
  for (const s of scores_students) {
    const sc = await fetch(`/api/scores/student/${s.id}`).then(r => r.json());
    scores_scores[s.id] = sc;
    const fin = await fetch(`/api/scores/student/${s.id}/final`).then(r => r.json());
    scores_final[s.id] = fin;
  }
  renderScoresTable();
}

function renderScoresTable() {
  const container = document.getElementById('scoresTableContainer');
  if (!scores_students.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Нет учеников</p>';
    return;
  }
  if (!scores_topics.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Для выбранного фильтра нет тем занятий</p>';
    return;
  }

  let filtered = scores_students;
  if (scores_searchTerm) filtered = scores_students.filter(s => s.full_name.toLowerCase().includes(scores_searchTerm));

  let html = '<div class="scores-table-wrapper"><table class="scores-table"><thead>';
  html += `<tr><th rowspan="2">№</th><th rowspan="2">Действия</th><th rowspan="2">Ученик</th><th rowspan="2">Школа</th>`;
  html += `<th colspan="${scores_topics.length}" class="subject-header">${window.escapeHtml(scores_currentSubjectName)}</th>`;
  html += `</tr>`;
  html += `<tr>`;
  for (const t of scores_topics) {
    const short = t.name.length > 30 ? t.name.slice(0,27)+'...' : t.name;
    html += `<th title="${window.escapeHtml(t.subject_name)}: ${window.escapeHtml(t.name)} (${window.formatDate(t.date)})">${window.escapeHtml(short)}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let idx = 0; idx < filtered.length; idx++) {
    const st = filtered[idx];
    html += `<tr data-person-id="${st.id}">`;
    html += `<td class="number-cell">${idx+1}</td>`;
    html += `<td class="actions-cell"><div class="student-actions">
      <button class="student-grade-btn grade-5" data-person-id="${st.id}" data-grade="5">5</button>
      <button class="student-grade-btn grade-4" data-person-id="${st.id}" data-grade="4">4</button>
      <button class="student-grade-btn grade-3" data-person-id="${st.id}" data-grade="3">3</button>
    </div></td>`;
    html += `<td class="student-name">${window.escapeHtml(st.full_name)}</td>`;
    html += `<td class="school-name">${window.escapeHtml(scores_currentSchoolName)}</td>`;
    for (const topic of scores_topics) {
      const score = scores_scores[st.id][topic.id] || '';
      let cls = '';
      if (score === 5) cls = 'score-5';
      else if (score === 4) cls = 'score-4';
      else if (score === 3) cls = 'score-3';
      html += `<td class="score-cell ${cls}">
        <select class="score-select" data-person-id="${st.id}" data-topic-id="${topic.id}">
          <option value="">—</option>
          ${[1,2,3,4,5].map(v => `<option value="${v}" ${score == v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // Обработчики изменения оценок
  document.querySelectorAll('.score-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      const personId = sel.getAttribute('data-person-id');
      const topicId = sel.getAttribute('data-topic-id');
      let score = sel.value ? parseInt(sel.value) : null;
      if (score && (score<1 || score>5)) {
        alert('Оценка от 1 до 5');
        sel.value = '';
        score = null;
      }
      await fetch('/api/scores/update', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({person_id:personId, topic_id:topicId, score})
      });
      if (score === null) delete scores_scores[personId][topicId];
      else scores_scores[personId][topicId] = score;
      await recalcFinalForPerson(personId);
      renderScoresTable();
    });
  });

  // Кнопки 5/4/3 для ученика
  document.querySelectorAll('.student-grade-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const personId = btn.getAttribute('data-person-id');
      const grade = parseInt(btn.getAttribute('data-grade'));
      for (const topic of scores_topics) {
        if (scores_scores[personId][topic.id] !== grade) {
          await fetch('/api/scores/update', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({person_id:personId, topic_id:topic.id, score:grade})
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
  const subjectIds = [...new Set(scores_topics.map(t=>t.subject_id))];
  for (const sid of subjectIds) {
    await fetch('/api/scores/calculate-final', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({person_id:personId, subject_id:sid})
    });
    const finals = await fetch(`/api/scores/student/${personId}/final`).then(r=>r.json());
    scores_final[personId] = finals;
  }
}

// Полное обновление данных после массовой операции (без кэша)
async function fullRefreshAfterBulk() {
  if (scores_currentPlatoonId) {
    await loadStudentsForPlatoon();
    await loadTopicsForSubjectOrAll();
  } else if (scores_currentSchoolId) {
    await loadAllStudentsOfSchoolAndTopicsForSubject(scores_currentSubjectId === 'all' ? null : scores_currentSubjectId);
  }
  renderScoresTable();
}

async function bulkPlatoonOperation(score) {
  if (!scores_currentPlatoonId) { alert('Сначала выберите взвод'); return; }
  if (score === null && !confirm('Очистить все оценки взвода?')) return;
  showLoader();
  const btns = ['platoonAll5Btn','platoonAll4Btn','platoonAll3Btn','platoonClearBtn'].map(id=>document.getElementById(id));
  btns.forEach(b=>{if(b)b.disabled=true;});
  try {
    if (score !== null) {
      await fetch('/api/scores/bulk-platoon', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({platoonId:scores_currentPlatoonId, score, subjectId: scores_currentSubjectId === 'all' ? null : scores_currentSubjectId})
      });
    } else {
      const url = scores_currentSubjectId === 'all' ? `/api/scores/platoon/${scores_currentPlatoonId}/clear-all` : `/api/scores/platoon/${scores_currentPlatoonId}?subjectId=${scores_currentSubjectId}`;
      await fetch(url, {method:'DELETE'});
    }
    // Ждём 2 секунды для завершения всех запросов на сервере
    await new Promise(r => setTimeout(r, 2000));
    // Полное обновление данных
    await fullRefreshAfterBulk();
    console.log('Массовая операция завершена, таблица обновлена');
  } catch(e){ alert('Ошибка: '+e.message); }
  finally { hideLoader(); updatePlatoonButtonsState(); }
}

async function bulkSchoolOperation(score) {
  if (!scores_currentSchoolId) { alert('Сначала выберите школу'); return; }
  if (score === null && !confirm('Очистить все оценки школы?')) return;
  showLoader();
  const btns = ['schoolAll5Btn','schoolAll4Btn','schoolAll3Btn','schoolClearBtn'].map(id=>document.getElementById(id));
  btns.forEach(b=>{if(b)b.disabled=true;});
  try {
    if (score !== null) {
      await fetch('/api/scores/bulk-school', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({schoolId:scores_currentSchoolId, score})
      });
    } else {
      await fetch(`/api/scores/school/${scores_currentSchoolId}`, {method:'DELETE'});
    }
    await new Promise(r => setTimeout(r, 2000));
    await fullRefreshAfterBulk();
    console.log('Массовая операция для школы завершена, таблица обновлена');
  } catch(e){ alert('Ошибка: '+e.message); }
  finally { hideLoader(); btns.forEach(b=>{if(b)b.disabled=false;}); }
}

function attachHandlers() {
  const p5=document.getElementById('platoonAll5Btn'), p4=document.getElementById('platoonAll4Btn'), p3=document.getElementById('platoonAll3Btn'), pc=document.getElementById('platoonClearBtn');
  const s5=document.getElementById('schoolAll5Btn'), s4=document.getElementById('schoolAll4Btn'), s3=document.getElementById('schoolAll3Btn'), sc=document.getElementById('schoolClearBtn');
  if(p5) p5.onclick=()=>bulkPlatoonOperation(5);
  if(p4) p4.onclick=()=>bulkPlatoonOperation(4);
  if(p3) p3.onclick=()=>bulkPlatoonOperation(3);
  if(pc) pc.onclick=()=>bulkPlatoonOperation(null);
  if(s5) s5.onclick=()=>bulkSchoolOperation(5);
  if(s4) s4.onclick=()=>bulkSchoolOperation(4);
  if(s3) s3.onclick=()=>bulkSchoolOperation(3);
  if(sc) sc.onclick=()=>bulkSchoolOperation(null);
}
setInterval(()=>{ attachHandlers(); updatePlatoonButtonsState(); }, 500);