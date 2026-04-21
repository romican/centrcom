// ========== ЗАНЯТИЯ (ТЕМЫ ПО ПРЕДМЕТАМ) ==========
let topics_currentCollectionId = null;
let topics_currentCollection = null;
let topics_subjects = [];
let topics_topics = [];
let topics_weekDays = [];

window.renderTopics = async function() {
  console.log('renderTopics вызван');
  window.contentBody.innerHTML = `
    <div class="topics-layout">
      <div class="topics-sidebar">
        <div class="topics-sidebar-header">
          <label>Выберите сбор:</label>
          <select id="topicsCollectionSelect"></select>
          <div class="button-group">
            <button id="addTopicBtn" class="btn add"><i class="fas fa-plus"></i> Добавить тему</button>
            <button id="autoTopicsBtn" class="btn auto"><i class="fas fa-magic"></i> Темы автоматически</button>
          </div>
        </div>
      </div>
      <div class="topics-main">
        <div id="topicsContent">Выберите сбор</div>
      </div>
      <div class="topics-schedule-panel">
        <h3>Расписание по дням</h3>
        <div id="scheduleContent">Загрузка...</div>
      </div>
    </div>
  `;

  // Даём браузеру время на отрисовку DOM
  await new Promise(resolve => setTimeout(resolve, 0));

  const select = document.getElementById('topicsCollectionSelect');
  if (!select) {
    console.error('Элемент topicsCollectionSelect не найден');
    return;
  }

  // Загрузка списка сборов
  const resp = await fetch('/api/collections');
  const collections = await resp.json();
  if (collections.length === 0) {
    select.innerHTML = '<option>-- Нет сборов, создайте в разделе "Сборы" --</option>';
    return;
  }
  select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}" data-start="${c.date_start}" data-end="${c.date_end}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  
  // Автовыбор сбора, в который попадает сегодняшняя дата
  const today = new Date().toISOString().slice(0,10);
  let autoSelectedId = null;
  for (const c of collections) {
    if (c.date_start <= today && c.date_end >= today) {
      autoSelectedId = c.id;
      break;
    }
  }
  if (autoSelectedId) {
    select.value = autoSelectedId;
    topics_currentCollectionId = autoSelectedId;
    await loadTopicsData();
  }

  select.addEventListener('change', async (e) => {
    topics_currentCollectionId = e.target.value;
    if (topics_currentCollectionId) {
      await loadTopicsData();
    } else {
      const contentDiv = document.getElementById('topicsContent');
      if (contentDiv) contentDiv.innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
      const scheduleDiv = document.getElementById('scheduleContent');
      if (scheduleDiv) scheduleDiv.innerHTML = 'Выберите сбор';
    }
  });

  const addBtn = document.getElementById('addTopicBtn');
  if (addBtn) addBtn.addEventListener('click', () => openAddTopicModal());
  const autoBtn = document.getElementById('autoTopicsBtn');
  if (autoBtn) autoBtn.addEventListener('click', async () => {
    if (!topics_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    if (!confirm('Автоматическое копирование тем из предыдущего сбора (по дням недели) заменит все текущие темы. Продолжить?')) return;
    await autoCopyTopicsFromPreviousCollection();
  });
};

async function loadTopicsData() {
  if (!topics_currentCollectionId) return;
  try {
    const collectionsResp = await fetch('/api/collections');
    const allCollections = await collectionsResp.json();
    topics_currentCollection = allCollections.find(c => c.id == topics_currentCollectionId);
    if (!topics_currentCollection) throw new Error();
    
    topics_weekDays = generateWeekDays(topics_currentCollection.date_start, topics_currentCollection.date_end);
    
    const dataResp = await fetch(`/api/topics/${topics_currentCollectionId}`);
    const data = await dataResp.json();
    topics_subjects = data.subjects;
    topics_topics = data.topics;
    
    renderTopicsTable();
    renderSchedule();
  } catch (err) {
    console.error(err);
    const contentDiv = document.getElementById('topicsContent');
    if (contentDiv) contentDiv.innerHTML = '<p style="color:red;">Ошибка загрузки тем</p>';
    const scheduleDiv = document.getElementById('scheduleContent');
    if (scheduleDiv) scheduleDiv.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
  }
}

function generateWeekDays(dateStart, dateEnd) {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const days = [];
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  let current = new Date(start);
  while (current <= end) {
    const dayName = weekdays[current.getDay()];
    const dateStr = current.toISOString().slice(0,10);
    days.push({
      dayName: dayName,
      date: dateStr,
      display: `${dayName} (${window.formatDate(dateStr)})`
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function renderTopicsTable() {
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
  html += `</tbody></table></div>`;
  container.innerHTML = html;

  document.querySelectorAll('.edit-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topicId = btn.getAttribute('data-id');
      openEditTopicModal(topicId);
    });
  });
  document.querySelectorAll('.delete-topic-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить тему?')) return;
      const topicId = btn.getAttribute('data-id');
      await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
      await loadTopicsData();
    });
  });
}

function renderSchedule() {
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
          ${dayTopics.length ? dayTopics.map(t => `<div class="schedule-topic"><strong>${window.escapeHtml(t.subject_name)}</strong>: ${window.escapeHtml(t.name)}</div>`).join('') : '<div class="schedule-empty">Нет занятий</div>'}
        </div>
      </div>
    `;
  }
  scheduleDiv.innerHTML = html;
}

async function openAddTopicModal() {
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
    await fetch(`/api/topics/${topics_currentCollectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id, name, date })
    });
    closeModal();
    await loadTopicsData();
  });
}

async function openEditTopicModal(topicId) {
  const resp = await fetch(`/api/topics/${topicId}`);
  const topic = await resp.json();
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
    await fetch(`/api/topics/${topicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id, name, date })
    });
    closeModal();
    await loadTopicsData();
  });
}

async function autoCopyTopicsFromPreviousCollection() {
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const currentCollection = allCollections.find(c => c.id == topics_currentCollectionId);
  if (!currentCollection) return;
  const previousCollections = allCollections.filter(c => c.date_end < currentCollection.date_start).sort((a,b) => b.date_end - a.date_end);
  if (!previousCollections.length) {
    alert('Нет предыдущих сборов для копирования');
    return;
  }
  const previousCollection = previousCollections[0];
  const prevTopicsResp = await fetch(`/api/topics/${previousCollection.id}`);
  const prevData = await prevTopicsResp.json();
  const prevTopics = prevData.topics;
  if (!prevTopics.length) {
    alert('В предыдущем сборе нет тем');
    return;
  }
  for (const topic of topics_topics) {
    await fetch(`/api/topics/${topic.id}`, { method: 'DELETE' });
  }
  const weekdaysMap = {};
  for (const day of topics_weekDays) {
    weekdaysMap[day.dayName] = day.date;
  }
  for (const topic of prevTopics) {
    const prevDate = topic.date;
    if (!prevDate) continue;
    const prevDayName = new Date(prevDate).toLocaleDateString('ru-RU', { weekday: 'long' });
    const targetDate = weekdaysMap[prevDayName];
    if (targetDate) {
      await fetch(`/api/topics/${topics_currentCollectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: topic.subject_id,
          name: topic.name,
          date: targetDate
        })
      });
    }
  }
  await loadTopicsData();
  alert('Темы скопированы из предыдущего сбора');
}