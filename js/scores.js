// ========== РАЗДЕЛ ОЦЕНКИ С ИТОГОВЫМИ ОЦЕНКАМИ ==========
let scores_currentCollectionId = null;
let scores_currentSchoolId = null;       // null означает "Все школы"
let scores_currentSchoolName = '';
let scores_currentPlatoonId = null;
let scores_currentSubjectId = 'all';
let scores_currentSubjectName = 'Все предметы';
let scores_students = [];
let scores_topics = [];
let scores_scores = {};
let scores_final = {};
let scores_searchTerm = '';

let scores_allSubjects = [];

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

function updateSchoolButtonsState() {
  const btns = ['schoolAll5Btn', 'schoolAll4Btn', 'schoolAll3Btn', 'schoolClearBtn'];
  const isSchoolSelected = scores_currentSchoolId !== null && scores_currentSchoolId !== '';
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !isSchoolSelected;
      btn.style.opacity = isSchoolSelected ? '1' : '0.5';
      btn.style.cursor = isSchoolSelected ? 'pointer' : 'not-allowed';
    }
  });
}

async function loadAllSubjects() {
  if (scores_allSubjects.length) return;
  const resp = await fetch('/api/subjects');
  scores_allSubjects = await resp.json();
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
    updateSchoolButtonsState();
  });

  document.getElementById('scoresSearchInput').addEventListener('input', e => {
    scores_searchTerm = e.target.value.trim().toLowerCase();
    renderScoresTable();
  });

  const subjectSelect = document.getElementById('scoresSubjectSelect');
  subjectSelect.innerHTML = '<option value="all">-- Все предметы --</option>' +
    scores_allSubjects.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('');
  subjectSelect.value = 'all';
  scores_currentSubjectId = 'all';
  subjectSelect.addEventListener('change', async e => {
    const val = e.target.value;
    scores_currentSubjectId = val === 'all' ? 'all' : parseInt(val);
    scores_currentSubjectName = val === 'all' ? 'Все предметы' : subjectSelect.options[subjectSelect.selectedIndex].text;
    await loadStudentsByCurrentFilter();
    await loadTopicsOrFinalForDisplay();
  });

  document.getElementById('calcFinalBtn').addEventListener('click', computeAndSaveFinalScores);
  document.getElementById('exportExcelBtn').addEventListener('click', () => {
    alert('Функция выгрузки в Excel будет добавлена позже.');
  });
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
  let options = '<option value="all">-- Все школы --</option>';
  options += schools.map(s => `<option value="${s.id}">${window.escapeHtml(s.edu_org)} (${s.people_count || 0} чел.)</option>`).join('');
  schoolSelect.innerHTML = options;
  schoolSelect.disabled = false;
  schoolSelect.removeEventListener('change', schoolChangeHandler);
  schoolSelect.addEventListener('change', schoolChangeHandler);
}

async function schoolChangeHandler(e) {
  const id = e.target.value;
  if (id === 'all') {
    scores_currentSchoolId = null;
    scores_currentSchoolName = 'Все школы';
  } else if (id) {
    scores_currentSchoolId = parseInt(id);
    const resp = await fetch(`/api/collections/${scores_currentCollectionId}/schools`);
    const schools = await resp.json();
    const found = schools.find(s => s.id == id);
    scores_currentSchoolName = found ? found.edu_org : '';
  } else {
    scores_currentSchoolId = null;
    scores_currentSchoolName = '';
  }
  scores_currentPlatoonId = null;
  scores_currentSubjectId = 'all';
  document.getElementById('scoresSubjectSelect').value = 'all';
  await loadPlatoons();
  await loadStudentsByCurrentFilter();
  await loadTopicsOrFinalForDisplay();
  updatePlatoonButtonsState();
  updateSchoolButtonsState();
}

