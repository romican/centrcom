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
  generateCertificateAct,
  generateGraphDisinfection
} from './api.js';
import { showCollectionSelector } from './modals/collectionSelector.js';
import { 
  showSchoolSelector, 
  showPlatoonSelector, 
  showTempJournalSchoolAndPlatoonSelector 
} from './modals/schoolSelector.js';

// ========== Вспомогательные функции ==========
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

// Селектор казармы (одиночный выбор)
function showBarrackSelector(barracks) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const items = barracks.map(b => `
      <label style="display:block; margin-bottom:12px; cursor:pointer;">
        <input type="radio" name="selectedBarrack" value="${b.id}">
        ${window.escapeHtml(b.name)}
      </label>
    `).join('');
    modal.innerHTML = `
      <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
          <h2>Выберите казарму</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div style="padding:16px 24px;">
          <div id="barrackOptionsList" style="max-height:300px; overflow-y:auto; margin-bottom:20px;">${items}</div>
          <div style="display:flex; justify-content:flex-end; gap:12px;">
            <button class="btn cancel">Отмена</button>
            <button class="btn add" id="selectBarrackBtn">Сформировать</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const closeModal = () => {
      modal.remove();
      resolve(null);
    };
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
    modal.querySelector('#selectBarrackBtn').addEventListener('click', () => {
      const selectedRadio = modal.querySelector('input[name="selectedBarrack"]:checked');
      if (!selectedRadio) {
        alert('Выберите казарму');
        return;
      }
      const barrackId = selectedRadio.value;
      modal.remove();
      resolve(barrackId);
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  });
}

// ========== Обработчики для каждого типа документа ==========
export async function handleSvodnaya() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections);
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;

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
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;
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
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;

    const schools = await fetchSchoolsByCollections(selectedCollectionIds);
    if (!schools.length) {
      alert('В выбранных сборах нет школ с участниками');
      return;
    }
    const result = await showTempJournalSchoolAndPlatoonSelector(schools);
    if (!result) return;
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
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;
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
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;
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
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;
    const collectionId = selectedCollectionIds[0];

    const blob = await generateCertificateAct(collectionId);
    downloadBlob(blob, `Akt_certificate_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

// ========== НОВЫЙ ОБРАБОТЧИК: График дезинфекции воздушной среды ==========
export async function handleGraphDisinfection() {
  try {
    const collections = await fetchCollections();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    const selectedCollectionIds = await showCollectionSelector(collections, { singleSelect: true });
    if (!selectedCollectionIds || selectedCollectionIds.length === 0) return;
    const collectionId = selectedCollectionIds[0];

    // Загружаем казармы для выбранного сбора
    const barracksResp = await fetch(`/api/barracks?collectionId=${collectionId}`);
    if (!barracksResp.ok) throw new Error('Ошибка загрузки казарм');
    const barracks = await barracksResp.json();
    if (!barracks.length) {
      alert('В выбранном сборе нет казарм. Добавьте казармы в разделе "Казармы".');
      return;
    }

    const barrackId = await showBarrackSelector(barracks);
    if (!barrackId) return; // отмена

    const blob = await generateGraphDisinfection(barrackId, collectionId);
    downloadBlob(blob, `Graph_disinfection_${Date.now()}.xlsx`);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}