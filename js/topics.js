// ========== ЗАНЯТИЯ (ТЕМЫ ПО ПРЕДМЕТАМ) ==========
let topics_currentCollectionId = null;
let topics_currentCollection = null;
let topics_subjects = [];
let topics_topics = [];
let topics_weekDays = [];
// ========== ФИКСИРОВАННОЕ РАСПИСАНИЕ ЗАНЯТИЙ ==========
const TOPICS_SCHEDULE = [
  // Строевая подготовка
  { subjectName: 'Строевая подготовка', day: 'Понедельник', topicName: 'Тема 1 Практическое занятие. Строевые приемы и движение без оружия. Выполнение команд: "Становись","Равняйсь""Смирно", "Вольно", "Заправиться", "Отставить", "Головные уборы снять (одеть)". Повороты на месте. Движение строевым шагом' },
  { subjectName: 'Строевая подготовка', day: 'Вторник', topicName: 'Тема 2 Практическое занятие. Строевые приемы и движения без оружия. Выполнение воинского приветствия на месте и в движении.' },
  { subjectName: 'Строевая подготовка', day: 'Среда', topicName: 'Тема 3 Практическое занятие. Построения, перестроения,повороты, перемена направления движения. Выполнения воинского приветствия в строю на месте и в движении.' },
  { subjectName: 'Строевая подготовка', day: 'Четверг', topicName: 'Тема 4 Практическое занятие. Строи подразделений в пешем порядке. Развернутый и походный строй взвода. Смотр строя и песни.' },

  // Радиационная, химическая и биологическая защита
  { subjectName: 'Радиационная, химическая и биологическая защита', day: 'Вторник', topicName: 'Тема 1 Практическое занятие. Средства индивидуальной защиты и пользование ими.' },
  { subjectName: 'Радиационная, химическая и биологическая защита', day: 'Среда', topicName: 'Тема 2 Практическое занятие. Способы действий личного состава в условиях радиационного, химического заражения местности.' },

  // Обеспечение безопасности военной службы
  { subjectName: 'Обеспечение безопасности военной службы', day: 'Понедельник', topicName: 'Тема 1 Показное (комплексное) занятие. Основные мероприятия по обеспечению безопасности военной службы.' },

  // Военно-медицинская подготовка
  { subjectName: 'Военно-медицинская подготовка', day: 'Вторник', topicName: 'Тема 1 Практическое занятие. Основы сохранения здоровья военнослужащих. Оказание первой помощи. Неотложные реанимационные мероприятия.' },
  { subjectName: 'Военно-медицинская подготовка', day: 'Среда', topicName: 'Практическое занятие №2. Основы сохранения здоровья военнослужащих. Оказание первой помощи. Неотложные реанимационные мероприятия.' },

  // Общевоинские уставы ВС РФ
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Понедельник', topicName: 'Тема 1 Практическое занятие. Военнослужащие Вооруженных Сил Российской Федерации и взаимоотношения между ними. Размещение военнослужащих' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Понедельник', topicName: 'Тема 2 Практическое занятие. Распределение времени и внутренний порядок. Распорядок дня и регламент служебного времени.' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Понедельник', topicName: 'Тема 3 Практическое занятие. Обязанности лиц суточного наряда. Назначение суточного наряда, его состав и вооружение. Подчиненность и обязанности дневального по роте.' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Понедельник', topicName: 'Тема 4 Практическое занятие. Обязанности дежурного по роте. Порядок приема и сдачи дежурства, действия при подъеме по тревоге, прибытие в роту офицеров и старшин.' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Среда', topicName: 'Тема 5 Практическое занятие. Воинская дисциплина. Поощрения и дисциплинарные взыскания. Права военнослужащего. Дисциплинарная, административная и уголовная ответственность военнослужащих.' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Четверг', topicName: 'Тема 6 Практическое занятие. Комната для хранения оружия, ее оборудование. Порядок хранения оружия и боеприпасов. Допуск личного состава в комнату для хранения оружия. Порядок выдачи оружия и боеприпасов.' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Четверг', topicName: 'Тема 7 Практическое занятие. Несение караульной службы - выполнение боевой задачи, состав караула. Часовой и караульный. Обязанности часового. Пост и его оборудование' },
  { subjectName: 'Общевоинские уставы ВС РФ', day: 'Пятница', topicName: 'Тема 8 Практическое занятие. Действия личного состава по команде «Сбор» «Тревога»' },

  // Тактическая подготовка
  { subjectName: 'Тактическая подготовка', day: 'Вторник', topicName: 'Тема 1 Практическое занятие. Движения солдата в бою. Передвижения на поле боя.' },
  { subjectName: 'Тактическая подготовка', day: 'Четверг', topicName: 'Тема 2 Тактико-специальное занятие. Показ боевой техники и вооружения, образцов стрелкового оружия. Основы боевого применения средств специальных войск.' },
  { subjectName: 'Тактическая подготовка', day: 'Четверг', topicName: 'Тема 3 Тактико-специальное занятие. Передвижение на поле боя. Выбор места и скрытное расположение на нем для наблюдения и ведения огня.' },

  // Физическая подготовка
  { subjectName: 'Физическая подготовка', day: 'Понедельник', topicName: 'Тема 1 Практическое занятие. Разучивание и совершенствование физических упражнений, выполняемых на утренней физической зарядке' },
  { subjectName: 'Физическая подготовка', day: 'Вторник', topicName: 'Тема 2 Практическое занятие. Совершенствование и контроль упражнения в беге на 100 м (челночный бег 10 по 10 м) и в прыжках в длину с места.' },
  { subjectName: 'Физическая подготовка', day: 'Вторник', topicName: 'Тема 3 Практическое занятие. Совершенствование упражнений на гимнастических снарядах и контроль упражнения в подтягивании на перекладине и в сгибании и разгибании рук в упоре.' },
  { subjectName: 'Физическая подготовка', day: 'Среда', topicName: 'Тема 4 Практическое занятие. Совершенствование и контроль упражнения в беге на 1 км.' },
  { subjectName: 'Физическая подготовка', day: 'Пятница', topicName: 'Тема 5 Практическое занятие. Комплексное занятие.' },

  // Огневая подготовка
  { subjectName: 'Огневая подготовка', day: 'Вторник', topicName: 'Тема 1 Практическое занятие. Материальная часть автомата. Назначение, боевые свойства и устройство автомата, разборка и сборка. Работа частей и механизмов автомата при заряжании и стрельбе. Уход за стрелковым оружием, хранение и сбережение' },
  { subjectName: 'Огневая подготовка', day: 'Среда', topicName: 'Тема 2 Практическое занятие. Требования безопасности при проведении занятий по огневой подготовке. Правила стрельбы из стрелкового оружия.' },
  { subjectName: 'Огневая подготовка', day: 'Среда', topicName: 'Тема 3 Практическое занятие. Требования безопасности при проведении занятий по огневой подготовке. Правила стрельбы из стрелкового оружия.' },
  { subjectName: 'Огневая подготовка', day: 'Четверг', topicName: 'Тема 4 Практическое занятие. Требования безопасности при проведении занятий по огневой подготовке. Изготовка для стрельбы лежа, порядок заряжания и разряжению оружия.' },
  { subjectName: 'Огневая подготовка', day: 'Пятница', topicName: 'Темпа 5 Практическое занятие. Выполнение упражнений начальных стрельб' },
  { subjectName: 'Огневая подготовка', day: 'Пятница', topicName: 'Темпа 5 Практическое занятие. Выполнение упражнений начальных стрельб' },
  { subjectName: 'Огневая подготовка', day: 'Пятница', topicName: 'Темпа 5 Практическое занятие. Выполнение упражнений начальных стрельб' },
  { subjectName: 'Огневая подготовка', day: 'Пятница', topicName: 'Темпа 5 Практическое занятие. Выполнение упражнений начальных стрельб' }
];
// Вспомогательная функция авто-выбора сбора (текущий или последний)
function getAutoSelectCollectionId(collections) {
  if (!collections.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const current = collections.find(c => c.date_start <= today && c.date_end >= today);
  if (current) return current.id;
  const sorted = [...collections].sort((a,b) => new Date(b.date_end) - new Date(a.date_end));
  return sorted[0].id;
}

window.renderTopics = async function() {
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
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3>Расписание по дням</h3>
          <button id="openFullScheduleBtn" class="btn-icon" title="Полное расписание"><i class="fas fa-calendar-alt"></i></button>
        </div>
        <div id="scheduleContent">Загрузка...</div>
      </div>
    </div>
  `;

  const select = document.getElementById('topicsCollectionSelect');
  if (!select) return;

  const resp = await fetch('/api/collections');
  const collections = await resp.json();
  if (collections.length === 0) {
    select.innerHTML = '<option>-- Нет сборов, создайте в разделе "Сборы" --</option>';
    return;
  }
  select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}" data-start="${c.date_start}" data-end="${c.date_end}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
  
  const autoSelectedId = getAutoSelectCollectionId(collections);
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
      document.getElementById('topicsContent').innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
      document.getElementById('scheduleContent').innerHTML = 'Выберите сбор';
    }
  });

  document.getElementById('addTopicBtn').addEventListener('click', () => openAddTopicModal());
document.getElementById('autoTopicsBtn').addEventListener('click', async () => {
  if (!topics_currentCollectionId) {
    alert('Сначала выберите сбор');
    return;
  }
  await autoAddTopicsFromSchedule();
});

  document.getElementById('openFullScheduleBtn').addEventListener('click', () => openFullScheduleModal());
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
    document.getElementById('topicsContent').innerHTML = '<p style="color:red;">Ошибка загрузки тем</p>';
    document.getElementById('scheduleContent').innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
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
  html += `</tbody>
        </table>
    </div>`;
  container.innerHTML = html;
  
  // Привязываем события после рендера
  attachTopicEvents();
}

function attachTopicEvents() {
  // Кнопки редактирования
  document.querySelectorAll('.edit-topic-btn').forEach(btn => {
    btn.removeEventListener('click', window.handleEditTopicClick);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const topicId = btn.getAttribute('data-id');
      if (topicId) openEditTopicModal(topicId);
    });
  });
  // Кнопки удаления
  document.querySelectorAll('.delete-topic-btn').forEach(btn => {
    btn.removeEventListener('click', window.handleDeleteTopicClick);
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const topicId = btn.getAttribute('data-id');
      if (topicId && confirm('Удалить тему? Все оценки по этой теме также будут удалены.')) {
        await deleteTopic(topicId);
      }
    });
  });
}

async function deleteTopic(topicId) {
  try {
    const resp = await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Ошибка удаления');
    // Перезагружаем данные текущего сбора
    await loadTopicsData();
  } catch (err) {
    alert('Не удалось удалить тему: ' + err.message);
  }
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
          ${dayTopics.length ? dayTopics.map(t => `<div class="schedule-topic"><strong>${window.escapeHtml(t.subject_name)}</strong>: ${truncateText(t.name, 70)}</div>`).join('') : '<div class="schedule-empty">Нет занятий</div>'}
        </div>
      </div>
    `;
  }
  scheduleDiv.innerHTML = html;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
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
    await fetch(`/api/topics/${topicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id, name, date })
    });
    closeModal();
    await loadTopicsData();
  });
}

async function autoAddTopicsFromSchedule() {
  if (!topics_currentCollectionId) {
    alert('Сначала выберите сбор');
    return;
  }
  if (!confirm('Автоматическое добавление тем по расписанию заменит все текущие темы. Продолжить?')) return;

  // Получить информацию о текущем сборе
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const currentCollection = allCollections.find(c => c.id == topics_currentCollectionId);
  if (!currentCollection) {
    alert('Ошибка загрузки данных сбора');
    return;
  }

  const startDate = new Date(currentCollection.date_start);
  // Убедимся, что первый день сбора – понедельник (на всякий случай проверим)
  const startDay = startDate.getDay(); // 1 = понедельник? в JS воскресенье = 0, понедельник = 1
  if (startDay !== 1) {
    alert('Дата начала сбора не является понедельником. Сбор должен начинаться с понедельника.');
    return;
  }

  // Маппинг дней недели (русские названия) в число дней от понедельника
  const dayMapping = {
    'Понедельник': 0,
    'Вторник': 1,
    'Среда': 2,
    'Четверг': 3,
    'Пятница': 4
  };

  // Получаем все предметы из БД для быстрого поиска ID
  const allSubjects = await fetch('/api/subjects').then(r => r.json());
  const subjectMap = new Map();
  allSubjects.forEach(s => subjectMap.set(s.name, s.id));

  // Удаляем все существующие темы текущего сбора
  for (const topic of topics_topics) {
    await fetch(`/api/topics/${topic.id}`, { method: 'DELETE' });
  }

  let addedCount = 0;
  // Проходим по расписанию и создаём темы
  for (const scheduleItem of TOPICS_SCHEDULE) {
    const subjectId = subjectMap.get(scheduleItem.subjectName);
    if (!subjectId) {
      console.warn(`Предмет "${scheduleItem.subjectName}" не найден в БД, пропускаем`);
      continue;
    }
    const dayOffset = dayMapping[scheduleItem.day];
    if (dayOffset === undefined) {
      console.warn(`Неизвестный день "${scheduleItem.day}" в расписании`);
      continue;
    }
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().slice(0, 10);
    // Проверяем, не выходит ли дата за пределы сбора (если сбор короткий, например, меньше 5 дней)
    if (targetDate > new Date(currentCollection.date_end)) {
      console.warn(`Занятие ${scheduleItem.topicName} (${scheduleItem.day}) выходит за дату окончания сбора, пропущено`);
      continue;
    }
    await fetch(`/api/topics/${topics_currentCollectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: subjectId,
        name: scheduleItem.topicName,
        date: dateStr
      })
    });
    addedCount++;
  }

  await loadTopicsData();
  alert(`Темы добавлены по расписанию. Добавлено ${addedCount} тем.`);
}

function openFullScheduleModal() {
  if (!topics_weekDays.length || !topics_topics.length) {
    alert('Нет данных для отображения');
    return;
  }

  const days = topics_weekDays;
  const subjects = topics_subjects;
  
  // Строим карту: день -> предмет -> название темы
  const dayTopicMap = {};
  for (const day of days) {
    dayTopicMap[day.date] = {};
  }
  for (const topic of topics_topics) {
    if (topic.date && dayTopicMap[topic.date]) {
      dayTopicMap[topic.date][topic.subject_id] = topic.name;
    }
  }

  // Создаём таблицу
  let html = '<div class="full-schedule-wrapper"><table class="full-schedule-table">';
  html += '<thead><tr><th>Предмет</th>';
  for (const day of days) {
    html += `<th>${day.display}</th>`;
  }
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
      <div style="flex:1; overflow: auto; padding: 16px;">
        ${html}
      </div>
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