// ========== Обработчики кнопок «Сформировать» для каждого документа ==========
import { 
  fetchCollections, 
  fetchSchoolsByCollections, 
  fetchPlatoonsByCollection, 
  generateSvodnaya, 
  generateFizo, 
  generateVremJournal, 
  generateHygieneAct, 
  generateWaterAct, 
  generateCertificateAct 
} from './api.js';
import { showCollectionSelector } from './modals/collectionSelector.js';
import { 
  showSchoolSelector, 
  showPlatoonSelector, 
  showTempJournalSchoolAndPlatoonSelector 
} from './modals/schoolSelector.js';

async function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function handleSvodnaya() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections);
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена или пустой выбор

    const schools = await fetchSchoolsByCollections(selectedCollectionIds);
    if (!schools.length) {
      alert('В выбранных сборах нет школ с участниками');
      return;
    }
    showSchoolSelector(schools, async (schoolId) => {
      const blob = await generateSvodnaya(schoolId, 'svodnaya');
      downloadBlob(blob, `Svodnaya_vedomost_${Date.now()}.xlsx`);
    });
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

export async function handleFizo() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections, { singleSelect: true });
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена
    const collectionId = selectedCollectionIds[0];

    const platoons = await fetchPlatoonsByCollection(collectionId);
    if (!platoons.length) {
      alert('В выбранном сборе нет взводов. Сначала создайте взвода в разделе "Взвода".');
      return;
    }
    showPlatoonSelector(platoons, async (platoonId) => {
      const blob = await generateFizo(platoonId);
      downloadBlob(blob, `Fizo_100m_${Date.now()}.xlsx`);
    });
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

export async function handleVremJournal() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections);
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена

    const schools = await fetchSchoolsByCollections(selectedCollectionIds);
    if (!schools.length) {
      alert('В выбранных сборах нет школ с участниками');
      return;
    }
    const result = await showTempJournalSchoolAndPlatoonSelector(schools);
    if (!result) return; // отмена
    const blob = await generateVremJournal(result.schoolId, result.platoonId);
    downloadBlob(blob, `Vremenny_jurnal_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

export async function handleHygieneAct() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections, { singleSelect: true });
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена
    const collectionId = selectedCollectionIds[0];

    const blob = await generateHygieneAct(collectionId);
    downloadBlob(blob, `Akt_hygiene_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

export async function handleWaterAct() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections, { singleSelect: true });
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена
    const collectionId = selectedCollectionIds[0];

    const blob = await generateWaterAct(collectionId);
    downloadBlob(blob, `Akt_water_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

export async function handleCertificateAct() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections, { singleSelect: true });
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return; // отмена
    const collectionId = selectedCollectionIds[0];

    const blob = await generateCertificateAct(collectionId);
    downloadBlob(blob, `Akt_certificate_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}