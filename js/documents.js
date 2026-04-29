// ========== ДОКУМЕНТЫ ==========
const closeSelectModalBtn = document.getElementById('closeSelectModalBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');
const generateDocBtn = document.getElementById('generateDocBtn');
const collectionsChecklistDiv = document.getElementById('collectionsChecklist');

let currentDocType = null;
let selectedCollectionIds = [];

// Хранилище описаний документов (ключ - id документа)
let docDescriptions = {};

// Загрузка описаний из localStorage
function loadDocDescriptions() {
  const saved = localStorage.getItem('docDescriptions');
  if (saved) {
    try {
      docDescriptions = JSON.parse(saved);
    } catch(e) {}
  }
  // Значения по умолчанию
  if (!docDescriptions['svodnaya']) docDescriptions['svodnaya'] = 'Сводная ведомость по школе: список участников, даты сборов.';
  if (!docDescriptions['vrem_jurnal']) docDescriptions['vrem_jurnal'] = 'Временный журнал для школы и взвода: список участников, объединённые ячейки.';
  if (!docDescriptions['fizo']) docDescriptions['fizo'] = 'Протокол выполнения норматива "Бег 100 метров" по взводу.';
  saveDocDescriptions();
}
function saveDocDescriptions() {
  localStorage.setItem('docDescriptions', JSON.stringify(docDescriptions));
}
function getDocDescription(docId) {
  return docDescriptions[docId] || '';
}
function setDocDescription(docId, desc) {
  docDescriptions[docId] = desc;
  saveDocDescriptions();
}

