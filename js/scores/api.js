export async function fetchCollections() {
  const resp = await fetch('/api/collections');
  if (!resp.ok) throw new Error('Ошибка загрузки сборов');
  return resp.json();
}

export async function fetchSubjects() {
  const resp = await fetch('/api/subjects');
  if (!resp.ok) throw new Error('Ошибка загрузки предметов');
  return resp.json();
}

export async function fetchSchoolsByCollection(collectionId) {
  const resp = await fetch(`/api/collections/${collectionId}/schools`);
  if (!resp.ok) throw new Error('Ошибка загрузки школ');
  return resp.json();
}

export async function fetchPlatoonsByCollection(collectionId) {
  const resp = await fetch(`/api/collections/${collectionId}/platoons`);
  if (!resp.ok) throw new Error('Ошибка загрузки взводов сбора');
  return resp.json();
}

export async function fetchPlatoonsBySchool(schoolId) {
  const resp = await fetch(`/api/schools/${schoolId}/platoons`);
  if (!resp.ok) throw new Error('Ошибка загрузки взводов школы');
  return resp.json();
}

export async function fetchParticipantsByCollection(collectionId) {
  const resp = await fetch(`/api/collections/${collectionId}/participants`);
  if (!resp.ok) throw new Error('Ошибка загрузки участников сбора');
  return resp.json();
}

export async function fetchStudentsByPlatoonAndSchool(platoonId, schoolId) {
  const resp = await fetch(`/api/scores/platoon/${platoonId}/students?schoolId=${schoolId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки учеников взвода');
  return resp.json();
}

export async function fetchPeopleBySchool(schoolId) {
  const resp = await fetch(`/api/schools/${schoolId}/people`);
  if (!resp.ok) throw new Error('Ошибка загрузки учеников школы');
  return resp.json();
}

export async function fetchTopicsByCollection(collectionId) {
  const resp = await fetch(`/api/topics/${collectionId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки тем');
  return resp.json();
}

export async function fetchScoresByStudent(studentId) {
  const resp = await fetch(`/api/scores/student/${studentId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки оценок');
  return resp.json();
}

export async function fetchFinalScoresByStudent(studentId) {
  const resp = await fetch(`/api/scores/student/${studentId}/final`);
  if (!resp.ok) throw new Error('Ошибка загрузки итоговых оценок');
  return resp.json();
}

export async function updateScore(personId, topicId, score) {
  const resp = await fetch('/api/scores/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, topic_id: topicId, score })
  });
  if (!resp.ok) throw new Error('Ошибка обновления оценки');
  return resp.json();
}

export async function recalcFinalScore(personId, subjectId) {
  const resp = await fetch('/api/scores/calculate-final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, subject_id: subjectId })
  });
  if (!resp.ok) throw new Error('Ошибка расчёта итоговой');
  return resp.json();
}

export async function bulkPlatoonUpdate(platoonId, score, subjectId) {
  const resp = await fetch('/api/scores/bulk-platoon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platoonId, score, subjectId })
  });
  if (!resp.ok) throw new Error('Ошибка массовой операции взвода');
  return resp.json();
}

export async function bulkPlatoonDelete(platoonId, subjectId) {
  const resp = await fetch(`/api/scores/platoon/${platoonId}?subjectId=${subjectId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Ошибка очистки оценок взвода');
  return resp.json();
}

export async function bulkSchoolUpdate(schoolId, score) {
  const resp = await fetch('/api/scores/bulk-school', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, score })
  });
  if (!resp.ok) throw new Error('Ошибка массовой операции школы');
  return resp.json();
}

export async function bulkSchoolDelete(schoolId) {
  const resp = await fetch(`/api/scores/school/${schoolId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Ошибка очистки оценок школы');
  return resp.json();
}

export async function batchFinalScores(updates) {
  const resp = await fetch('/api/scores/batch-final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates })
  });
  if (!resp.ok) {
    let serverErr = 'Ошибка сохранения итоговых оценок';
    try {
      const errData = await resp.json();
      serverErr = errData.error || serverErr;
    } catch(e) {}
    throw new Error(serverErr);
  }
  return resp.json();
}

// НОВИНКА: пакетная загрузка всех оценок и финальных оценок по массиву ID
export async function fetchBatchScoresAndFinals(personIds) {
  const resp = await fetch('/api/scores/batch-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_ids: personIds })
  });
  if (!resp.ok) throw new Error('Ошибка пакетной загрузки оценок');
  return resp.json();
}