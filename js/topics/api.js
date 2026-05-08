// API-запросы для работы с темами

export async function fetchCollections() {
  const resp = await fetch('/api/collections');
  if (!resp.ok) throw new Error('Ошибка загрузки списка сборов');
  return resp.json();
}

export async function fetchTopicsData(collectionId) {
  const resp = await fetch(`/api/topics/${collectionId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки тем');
  return resp.json();
}

export async function fetchSubjects() {
  const resp = await fetch('/api/subjects');
  if (!resp.ok) throw new Error('Ошибка загрузки предметов');
  return resp.json();
}

export async function addTopic(collectionId, subjectId, name, date) {
  const resp = await fetch(`/api/topics/${collectionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_id: subjectId, name, date })
  });
  if (!resp.ok) throw new Error('Ошибка добавления темы');
  return resp.json();
}

export async function updateTopic(topicId, subjectId, name, date) {
  const resp = await fetch(`/api/topics/${topicId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_id: subjectId, name, date })
  });
  if (!resp.ok) throw new Error('Ошибка обновления темы');
  return resp.json();
}

export async function deleteTopic(topicId) {
  const resp = await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Ошибка удаления темы');
  return resp.json();
}