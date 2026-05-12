import { truncateText, generateWeekDays } from './helpers.js';
import { fetchSubjects, addTopic, updateTopic, deleteTopic } from './api.js';

// Состояние модуля (будет установлено из main.js)
let topics_currentCollectionId = null;
let topics_currentCollection = null;
let topics_subjects = [];
let topics_topics = [];
let topics_weekDays = [];

export function setTopicsState(collectionId, collection, subjects, topics, weekDays) {
  topics_currentCollectionId = collectionId;
  topics_currentCollection = collection;
  topics_subjects = subjects;
  topics_topics = topics;
  topics_weekDays = weekDays;
}

export function renderTopicsTable() {
  const container = document.getElementById('topicsContent');
  if (!container) return;
  if (!topics_subjects.length) {
    container.innerHTML = '<p style="text-align:center;">Нет предметов. Обратитесь к администратору.</p>';
    return;
  }
  let html = `
    <div style="overflow-x:auto;">
      <table class="topics-table">
        <thead>
          <tr><th>Предмет</th><th>Тема</th><th>День недели</th><th style="width:100px">Действия</th></tr>
        </thead>
        <tbody>
  `;
  topics_subjects.forEach(subj => {
    const subjectTopics = topics_topics.filter(t => t.subject_id === subj.id);
    if (subjectTopics.length === 0) {
      html += `<tr><td colspan="4" style="color:#999;">Нет тем</td></tr>`;
    } else {
      subjectTopics.forEach(topic => {
        const dayDisplay = topic.date ? (topics_weekDays.find(d => d.date === topic.date)?.display || topic.date) : '—';
        html += `
          <tr data-topic-id="${topic.id}">
            <td>${window.escapeHtml(subj.name)}</td>
            <td>${window.escapeHtml(topic.name)}</td>
            <td>${dayDisplay}</td>
            <td>
              <button class="edit-topic-btn" data-id="${topic.id}"><i class="fas fa-edit"></i></button>
              <button class="delete-topic-btn" data-id="${topic.id}"><i class="fas fa-trash-alt"></i></button>
              </td>
          </tr>
        `;
      });
    }
  });
  html += `</tbody>
      </table>
    </div>`;
  container.innerHTML = html;
  attachTopicEvents();
}

function attachTopicEvents() {
  document.querySelectorAll('.edit-topic-btn').forEach(btn => {
    btn.removeEventListener('click', handleEditClick);
    btn.addEventListener('click', handleEditClick);
  });
  document.querySelectorAll('.delete-topic-btn').forEach(btn => {
    btn.removeEventListener('click', handleDeleteClick);
    btn.addEventListener('click', handleDeleteClick);
  });
}

async function handleEditClick(e) {
  const btn = e.currentTarget;
  const topicId = btn.getAttribute('data-id');
  if (topicId) await openEditTopicModal(topicId);
}

async function handleDeleteClick(e) {
  const btn = e.currentTarget;
  const topicId = btn.getAttribute('data-id');
  if (topicId) {
    const confirmed = await showConfirmModal('Удалить тему? Все оценки по этой теме также будут удалены.');
    if (confirmed) {
      try {
        await deleteTopic(topicId);
        if (window.__topicsReloadData) await window.__topicsReloadData();
      } catch (err) {
        alert('Не удалось удалить тему: ' + err.message);
      }
    }
  }
}

// Кастомное модальное окно подтверждения с кнопками ОК и Отмена
function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:380px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-question" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.2rem; font-weight:600; color:inherit;">${message}</h2>
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

export function renderSchedule() {
  const scheduleDiv = document.getElementById('scheduleContent');
  if (!scheduleDiv) return;
  if (!topics_weekDays.length) {
    scheduleDiv.innerHTML = '<p>Нет данных о днях сборов</p>';
    return;
  }
  let html = '';
  for (const day of topics_weekDays) {
    const dayTopics = topics_topics.filter(t => t.date === day.date);
    html += `
      <div class="schedule-day">
        <div class="schedule-day-header">${day.display}</div>
        <div class="schedule-day-topics">
          ${dayTopics.length ? dayTopics.map(t => `<div class="schedule-topic"><strong>${window.escapeHtml(t.subject_name)}</strong>: ${truncateText(t.name, 70)}</div>`).join('') : '<div class="schedule-empty">Нет занятий</div>'}
        </div>
      </div>
    `;
  }
  scheduleDiv.innerHTML = html;
}

