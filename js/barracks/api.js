export async function fetchCollections() {
  const resp = await fetch('/api/collections');
  if (!resp.ok) throw new Error('Ошибка загрузки сборов');
  return resp.json();
}

export async function fetchBarracks() {
  const resp = await fetch('/api/barracks');
  if (!resp.ok) throw new Error('Ошибка загрузки казарм');
  return resp.json();
}

export async function addBarrack(name) {
  const resp = await fetch('/api/barracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) throw new Error('Ошибка добавления казармы');
  return resp.json();
}

export async function updateBarrack(id, name) {
  const resp = await fetch(`/api/barracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) throw new Error('Ошибка обновления казармы');
  return resp.json();
}

export async function deleteBarrack(id) {
  const resp = await fetch(`/api/barracks/${id}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Ошибка удаления казармы');
  return resp.json();
}

export async function fetchLocations(barrackId) {
  const resp = await fetch(`/api/barracks/${barrackId}/locations`);
  if (!resp.ok) throw new Error('Ошибка загрузки расположений');
  return resp.json();
}

export async function addLocation(barrackId, name) {
  const resp = await fetch(`/api/barracks/${barrackId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) throw new Error('Ошибка добавления расположения');
  return resp.json();
}

export async function updateLocation(locationId, name) {
  const resp = await fetch(`/api/locations/${locationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) throw new Error('Ошибка обновления расположения');
  return resp.json();
}

export async function deleteLocation(locationId) {
  const resp = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Ошибка удаления расположения');
  return resp.json();
}

export async function fetchAssignedSchools(locationId, collectionId) {
  const resp = await fetch(`/api/locations/${locationId}/schools?collectionId=${collectionId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки привязанных школ');
  return resp.json();
}

export async function fetchUnassignedSchools(locationId, collectionId) {
  const resp = await fetch(`/api/locations/${locationId}/unassigned-schools?collectionId=${collectionId}`);
  if (!resp.ok) throw new Error('Ошибка загрузки непривязанных школ');
  return resp.json();
}

export async function assignSchoolToLocation(locationId, schoolId) {
  const resp = await fetch(`/api/locations/${locationId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId })
  });
  if (!resp.ok) throw new Error('Ошибка привязки школы');
  return resp.json();
}

export async function unassignSchoolFromLocation(locationId, schoolId) {
  const resp = await fetch(`/api/locations/${locationId}/unassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId })
  });
  if (!resp.ok) throw new Error('Ошибка отвязки школы');
  return resp.json();
}