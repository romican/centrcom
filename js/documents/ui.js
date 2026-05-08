// ========== Рендер главной страницы документов и модалка редактирования описания ==========
import { loadDocDescriptions, getDocDescription, setDocDescription } from './config.js';
import * as handlers from './handlers.js';

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
    renderDocuments();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

export function renderDocuments() {
  loadDocDescriptions();

  const svodnayaDesc = getDocDescription('svodnaya');
  const vremDesc = getDocDescription('vrem_jurnal');
  const fizoDesc = getDocDescription('fizo');
  const hygieneDesc = getDocDescription('hygiene');
  const waterDesc = getDocDescription('water');
  const certificateDesc = getDocDescription('certificate');

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
          <div class="doc-card" data-doc="hygiene">
            <div class="doc-card-title">Акт об обеспечении средствами личной гигиены</div>
            <div class="doc-card-description">${window.escapeHtml(hygieneDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="hygiene">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="hygiene">Редактировать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="water">
            <div class="doc-card-title">Акт об обеспечении круглосуточного питьевого режима</div>
            <div class="doc-card-description">${window.escapeHtml(waterDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="water">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="water">Редактировать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="certificate">
            <div class="doc-card-title">Акт передачи удостоверений</div>
            <div class="doc-card-description">${window.escapeHtml(certificateDesc)}</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="certificate">Сформировать документ</button>
              <button class="doc-card-btn edit" data-doc="certificate">Редактировать</button>
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

  document.querySelectorAll('.doc-card-btn.generate').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docType = btn.getAttribute('data-doc');
      switch (docType) {
        case 'svodnaya': await handlers.handleSvodnaya(); break;
        case 'vrem_jurnal': await handlers.handleVremJournal(); break;
        case 'fizo': await handlers.handleFizo(); break;
        case 'hygiene': await handlers.handleHygieneAct(); break;
        case 'water': await handlers.handleWaterAct(); break;
        case 'certificate': await handlers.handleCertificateAct(); break;
        default: break;
      }
    });
  });

  document.querySelectorAll('.doc-card-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docType = btn.getAttribute('data-doc');
      let title = '', currentDesc = '';
      switch (docType) {
        case 'svodnaya': title = 'Сводная ведомость'; currentDesc = getDocDescription('svodnaya'); break;
        case 'vrem_jurnal': title = 'Временный журнал'; currentDesc = getDocDescription('vrem_jurnal'); break;
        case 'fizo': title = 'Физо (100м)'; currentDesc = getDocDescription('fizo'); break;
        case 'hygiene': title = 'Акт об обеспечении средствами личной гигиены'; currentDesc = getDocDescription('hygiene'); break;
        case 'water': title = 'Акт об обеспечении круглосуточного питьевого режима'; currentDesc = getDocDescription('water'); break;
        case 'certificate': title = 'Акт передачи удостоверений'; currentDesc = getDocDescription('certificate'); break;
        default: return;
      }
      openEditDescriptionModal(docType, title, currentDesc);
    });
  });
}