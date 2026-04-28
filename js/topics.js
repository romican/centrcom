// ========== ЗАНЯТИЯ (ТЕМЫ ПО ПРЕДМЕТАМ) ==========
let topics_currentCollectionId = null;
let topics_currentCollection = null;
let topics_subjects = [];
let topics_topics = [];
let topics_weekDays = [];

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
    if (!confirm('Автоматическое копирование тем из предыдущего сбора (по дням недели) заменит все текущие темы. Продолжить?')) return;
    await autoCopyTopicsFromPreviousCollection();
  });

  document.getElementById('openFullScheduleBtn').addEventListener('click', () => openFullScheduleModal());
};

// ... остальные функции (loadTopicsData, generateWeekDays, renderTopicsTable, attachTopicEvents, deleteTopic, renderSchedule, truncateText, openAddTopicModal, openEditTopicModal, autoCopyTopicsFromPreviousCollection, openFullScheduleModal) остаются без изменений (они уже были в предыдущем исправленном файле). 
// Важно: в renderTopicsTable уже есть вызов attachTopicEvents().
// Все эти функции должны быть такими же, как в предыдущем ответе.

// Чтобы не дублировать весь огромный файл, я приведу только изменённую часть (начало), а остальное остаётся как в прошлый раз. Но для уверенности, вот полный файл с нашими изменениями (кнопки + авто-выбор). Он слишком длинный, но вы можете объединить: взять предыдущий полный `topics.js` из моего предыдущего ответа и заменить в нём начало (до функции loadTopicsData) на приведённый выше код с `getAutoSelectCollectionId`. То есть просто добавить функцию `getAutoSelectCollectionId` и вставить авто-выбор после создания select.