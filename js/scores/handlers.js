import { 
  scores_currentPlatoonId, scores_currentSubjectId, scores_currentSchoolId, 
  scores_students, scores_topics, scores_scores, scores_final,
  scores_currentCollectionId,
  setScores, setFinal 
} from './state.js';
import { showLoader, hideLoader, updatePlatoonButtonsState, updateSchoolButtonsState } from './helpers.js';
import { 
  updateScore, recalcFinalScore, bulkPlatoonUpdate, bulkPlatoonDelete, 
  bulkSchoolUpdate, bulkSchoolDelete, batchFinalScores, fetchBatchScoresAndFinals 
} from './api.js';
import { loadScoresForStudents, loadFinalScoresForStudents } from './loaders.js';
import { renderScoresTable } from './ui.js';

// ========== Кастомные модалки ==========
function showWarningModal(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:380px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-exclamation-triangle" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.2rem; font-weight:600;">${message}</h2>
        <button class="btn add" id="warningOkBtn" style="min-width:100px;">ОК</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('#warningOkBtn').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); resolve(); }
    });
  });
}

function showErrorModal(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:380px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-times" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.2rem; font-weight:600;">${message}</h2>
        <button class="btn cancel" id="errorOkBtn" style="min-width:100px;">ОК</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('#errorOkBtn').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); resolve(); }
    });
  });
}

function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:380px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-question" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.2rem; font-weight:600;">${message}</h2>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button class="btn cancel" id="confirmCancelBtn" style="padding:10px 24px;">Отмена</button>
          <button class="btn add" id="confirmOkBtn" style="padding:10px 24px;">ОК</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const closeModal = (result) => {
      modal.remove();
      resolve(result);
    };
    modal.querySelector('#confirmOkBtn').addEventListener('click', () => closeModal(true));
    modal.querySelector('#confirmCancelBtn').addEventListener('click', () => closeModal(false));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(false);
    });
  });
}

// ========== Обработчики нажатий на кнопки "5/4/3" для конкретного ученика ==========
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

// ========== Массовые операции ==========
export async function bulkPlatoonOperation(score) {
  if (!scores_currentPlatoonId) { alert('Сначала выберите взвод'); return; }
  if (scores_currentSubjectId === 'all') {
    alert('Для массовой операции выберите конкретный предмет (не "Все предметы")');
    return;
  }
  if (score === null) {
    const confirmed = await showConfirmModal('Очистить все оценки взвода?');
    if (!confirmed) return;
  }
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
  } catch(e) { await showErrorModal('Ошибка: ' + e.message); }
  finally { hideLoader(); updatePlatoonButtonsState(); }
}

export async function bulkSchoolOperation(score) {
  if (scores_currentSchoolId === null) {
    alert('Массовая операция для школы недоступна в режиме "Все школы". Выберите конкретную школу.');
    return;
  }
  if (!scores_currentSchoolId) { alert('Сначала выберите школу'); return; }
  
  // Предупреждение для больших школ
  if (scores_students.length > 100) {
    await showWarningModal(
      `В выбранной школе ${scores_students.length} учеников. Выполнение массовой операции может занять около минуты. Пожалуйста, подождите.`
    );
  }

  if (score === null) {
    const confirmed = await showConfirmModal('Очистить все оценки школы?');
    if (!confirmed) return;
  }
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
  } catch(e) { 
    await showErrorModal('Ошибка: ' + e.message);
  }
  finally { 
    hideLoader(); 
    btns.forEach(b=>{if(b)b.disabled=false;}); 
    updateSchoolButtonsState(); 
  }
}

// ========== Расчёт итоговых оценок ==========
export async function computeAndSaveFinalScores() {
  if (!scores_currentCollectionId || !scores_students.length) {
    alert('Сначала выберите сбор, школу и взвод');
    return;
  }
  showLoader();
  try {
    const collectionId = scores_currentCollectionId;
    const studentIds = scores_students.map(s => s.id);

    // 1. Получаем предметы и темы одним запросом
    const [subjects, topicsData] = await Promise.all([
      fetch('/api/subjects').then(r => r.json()),
      fetch(`/api/topics/${collectionId}`).then(r => r.json())
    ]);
    const allTopics = topicsData.topics;
    const topicsBySubject = {};
    for (const t of allTopics) {
      if (!topicsBySubject[t.subject_id]) topicsBySubject[t.subject_id] = [];
      topicsBySubject[t.subject_id].push(t);
    }

    // 2. Пакетно загружаем оценки всех учеников
    const { scores: allScores, finals: allFinals } = await fetchBatchScoresAndFinals(studentIds);

    // 3. Вычисляем итоговые
    const updates = [];
    for (const st of scores_students) {
      for (const subject of subjects) {
        const topics = topicsBySubject[subject.id] || [];
        if (!topics.length) continue;
        let sum = 0, count = 0;
        for (const topic of topics) {
          const sc = allScores[st.id]?.[topic.id];
          if (sc && sc >= 1 && sc <= 5) {
            sum += sc;
            count++;
          }
        }
        if (count === 0) continue;
        const avg = sum / count;
        const finalScore = Math.round(avg);
        updates.push({ person_id: st.id, subject_id: subject.id, score: finalScore });
      }
    }

    if (updates.length === 0) {
      await showWarningModal('Нет данных для расчёта итоговых оценок.');
      return;
    }

    // 4. Разбиваем на чанки по 200 и отправляем
    const chunkSize = 200;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      try {
        await batchFinalScores(chunk);
      } catch (batchError) {
        await showErrorModal('Ошибка сохранения итоговых оценок: ' + batchError.message);
        return;
      }
    }

    // 5. Обновляем таблицу
    await loadFinalScoresForStudents();
    renderScoresTable();
    await showWarningModal(`Рассчитано и сохранено ${updates.length} итоговых оценок.`);
  } catch (err) {
    console.error(err);
    await showErrorModal('Ошибка при расчёте итоговых оценок: ' + err.message);
  } finally {
    hideLoader();
  }
}

// ========== Прикрепление обработчиков ==========
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