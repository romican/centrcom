// ========== API-вызовы для документов ==========
// Все функции возвращают Promise с blob (или json, если нужно)

export async function fetchCollections() {
  const resp = await fetch('/api/collections');
  if (!resp.ok) throw new Error('Ошибка загрузки списка сборов');
  return resp.json();
}

export async function fetchSchoolsByCollections(collectionIds) {
  const resp = await fetch('/api/schools/by-collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionIds })
  });
  if (!resp.ok) throw new Error('Ошибка загрузки школ');
  return resp.json();
}

export async function fetchPlatoonsByCollection(collectionId) {
  const resp = await fetch(`/api/collections/${collectionId}/platoons`);
  if (!resp.ok) throw new Error('Ошибка загрузки взводов');
  return resp.json();
}

export async function fetchPlatoonsBySchool(schoolId) {
  const resp = await fetch(`/api/schools/${schoolId}/platoons`);
  if (!resp.ok) throw new Error('Ошибка загрузки взводов для школы');
  return resp.json();
}

// Генерация документов
export async function generateSvodnaya(schoolId, docType) {
  const resp = await fetch('/api/generate-school-doc-excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, docType })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Ошибка генерации');
  }
  return resp.blob();
}

export async function generateFizo(platoonId) {
  const resp = await fetch('/api/generate-fizo-platoon-excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platoonId })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Ошибка генерации');
  }
  return resp.blob();
}

export async function generateVremJournal(schoolId, platoonId) {
  const resp = await fetch('/api/generate-vrem-jurnal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, platoonId })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Ошибка генерации');
  }
  return resp.blob();
}

export async function generateHygieneAct(collectionId) {
  const resp = await fetch('/api/generate-hygiene-act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId })
  });
  if (!resp.ok) throw new Error('Ошибка генерации');
  return resp.blob();
}

export async function generateWaterAct(collectionId) {
  const resp = await fetch('/api/generate-water-act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId })
  });
  if (!resp.ok) throw new Error('Ошибка генерации');
  return resp.blob();
}

export async function generateCertificateAct(collectionId) {
  const resp = await fetch('/api/generate-certificate-act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId })
  });
  if (!resp.ok) throw new Error('Ошибка генерации');
  return resp.blob();
}