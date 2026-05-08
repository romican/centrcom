import { getAutoSelectCollectionId, generateWeekDays } from './helpers.js';
import { fetchCollections, fetchTopicsData } from './api.js';
import { setTopicsState, renderTopicsTable, renderSchedule, openAddTopicModal, openEditTopicModal, openFullScheduleModal } from './ui.js';
import { autoAddTopicsFromSchedule } from './autoSchedule.js';

// Состояние, которое будет использоваться внутри модуля
let topics_currentCollectionId = null;
let topics_currentCollection = null;
let topics_subjects = [];
let topics_topics = [];
let topics_weekDays = [];

// Функция перезагрузки данных (передаётся в UI и autoSchedule)
async function reloadTopicsData() {
  if (!topics_currentCollectionId) return;
  try {
    const collectionsResp = await fetch('/api/collections');
    const allCollections = await collectionsResp.json();
    topics_currentCollection = allCollections.find(c => c.id == topics_currentCollectionId);
    if (!topics_currentCollection) throw new Error();
    topics_weekDays = generateWeekDays(topics_currentCollection.date_start, topics_currentCollection.date_end);
    const data = await fetchTopicsData(topics_currentCollectionId);
    topics_subjects = data.subjects;
    topics_topics = data.topics;
    setTopicsState(topics_currentCollectionId, topics_currentCollection, topics_subjects, topics_topics, topics_weekDays);
    renderTopicsTable();
    renderSchedule();
  } catch (err) {
    console.error(err);
    document.getElementById('topicsContent').innerHTML = '<p style="color:red;">Ошибка загрузки тем</p>';
    document.getElementById('scheduleContent').innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
  }
}

// Глобальная функция, вызываемая из main.js (навигация)
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

  const collections = await fetchCollections();
  const select = document.getElementById('topicsCollectionSelect');
  if (collections.length === 0) {
    select.innerHTML = '<option>-- Нет сборов, создайте в разделе "Сборы" --</option>';
    return;
  }
  select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
    collections.map(c => `<option value="${c.id}" data-start="${c.date_start}" data-end="${c.date_end}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');

  const autoId = getAutoSelectCollectionId(collections);
  if (autoId) {
    select.value = autoId;
    topics_currentCollectionId = autoId;
    await reloadTopicsData();
  }

  select.addEventListener('change', async (e) => {
    topics_currentCollectionId = e.target.value;
    if (topics_currentCollectionId) await reloadTopicsData();
    else {
      document.getElementById('topicsContent').innerHTML = '<p style="text-align:center; padding:40px;">Выберите сбор</p>';
      document.getElementById('scheduleContent').innerHTML = 'Выберите сбор';
    }
  });

  document.getElementById('addTopicBtn').addEventListener('click', () => openAddTopicModal(reloadTopicsData));
  document.getElementById('autoTopicsBtn').addEventListener('click', async () => {
    if (!topics_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    await autoAddTopicsFromSchedule(topics_currentCollectionId, topics_topics, reloadTopicsData);
  });
  document.getElementById('openFullScheduleBtn').addEventListener('click', () => openFullScheduleModal());
};

// Для совместимости с ui.js (обработчики редактирования/удаления используют этот колбэк)
window.__topicsReloadData = reloadTopicsData;