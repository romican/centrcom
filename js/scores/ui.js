import { scores_allSubjects, scores_final, scores_students, scores_searchTerm, scores_currentSubjectId, scores_currentSubjectName, scores_currentSchoolName, scores_scores, scores_topics } from './state.js';
import { attachStudentButtons } from './handlers.js';

export function renderScoresTable() {
  const container = document.getElementById('scoresTableContainer');
  if (!container) return;
  if (!scores_students.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Нет учеников</p>';
    return;
  }

  let filtered = scores_students;
  if (scores_searchTerm) {
    filtered = scores_students.filter(s => s.full_name.toLowerCase().includes(scores_searchTerm));
  }

  if (scores_currentSubjectId === 'all') {
    renderAllSubjectsTable(container, filtered);
  } else {
    renderSubjectTable(container, filtered);
  }
  attachStudentButtons();
}

function renderAllSubjectsTable(container, students) {
  if (!scores_allSubjects.length) return;
  let html = '<div class="scores-table-wrapper"><table class="scores-table all-subjects-table"><thead><tr>';
  html += '<th>№</th><th>Ученик</th>';
  for (const subj of scores_allSubjects) {
    html += `<th>${window.escapeHtml(subj.name)}</th>`;
  }
  html += '<th style="background-color:#106061; color:white;">Итоговая за сборы</th>';
  html += '<tr></thead><tbody>';

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
    html += `<tr>`;
  }
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}