import { TOPICS_SCHEDULE } from './config.js';
import { fetchSubjects, addTopic, deleteTopic } from './api.js';

/**
 * Показывает кастомную модалку с сообщением.
 * Аналогична showLockStatusModal, но с иконкой fa-check.
 */
function showNotificationModal(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:320px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-check" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.3rem; font-weight:600;">${message}</h2>
        <button class="btn add" style="min-width:100px;">Ок</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const closeModal = () => {
      modal.remove();
      resolve();
    };
    modal.querySelector('.btn.add').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  });
}

export async function autoAddTopicsFromSchedule(collectionId, currentTopics, reloadDataCallback) {
  if (!collectionId) {
    alert('Сначала выберите сбор');
    return false;
  }

  // Получить информацию о текущем сборе
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const currentCollection = allCollections.find(c => c.id == collectionId);
  if (!currentCollection) {
    alert('Ошибка загрузки данных сбора');
    return false;
  }

  const startDate = new Date(currentCollection.date_start);
  const startDay = startDate.getDay();
  if (startDay !== 1) {
    alert('Дата начала сбора не является понедельником. Сбор должен начинаться с понедельника.');
    return false;
  }

  const dayMapping = {
    'Понедельник': 0, 'Вторник': 1, 'Среда': 2, 'Четверг': 3, 'Пятница': 4
  };

  const allSubjects = await fetchSubjects();
  const subjectMap = new Map();
  allSubjects.forEach(s => subjectMap.set(s.name, s.id));

  // Удаляем все существующие темы
  for (const topic of currentTopics) {
    await deleteTopic(topic.id);
  }

  let addedCount = 0;
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
    const dateStr = targetDate.toISOString().slice(0,10);
    if (targetDate > new Date(currentCollection.date_end)) {
      console.warn(`Занятие ${scheduleItem.topicName} (${scheduleItem.day}) выходит за дату окончания сбора, пропущено`);
      continue;
    }
    await addTopic(collectionId, subjectId, scheduleItem.topicName, dateStr);
    addedCount++;
  }

  if (reloadDataCallback) await reloadDataCallback();
  await showNotificationModal(`Темы добавлены по расписанию. Добавлено ${addedCount} тем.`);
  return true;
}