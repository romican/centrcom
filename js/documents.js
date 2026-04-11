// ========== ДОКУМЕНТЫ (клиентская часть) ==========
const closeSelectModalBtn = document.getElementById('closeSelectModalBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');
const generateDocBtn = document.getElementById('generateDocBtn');
const collectionsChecklistDiv = document.getElementById('collectionsChecklist');

let currentDocType = null;
let selectedCollectionIds = [];

// Модалка выбора школы (создаётся один раз)
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

function showSchoolSelector(schools) {
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
      const response = await fetch('/api/generate-school-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, docType: currentDocType })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка генерации');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Svodnaya_vedomost_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

window.renderDocuments = function() {
  const html = `
    <div class="documents-two-columns">
      <div class="doc-column">
        <div class="doc-column-title">Контрактные документы</div>
        <div class="doc-buttons-list">
          <button class="doc-button" data-doc="Сводная ведомость">Сводная ведомость</button>
        </div>
      </div>
      <div class="doc-column">
        <div class="doc-column-title">Внутренние документы</div>
        <div class="doc-buttons-list">
          <button class="doc-button" data-doc="Физо (100м)">Физо (100м)</button>
        </div>
      </div>
    </div>
  `;
  window.contentBody.innerHTML = html;
  
  document.querySelectorAll('.doc-button').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentDocType = btn.getAttribute('data-doc');
      if (currentDocType === 'Сводная ведомость') {
        await handleSvodnaya();
      } else {
        await handleFizo();
      }
    });
  });
};

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
        showSchoolSelector(schools);
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
      const selectedIds = Array.from(checkboxes).map(cb => cb.value);
      if (selectedIds.length === 0) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      window.selectCollectionsModal.style.display = 'none';
      try {
        const response = await fetch('/api/generate-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionIds: selectedIds, docType: currentDocType })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Ошибка генерации');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fizo_100m_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Ошибка: ' + err.message);
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