export async function openAddTopicModal(reloadDataCallback) {
  if (!topics_currentCollectionId) {
    alert('Сначала выберите сбор');
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>Добавить тему</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <form id="addTopicForm">
          <div class="form-group">
            <label>Предмет</label>
            <select id="topicSubjectId" required>
              ${topics_subjects.map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Название темы</label>
            <input type="text" id="topicName" required>
          </div>
          <div class="form-group">
            <label>День недели</label>
            <select id="topicDay" required>
              <option value="">-- Выберите день --</option>
              ${topics_weekDays.map(d => `<option value="${d.date}">${d.display}</option>`).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel">Отмена</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
  modal.querySelector('#addTopicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject_id = document.getElementById('topicSubjectId').value;
    const name = document.getElementById('topicName').value.trim();
    const date = document.getElementById('topicDay').value;
    if (!name) { alert('Введите название темы'); return; }
    if (!date) { alert('Выберите день недели'); return; }
    try {
      await addTopic(topics_currentCollectionId, subject_id, name, date);
      closeModal();
      if (reloadDataCallback) await reloadDataCallback();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  });
}

export async function openEditTopicModal(topicId, reloadDataCallback) {
  const topic = topics_topics.find(t => t.id == topicId);
  if (!topic) {
    alert('Тема не найдена');
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>Редактировать тему</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <form id="editTopicForm">
          <div class="form-group">
            <label>Предмет</label>
            <select id="editTopicSubjectId" required>
              ${topics_subjects.map(s => `<option value="${s.id}" ${s.id == topic.subject_id ? 'selected' : ''}>${window.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Название темы</label>
            <input type="text" id="editTopicName" value="${window.escapeHtml(topic.name)}" required>
          </div>
          <div class="form-group">
            <label>День недели</label>
            <select id="editTopicDay" required>
              <option value="">-- Выберите день --</option>
              ${topics_weekDays.map(d => `<option value="${d.date}" ${d.date === topic.date ? 'selected' : ''}>${d.display}</option>`).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel">Отмена</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
  modal.querySelector('#editTopicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject_id = document.getElementById('editTopicSubjectId').value;
    const name = document.getElementById('editTopicName').value.trim();
    const date = document.getElementById('editTopicDay').value;
    if (!name) { alert('Введите название темы'); return; }
    if (!date) { alert('Выберите день недели'); return; }
    try {
      await updateTopic(topicId, subject_id, name, date);
      closeModal();
      if (reloadDataCallback) await reloadDataCallback();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  });
}

export async function openFullScheduleModal() {
  if (!topics_weekDays.length || !topics_topics.length) {
    alert('Нет данных для отображения');
    return;
  }

  const days = topics_weekDays;
  const subjects = topics_subjects;
  const dayTopicMap = {};
  for (const day of days) dayTopicMap[day.date] = {};
  for (const topic of topics_topics) {
    if (topic.date && dayTopicMap[topic.date]) {
      dayTopicMap[topic.date][topic.subject_id] = topic.name;
    }
  }

  let html = '<div class="full-schedule-wrapper"><table class="full-schedule-table">';
  html += '<thead><tr><th>Предмет</th>';
  for (const day of days) html += `<th>${day.display}</th>`;
  html += '</tr></thead><tbody>';
  for (const subject of subjects) {
    html += `<tr><td class="full-schedule-subject">${window.escapeHtml(subject.name)}</td>`;
    for (const day of days) {
      const topicName = dayTopicMap[day.date][subject.id];
      html += `<td class="full-schedule-topic">${topicName ? window.escapeHtml(topicName) : '—'}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 90%; width: auto; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <h2>Полное расписание</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="flex:1; overflow: auto; padding: 16px;">${html}</div>
      <div class="form-actions" style="padding: 16px 24px;">
        <button id="fullSchedulePrintBtn" class="btn add">Печать</button>
        <button id="fullScheduleCloseBtn" class="btn cancel">Отмена</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('#fullScheduleCloseBtn').addEventListener('click', closeModal);
  modal.querySelector('#fullSchedulePrintBtn').addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Расписание</title><style>body{font-family:Inter,sans-serif;} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body>' + html + '</body></html>');
    printWindow.document.close();
    printWindow.print();
  });
}