// Модалка редактирования описания документа
function openEditDescriptionModal(docId, docTitle, currentDesc) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>Редактировать описание</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <div class="form-group">
          <label>Документ: ${docTitle}</label>
          <textarea id="docDescTextarea" rows="5" style="width:100%; padding:12px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit;">${currentDesc}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn cancel" id="cancelDescEditBtn">Отмена</button>
          <button type="button" class="btn add" id="saveDescEditBtn">Сохранить</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('#cancelDescEditBtn').addEventListener('click', closeModal);
  modal.querySelector('#saveDescEditBtn').addEventListener('click', () => {
    const newDesc = modal.querySelector('#docDescTextarea').value.trim();
    setDocDescription(docId, newDesc);
    closeModal();
    renderDocuments(); // перерисовываем карточки
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Модалка выбора школы (для сводной ведомости)
let schoolSelectModal = null;
function createSchoolSelectModal() {
  if (schoolSelectModal) return schoolSelectModal;
  const modal = document.createElement('div');
  modal.id = 'schoolSelectModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2><i class="fas fa-school"></i> Выберите школу</h2>
        <button class="close-modal" id="closeSchoolSelectModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <p style="margin-bottom: 16px;">Для выбранных сборов доступны следующие школы:</p>
        <div id="schoolsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancelSchoolSelectBtn" class="btn cancel">Отмена</button>
          <button id="confirmSchoolBtn" class="btn add">Сформировать</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  schoolSelectModal = modal;
  return modal;
}

function showSchoolSelector(schools, docType) {
  const modal = createSchoolSelectModal();
  const schoolsListDiv = document.getElementById('schoolsList');
  const closeBtn = document.getElementById('closeSchoolSelectModalBtn');
  const cancelBtn = document.getElementById('cancelSchoolSelectBtn');
  const confirmBtn = document.getElementById('confirmSchoolBtn');
  
  schoolsListDiv.innerHTML = schools.map(school => `
    <label style="display: block; margin-bottom: 12px; cursor: pointer;">
      <input type="radio" name="selectedSchool" value="${school.id}"> 
      ${window.escapeHtml(school.edu_org)} (${school.people_count || 0} чел.)
    </label>
  `).join('');
  
  modal.style.display = 'flex';
  
  const closeModal = () => modal.style.display = 'none';
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  
  confirmBtn.onclick = async () => {
    const selectedRadio = document.querySelector('#schoolsList input[type="radio"]:checked');
    if (!selectedRadio) {
      alert('Выберите школу');
      return;
    }
    const schoolId = selectedRadio.value;
    modal.style.display = 'none';
    try {
      const response = await fetch('/api/generate-school-doc-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, docType })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка генерации');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Svodnaya_vedomost_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

// Модалка выбора взвода (для Физо)
let platoonSelectModal = null;
function createPlatoonSelectModal() {
  if (platoonSelectModal) return platoonSelectModal;
  const modal = document.createElement('div');
  modal.id = 'platoonSelectModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2><i class="fas fa-users"></i> Выберите взвод</h2>
        <button class="close-modal" id="closePlatoonSelectModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <p style="margin-bottom: 16px;">Для выбранного сбора доступны следующие взвода:</p>
        <div id="platoonsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancelPlatoonSelectBtn" class="btn cancel">Отмена</button>
          <button id="confirmPlatoonBtn" class="btn add">Сформировать</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  platoonSelectModal = modal;
  return modal;
}

function showPlatoonSelector(platoons) {
  const modal = createPlatoonSelectModal();
  const platoonsListDiv = document.getElementById('platoonsList');
  const closeBtn = document.getElementById('closePlatoonSelectModalBtn');
  const cancelBtn = document.getElementById('cancelPlatoonSelectBtn');
  const confirmBtn = document.getElementById('confirmPlatoonBtn');
  
  platoonsListDiv.innerHTML = platoons.map(platoon => `
    <label style="display: block; margin-bottom: 12px; cursor: pointer;">
      <input type="radio" name="selectedPlatoon" value="${platoon.id}"> 
      ${window.escapeHtml(platoon.name)} (${platoon.people_count || 0} чел.)
    </label>
  `).join('');
  
  modal.style.display = 'flex';
  
  const closeModal = () => modal.style.display = 'none';
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  
  confirmBtn.onclick = async () => {
    const selectedRadio = document.querySelector('#platoonsList input[type="radio"]:checked');
    if (!selectedRadio) {
      alert('Выберите взвод');
      return;
    }
    const platoonId = selectedRadio.value;
    modal.style.display = 'none';
    try {
      const response = await fetch('/api/generate-fizo-platoon-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platoonId })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка генерации');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fizo_100m_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

// Модалка для временного журнала (выбор школы и взвода)
let tempJournalSchoolSelectModal = null;
let tempJournalSchools = [];
let tempJournalPlatoons = [];
let tempJournalSelectedSchoolId = null;

function createTempJournalSchoolModal() {
  if (tempJournalSchoolSelectModal) return tempJournalSchoolSelectModal;
  const modal = document.createElement('div');
  modal.id = 'tempJournalSchoolModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2><i class="fas fa-school"></i> Выберите школу</h2>
        <button class="close-modal" id="closeTempJournalSchoolModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <p style="margin-bottom: 16px;">Для выбранных сборов доступны следующие школы:</p>
        <div id="tempJournalSchoolsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancelTempJournalSchoolBtn" class="btn cancel">Отмена</button>
          <button id="confirmTempJournalSchoolBtn" class="btn add">Далее</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  tempJournalSchoolSelectModal = modal;
  return modal;
}

function showTempJournalSchoolSelector(schools) {
  const modal = createTempJournalSchoolModal();
  const schoolsListDiv = document.getElementById('tempJournalSchoolsList');
  const closeBtn = document.getElementById('closeTempJournalSchoolModalBtn');
  const cancelBtn = document.getElementById('cancelTempJournalSchoolBtn');
  const confirmBtn = document.getElementById('confirmTempJournalSchoolBtn');
  
  tempJournalSchools = schools;
  schoolsListDiv.innerHTML = schools.map(school => `
    <label style="display: block; margin-bottom: 12px; cursor: pointer;">
      <input type="radio" name="tempJournalSchool" value="${school.id}"> 
      ${window.escapeHtml(school.edu_org)} (${school.people_count || 0} чел.)
    </label>
  `).join('');
  
  modal.style.display = 'flex';
  
  const closeModal = () => modal.style.display = 'none';
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  
  confirmBtn.onclick = async () => {
    const selectedRadio = document.querySelector('#tempJournalSchoolsList input[type="radio"]:checked');
    if (!selectedRadio) {
      alert('Выберите школу');
      return;
    }
    tempJournalSelectedSchoolId = parseInt(selectedRadio.value);
    modal.style.display = 'none';
    await loadPlatoonsForSchool(tempJournalSelectedSchoolId);
    showTempJournalPlatoonSelector(tempJournalPlatoons);
  };
}

function createTempJournalPlatoonModal() {
  if (document.getElementById('tempJournalPlatoonModal')) return;
  const modal = document.createElement('div');
  modal.id = 'tempJournalPlatoonModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2><i class="fas fa-users"></i> Выберите взвод</h2>
        <button class="close-modal" id="closeTempJournalPlatoonModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <p style="margin-bottom: 16px;">Для выбранной школы доступны следующие взвода:</p>
        <div id="tempJournalPlatoonsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancelTempJournalPlatoonBtn" class="btn cancel">Отмена</button>
          <button id="confirmTempJournalPlatoonBtn" class="btn add">Сформировать</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function loadPlatoonsForSchool(schoolId) {
  try {
    const resp = await fetch(`/api/schools/${schoolId}/platoons`);
    if (!resp.ok) throw new Error();
    tempJournalPlatoons = await resp.json();
  } catch (err) {
    console.error(err);
    tempJournalPlatoons = [];
  }
}

function showTempJournalPlatoonSelector(platoons) {
  createTempJournalPlatoonModal();
  const modal = document.getElementById('tempJournalPlatoonModal');
  const platoonsListDiv = document.getElementById('tempJournalPlatoonsList');
  const closeBtn = document.getElementById('closeTempJournalPlatoonModalBtn');
  const cancelBtn = document.getElementById('cancelTempJournalPlatoonBtn');
  const confirmBtn = document.getElementById('confirmTempJournalPlatoonBtn');
  
  if (!platoons.length) {
    platoonsListDiv.innerHTML = '<p style="color:red;">В этой школе нет взводов</p>';
  } else {
    platoonsListDiv.innerHTML = platoons.map(platoon => `
      <label style="display: block; margin-bottom: 12px; cursor: pointer;">
        <input type="radio" name="tempJournalPlatoon" value="${platoon.id}"> 
        ${window.escapeHtml(platoon.name)} (${platoon.people_count || 0} чел.)
      </label>
    `).join('');
  }
  
  modal.style.display = 'flex';
  const closeModal = () => modal.style.display = 'none';
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  
  confirmBtn.onclick = async () => {
    const selectedRadio = document.querySelector('#tempJournalPlatoonsList input[type="radio"]:checked');
    if (!selectedRadio) {
      alert('Выберите взвод');
      return;
    }
    const platoonId = selectedRadio.value;
    modal.style.display = 'none';
    try {
      const response = await fetch('/api/generate-vrem-jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: tempJournalSelectedSchoolId, platoonId })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка генерации');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vremenny_jurnal_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

// Основная функция отрисовки раздела Документы (карточки)
window.renderDocuments = function() {
  loadDocDescriptions();
  
  const svodnayaDesc = getDocDescription('svodnaya');
  const vremDesc = getDocDescription('vrem_jurnal');
  const fizoDesc = getDocDescription('fizo');
  
  const html = `
    <div class="documents-two-columns">
      <div class="doc-column">
        <div class="doc-column-title">Контрактные документы</div>
        <div class="doc-cards-grid">
          <div class="doc-card" data-doc="svodnaya">
            <div class="doc-card-title">Сводная ведомость</div>
            <div class="doc-card-description">${window.escapeHtml(svodnayaDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="svodnaya">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="svodnaya">Редактировать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="vrem_jurnal">
            <div class="doc-card-title">Временный журнал</div>
            <div class="doc-card-description">${window.escapeHtml(vremDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="vrem_jurnal">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="vrem_jurnal">Редактировать</button>
            </div>
          </div>
        </div>
      </div>
      <div class="doc-column">
        <div class="doc-column-title">Внутренние документы</div>
        <div class="doc-cards-grid">
          <div class="doc-card" data-doc="fizo">
            <div class="doc-card-title">Физо (100м)</div>
            <div class="doc-card-description">${window.escapeHtml(fizoDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="fizo">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="fizo">Редактировать</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  window.contentBody.innerHTML = html;
  
  // Обработчики для кнопок
  document.querySelectorAll('.doc-card-btn.generate').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docType = btn.getAttribute('data-doc');
      if (docType === 'svodnaya') {
        await handleSvodnaya();
      } else if (docType === 'vrem_jurnal') {
        await handleVremJournal();
      } else if (docType === 'fizo') {
        await handleFizo();
      }
    });
  });
  
  document.querySelectorAll('.doc-card-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docType = btn.getAttribute('data-doc');
      let title = '';
      let currentDesc = '';
      if (docType === 'svodnaya') {
        title = 'Сводная ведомость';
        currentDesc = getDocDescription('svodnaya');
      } else if (docType === 'vrem_jurnal') {
        title = 'Временный журнал';
        currentDesc = getDocDescription('vrem_jurnal');
      } else if (docType === 'fizo') {
        title = 'Физо (100м)';
        currentDesc = getDocDescription('fizo');
      }
      openEditDescriptionModal(docType, title, currentDesc);
    });
  });
};

// Логика для Сводной ведомости (школы)
async function handleSvodnaya() {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    collectionsChecklistDiv.innerHTML = collections.map(col => `
      <label style="display: block; margin-bottom: 12px; cursor: pointer;">
        <input type="checkbox" value="${col.id}"> 
        ${window.formatDate(col.date_start)} — ${window.formatDate(col.date_end)} (${col.people_count || 0} чел.)
      </label>
    `).join('');
    window.selectCollectionsModal.style.display = 'flex';
    
    const oldHandler = generateDocBtn.onclick;
    generateDocBtn.onclick = async () => {
      const checkboxes = collectionsChecklistDiv.querySelectorAll('input[type="checkbox"]:checked');
      selectedCollectionIds = Array.from(checkboxes).map(cb => cb.value);
      if (selectedCollectionIds.length === 0) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      window.selectCollectionsModal.style.display = 'none';
      try {
        const schoolsResp = await fetch('/api/schools/by-collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionIds: selectedCollectionIds })
        });
        const schools = await schoolsResp.json();
        if (!schools.length) {
          alert('В выбранных сборах нет школ с участниками');
          return;
        }
        showSchoolSelector(schools, 'svodnaya');
      } catch (err) {
        alert('Ошибка загрузки школ: ' + err.message);
      }
      generateDocBtn.onclick = oldHandler;
    };
    
    const restoreHandler = () => {
      generateDocBtn.onclick = oldHandler;
    };
    closeSelectModalBtn.addEventListener('click', restoreHandler, { once: true });
    cancelSelectBtn.addEventListener('click', restoreHandler, { once: true });
    window.selectCollectionsModal.addEventListener('click', (e) => {
      if (e.target === window.selectCollectionsModal) restoreHandler();
    }, { once: true });
    
  } catch (err) {
    alert('Ошибка загрузки сборов');
  }
}

// Логика для Физо (100м)
async function handleFizo() {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    collectionsChecklistDiv.innerHTML = collections.map(col => `
      <label style="display: block; margin-bottom: 12px; cursor: pointer;">
        <input type="checkbox" value="${col.id}"> 
        ${window.formatDate(col.date_start)} — ${window.formatDate(col.date_end)} (${col.people_count || 0} чел.)
      </label>
    `).join('');
    window.selectCollectionsModal.style.display = 'flex';
    
    const oldHandler = generateDocBtn.onclick;
    generateDocBtn.onclick = async () => {
      const checkboxes = collectionsChecklistDiv.querySelectorAll('input[type="checkbox"]:checked');
      const selectedCollectionIds = Array.from(checkboxes).map(cb => cb.value);
      if (selectedCollectionIds.length === 0) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      window.selectCollectionsModal.style.display = 'none';
      const collectionId = selectedCollectionIds[0];
      try {
        const platoonsResp = await fetch(`/api/collections/${collectionId}/platoons`);
        const platoons = await platoonsResp.json();
        if (!platoons.length) {
          alert('В выбранном сборе нет взводов. Сначала создайте взвода в разделе "Взвода".');
          return;
        }
        showPlatoonSelector(platoons);
      } catch (err) {
        alert('Ошибка загрузки взводов: ' + err.message);
      }
      generateDocBtn.onclick = oldHandler;
    };
    
    const restoreHandler = () => {
      generateDocBtn.onclick = oldHandler;
    };
    closeSelectModalBtn.addEventListener('click', restoreHandler, { once: true });
    cancelSelectBtn.addEventListener('click', restoreHandler, { once: true });
    window.selectCollectionsModal.addEventListener('click', (e) => {
      if (e.target === window.selectCollectionsModal) restoreHandler();
    }, { once: true });
    
  } catch (err) {
    alert('Ошибка загрузки сборов');
  }
}

// Логика для Временного журнала
async function handleVremJournal() {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    if (!collections.length) {
      alert('Нет доступных сборов. Сначала создайте сборы в разделе "Сборы".');
      return;
    }
    collectionsChecklistDiv.innerHTML = collections.map(col => `
      <label style="display: block; margin-bottom: 12px; cursor: pointer;">
        <input type="checkbox" value="${col.id}"> 
        ${window.formatDate(col.date_start)} — ${window.formatDate(col.date_end)} (${col.people_count || 0} чел.)
      </label>
    `).join('');
    window.selectCollectionsModal.style.display = 'flex';
    
    const oldHandler = generateDocBtn.onclick;
    generateDocBtn.onclick = async () => {
      const checkboxes = collectionsChecklistDiv.querySelectorAll('input[type="checkbox"]:checked');
      selectedCollectionIds = Array.from(checkboxes).map(cb => cb.value);
      if (selectedCollectionIds.length === 0) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      window.selectCollectionsModal.style.display = 'none';
      try {
        const schoolsResp = await fetch('/api/schools/by-collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionIds: selectedCollectionIds })
        });
        const schools = await schoolsResp.json();
        if (!schools.length) {
          alert('В выбранных сборах нет школ с участниками');
          return;
        }
        showTempJournalSchoolSelector(schools);
      } catch (err) {
        alert('Ошибка загрузки школ: ' + err.message);
      }
      generateDocBtn.onclick = oldHandler;
    };
    
    const restoreHandler = () => {
      generateDocBtn.onclick = oldHandler;
    };
    closeSelectModalBtn.addEventListener('click', restoreHandler, { once: true });
    cancelSelectBtn.addEventListener('click', restoreHandler, { once: true });
    window.selectCollectionsModal.addEventListener('click', (e) => {
      if (e.target === window.selectCollectionsModal) restoreHandler();
    }, { once: true });
    
  } catch (err) {
    alert('Ошибка загрузки сборов');
  }
}

closeSelectModalBtn.addEventListener('click', () => window.selectCollectionsModal.style.display = 'none');
cancelSelectBtn.addEventListener('click', () => window.selectCollectionsModal.style.display = 'none');
window.selectCollectionsModal.addEventListener('click', (e) => {
  if (e.target === window.selectCollectionsModal) window.selectCollectionsModal.style.display = 'none';
});