async function loadPlatoons() {
  const select = document.getElementById('scoresPlatoonSelect');
  if (scores_currentSchoolId === null) {
    if (!scores_currentCollectionId) return;
    const resp = await fetch(`/api/collections/${scores_currentCollectionId}/platoons`);
    const platoons = await resp.json();
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
    const resp = await fetch(`/api/schools/${scores_currentSchoolId}/platoons`);
    const platoons = await resp.json();
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

async function platoonChangeHandler(e) {
  const val = e.target.value;
  if (!val) {
    scores_currentPlatoonId = null;
  } else {
    scores_currentPlatoonId = parseInt(val);
  }
  await loadStudentsByCurrentFilter();
  await loadTopicsOrFinalForDisplay();
  updatePlatoonButtonsState();
}

async function loadStudentsByCurrentFilter() {
  if (!scores_currentCollectionId) return;
  if (scores_currentSchoolId === null) {
    const resp = await fetch(`/api/collections/${scores_currentCollectionId}/participants`);
    let allParticipants = await resp.json();
    if (scores_currentPlatoonId) {
      allParticipants = allParticipants.filter(p => p.platoon_id === scores_currentPlatoonId);
    }
    scores_students = allParticipants.map(p => ({
      id: p.id,
      full_name: p.full_name,
      school_name: p.school_name || p.organization,
      organization: p.organization
    }));
  } else {
    if (!scores_currentSchoolId) return;
    let students = [];
    if (scores_currentPlatoonId) {
      const resp = await fetch(`/api/scores/platoon/${scores_currentPlatoonId}/students?schoolId=${scores_currentSchoolId}`);
      students = await resp.json();
    } else {
      const resp = await fetch(`/api/schools/${scores_currentSchoolId}/people`);
      students = await resp.json();
    }
    scores_students = students.map(s => ({
      id: s.id,
      full_name: s.full_name,
      school_name: scores_currentSchoolName,
      organization: s.organization || scores_currentSchoolName
    }));
  }
}

async function loadTopicsOrFinalForDisplay() {
  if (scores_currentSubjectId === 'all') {
    await loadFinalScoresForStudents();
    renderScoresTable();
  } else {
    await loadTopicsForSubject();
    await loadScoresForStudents();
    renderScoresTable();
  }
}

async function loadTopicsForSubject() {
  if (!scores_currentCollectionId || !scores_currentSubjectId) return;
  const resp = await fetch(`/api/topics/${scores_currentCollectionId}`);
  const data = await resp.json();
  scores_topics = data.topics.filter(t => t.subject_id == scores_currentSubjectId);
}

async function loadScoresForStudents() {
  scores_scores = {};
  for (const s of scores_students) {
    const sc = await fetch(`/api/scores/student/${s.id}`).then(r => r.json());
    scores_scores[s.id] = sc;
  }
}

async function loadFinalScoresForStudents() {
  scores_final = {};
  for (const s of scores_students) {
    const fin = await fetch(`/api/scores/student/${s.id}/final`).then(r => r.json());
    scores_final[s.id] = fin;
  }
}

function renderScoresTable() {
  const container = document.getElementById('scoresTableContainer');
  if (!scores_students.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Нет учеников</p>';
    return;
  }

  let filtered = scores_students;
  if (scores_searchTerm) filtered = scores_students.filter(s => s.full_name.toLowerCase().includes(scores_searchTerm));

  if (scores_currentSubjectId === 'all') {
    renderAllSubjectsTable(container, filtered);
  } else {
    renderSubjectTable(container, filtered);
  }
}

function renderAllSubjectsTable(container, students) {
  if (!scores_allSubjects.length) return;
  let html = '<div class="scores-table-wrapper"><table class="scores-table all-subjects-table"><thead><tr>';
  html += '<th>№</th><th>Ученик</th>';
  for (const subj of scores_allSubjects) {
    html += `<th>${window.escapeHtml(subj.name)}</th>`;
  }
  html += '<th style="background-color:#106061; color:white;">Итоговая за сборы</th>';
  html += '</tr></thead><tbody>';

  for (let idx = 0; idx < students.length; idx++) {
    const st = students[idx];
    const finals = scores_final[st.id] || {};
    let sum = 0, count = 0;
    html += `<tr data-person-id="${st.id}">`;
    html += `<td class="number-cell">${idx+1}</td>`;
    html += `<td class="student-name">${window.escapeHtml(st.full_name)}</td>`;
    for (const subj of scores_allSubjects) {
      const score = finals[subj.id];
      if (score) {
        sum += score;
        count++;
      }
      html += `<td class="final-score-cell-light">${score !== undefined ? score : '—'}</td>`;
    }
    const overall = count ? Math.round(sum / count) : '—';
    html += `<td class="overall-final-cell" style="background-color:#106061; color:white;">${overall}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderSubjectTable(container, students) {
  if (!scores_topics.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Для выбранного предмета нет тем</p>';
    return;
  }
  const shortTopics = scores_topics.map(t => {
    let short = t.name;
    if (short.length > 25) short = short.slice(0, 22) + '...';
    return short;
  });

  let html = '<div class="scores-table-wrapper" style="overflow-x: auto;">';
  html += '<table class="scores-table subject-table" style="width: 100%; border-collapse: collapse;">';
  html += '<thead><tr>';
  html += '<th style="min-width: 40px;">№</th>';
  html += '<th style="min-width: 90px;">Действия</th>';
  html += '<th style="min-width: 220px; text-align: left;">Ученик</th>';
  html += '<th style="min-width: 180px; text-align: left;">Школа</th>';
  for (let i = 0; i < shortTopics.length; i++) {
    html += `<th style="min-width: 85px;" title="${window.escapeHtml(scores_topics[i].subject_name)}: ${window.escapeHtml(scores_topics[i].name)} (${window.formatDate(scores_topics[i].date)})">${window.escapeHtml(shortTopics[i])}</th>`;
  }
  html += '<th style="min-width: 85px;" class="final-score-header">Итоговая</th>';
  html += '</tr></thead><tbody>';

  for (let idx = 0; idx < students.length; idx++) {
    const st = students[idx];
    const finalScore = (scores_final[st.id] && scores_final[st.id][scores_currentSubjectId]) || '';
    const studentSchool = st.school_name || st.organization || '—';
    html += `<tr data-person-id="${st.id}">`;
    html += `<td class="number-cell" style="text-align: center;">${idx+1}</td>`;
    html += `<td class="actions-cell" style="text-align: center;"><div class="student-actions" style="display: flex; gap: 4px; justify-content: center;">
      <button class="student-grade-btn grade-5" data-person-id="${st.id}" data-grade="5">5</button>
      <button class="student-grade-btn grade-4" data-person-id="${st.id}" data-grade="4">4</button>
      <button class="student-grade-btn grade-3" data-person-id="${st.id}" data-grade="3">3</button>
    </div></td>`;
    html += `<td class="student-name" style="white-space: nowrap;">${window.escapeHtml(st.full_name)}</td>`;
    html += `<td class="school-name" style="white-space: nowrap;">${window.escapeHtml(studentSchool)}</td>`;
    for (const topic of scores_topics) {
      const score = (scores_scores[st.id] && scores_scores[st.id][topic.id]) || '';
      let cls = '';
      if (score === 5) cls = 'score-5';
      else if (score === 4) cls = 'score-4';
      else if (score === 3) cls = 'score-3';
      html += `<td class="score-cell-text ${cls}" style="text-align: center;">${score || '—'}</td>`;
    }
    html += `<td class="final-score-cell-light" style="text-align: center;">${finalScore || '—'}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  container.innerHTML = html;
  attachStudentButtons();
}

function attachStudentButtons() {
  document.querySelectorAll('.student-grade-btn').forEach(btn => {
    btn.removeEventListener('click', handleStudentGrade);
    btn.addEventListener('click', handleStudentGrade);
  });
}

async function handleStudentGrade(e) {
  const btn = e.currentTarget;
  const personId = btn.getAttribute('data-person-id');
  const grade = parseInt(btn.getAttribute('data-grade'));
  if (scores_currentSubjectId === 'all') {
    alert('Массовое проставление оценок доступно только для конкретного предмета.');
    return;
  }
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
  await recalcSingleFinal(personId, scores_currentSubjectId);
  renderScoresTable();
}

async function recalcSingleFinal(personId, subjectId) {
  const resp = await fetch('/api/scores/calculate-final', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({person_id:personId, subject_id:subjectId})
  });
  const data = await resp.json();
  if (!scores_final[personId]) scores_final[personId] = {};
  scores_final[personId][subjectId] = data.finalScore;
}

async function computeAndSaveFinalScores() {
  if (!scores_currentCollectionId || !scores_students.length) {
    alert('Сначала выберите сбор, школу и взвод');
    return;
  }
  showLoader();
  try {
    const topicsResp = await fetch(`/api/topics/${scores_currentCollectionId}`);
    const { topics: allTopics } = await topicsResp.json();
    const topicsBySubject = {};
    for (const t of allTopics) {
      if (!topicsBySubject[t.subject_id]) topicsBySubject[t.subject_id] = [];
      topicsBySubject[t.subject_id].push(t);
    }

    const allScores = {};
    for (const st of scores_students) {
      const sc = await fetch(`/api/scores/student/${st.id}`).then(r => r.json());
      allScores[st.id] = sc;
    }

    const updates = [];
    for (const st of scores_students) {
      for (const subject of scores_allSubjects) {
        const topics = topicsBySubject[subject.id] || [];
        if (!topics.length) continue;
        let sum = 0, count = 0;
        for (const topic of topics) {
          const score = allScores[st.id][topic.id];
          if (score && score >= 1 && score <= 5) {
            sum += score;
            count++;
          }
        }
        if (count === 0) continue;
        const avg = sum / count;
        const finalScore = Math.round(avg);
        updates.push({ person_id: st.id, subject_id: subject.id, score: finalScore });
      }
    }

    if (updates.length) {
      const batchResp = await fetch('/api/scores/batch-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!batchResp.ok) throw new Error('Ошибка при сохранении итоговых оценок');
      await loadFinalScoresForStudents();
      renderScoresTable();
      alert(`Рассчитано и сохранено ${updates.length} итоговых оценок.`);
    } else {
      alert('Нет данных для расчёта итоговых оценок.');
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка при расчёте итоговых оценок: ' + err.message);
  } finally {
    hideLoader();
  }
}

async function bulkPlatoonOperation(score) {
  if (!scores_currentPlatoonId) { alert('Сначала выберите взвод'); return; }
  if (scores_currentSubjectId === 'all') {
    alert('Для массовой операции выберите конкретный предмет (не "Все предметы")');
    return;
  }
  if (score === null && !confirm('Очистить все оценки взвода?')) return;
  showLoader();
  const btns = ['platoonAll5Btn','platoonAll4Btn','platoonAll3Btn','platoonClearBtn'].map(id=>document.getElementById(id));
  btns.forEach(b=>{if(b)b.disabled=true;});
  try {
    if (score !== null) {
      await fetch('/api/scores/bulk-platoon', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({platoonId:scores_currentPlatoonId, score, subjectId: scores_currentSubjectId})
      });
    } else {
      const url = `/api/scores/platoon/${scores_currentPlatoonId}?subjectId=${scores_currentSubjectId}`;
      await fetch(url, {method:'DELETE'});
    }
    await new Promise(r => setTimeout(r, 1000));
    await loadScoresForStudents();
    await loadFinalScoresForStudents();
    renderScoresTable();
  } catch(e) { alert('Ошибка: '+e.message); }
  finally { hideLoader(); updatePlatoonButtonsState(); }
}

async function bulkSchoolOperation(score) {
  if (scores_currentSchoolId === null) {
    alert('Массовая операция для школы недоступна в режиме "Все школы". Выберите конкретную школу.');
    return;
  }
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
    await new Promise(r => setTimeout(r, 1000));
    await loadScoresForStudents();
    await loadFinalScoresForStudents();
    renderScoresTable();
  } catch(e) { alert('Ошибка: '+e.message); }
  finally { hideLoader(); btns.forEach(b=>{if(b)b.disabled=false;}); updateSchoolButtonsState(); }
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
setInterval(()=>{ attachHandlers(); updatePlatoonButtonsState(); updateSchoolButtonsState(); }, 500);