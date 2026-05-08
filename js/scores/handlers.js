import { 
  scores_currentPlatoonId, scores_currentSubjectId, scores_currentSchoolId, 
  scores_students, scores_topics, scores_scores, scores_final,
  scores_currentCollectionId,
  setScores, setFinal 
} from './state.js';
import { showLoader, hideLoader, updatePlatoonButtonsState, updateSchoolButtonsState } from './helpers.js';
import { 
  updateScore, recalcFinalScore, bulkPlatoonUpdate, bulkPlatoonDelete, 
  bulkSchoolUpdate, bulkSchoolDelete, batchFinalScores 
} from './api.js';
import { loadScoresForStudents, loadFinalScoresForStudents } from './loaders.js';
import { renderScoresTable } from './ui.js';

export async function handleStudentGrade(e) {
  const btn = e.currentTarget;
  const personId = btn.getAttribute('data-person-id');
  const grade = parseInt(btn.getAttribute('data-grade'));
  if (scores_currentSubjectId === 'all') {
    alert('Массовое проставление оценок доступно только для конкретного предмета.');
    return;
  }
  for (const topic of scores_topics) {
    if (scores_scores[personId][topic.id] !== grade) {
      await updateScore(personId, topic.id, grade);
      scores_scores[personId][topic.id] = grade;
    }
  }
  await recalcSingleFinal(personId, scores_currentSubjectId);
  renderScoresTable();
}

export async function recalcSingleFinal(personId, subjectId) {
  const data = await recalcFinalScore(personId, subjectId);
  if (!scores_final[personId]) scores_final[personId] = {};
  scores_final[personId][subjectId] = data.finalScore;
  setFinal(scores_final);
}

export async function bulkPlatoonOperation(score) {
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
      await bulkPlatoonUpdate(scores_currentPlatoonId, score, scores_currentSubjectId);
    } else {
      await bulkPlatoonDelete(scores_currentPlatoonId, scores_currentSubjectId);
    }
    await new Promise(r => setTimeout(r, 1000));
    await loadScoresForStudents();
    await loadFinalScoresForStudents();
    renderScoresTable();
  } catch(e) { alert('Ошибка: '+e.message); }
  finally { hideLoader(); updatePlatoonButtonsState(); }
}

export async function bulkSchoolOperation(score) {
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
      await bulkSchoolUpdate(scores_currentSchoolId, score);
    } else {
      await bulkSchoolDelete(scores_currentSchoolId);
    }
    await new Promise(r => setTimeout(r, 1000));
    await loadScoresForStudents();
    await loadFinalScoresForStudents();
    renderScoresTable();
  } catch(e) { alert('Ошибка: '+e.message); }
  finally { hideLoader(); btns.forEach(b=>{if(b)b.disabled=false;}); updateSchoolButtonsState(); }
}

export async function computeAndSaveFinalScores() {
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

    const subjects = await fetch('/api/subjects').then(r => r.json());
    const updates = [];
    for (const st of scores_students) {
      for (const subject of subjects) {
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
      await batchFinalScores(updates);
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

export function attachStudentButtons() {
  document.querySelectorAll('.student-grade-btn').forEach(btn => {
    btn.removeEventListener('click', handleStudentGrade);
    btn.addEventListener('click', handleStudentGrade);
  });
}

export function attachBulkHandlers() {
  const p5 = document.getElementById('platoonAll5Btn');
  const p4 = document.getElementById('platoonAll4Btn');
  const p3 = document.getElementById('platoonAll3Btn');
  const pc = document.getElementById('platoonClearBtn');
  const s5 = document.getElementById('schoolAll5Btn');
  const s4 = document.getElementById('schoolAll4Btn');
  const s3 = document.getElementById('schoolAll3Btn');
  const sc = document.getElementById('schoolClearBtn');
  if (p5) p5.onclick = () => bulkPlatoonOperation(5);
  if (p4) p4.onclick = () => bulkPlatoonOperation(4);
  if (p3) p3.onclick = () => bulkPlatoonOperation(3);
  if (pc) pc.onclick = () => bulkPlatoonOperation(null);
  if (s5) s5.onclick = () => bulkSchoolOperation(5);
  if (s4) s4.onclick = () => bulkSchoolOperation(4);
  if (s3) s3.onclick = () => bulkSchoolOperation(3);
  if (sc) sc.onclick = () => bulkSchoolOperation(null);
}