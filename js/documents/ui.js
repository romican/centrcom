import * as handlers from './handlers.js';

// Кастомная модалка-заглушка для «Печать»
function showNotAvailableModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:320px; text-align:center; padding:32px 24px 24px 24px;">
        <div style="width:80px; height:80px; border-radius:50%; background:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          <i class="fas fa-exclamation-triangle" style="font-size:36px; color:white;"></i>
        </div>
        <h2 style="margin:0 0 16px 0; font-size:1.2rem; font-weight:600;">Пока не доступно</h2>
        <button class="btn add" id="notAvailOkBtn" style="min-width:100px;">ОК</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('#notAvailOkBtn').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); resolve(); }
    });
  });
}

export function renderDocuments() {
  const html = `
    <div class="documents-two-columns">
      <div class="doc-column">
        <div class="doc-column-title">Контрактные документы</div>
        <div class="doc-cards-grid">
          <div class="doc-card" data-doc="svodnaya">
            <div class="doc-card-title">Сводная ведомость</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="svodnaya"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="svodnaya"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="vrem_jurnal">
            <div class="doc-card-title">Временный журнал</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="vrem_jurnal"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="vrem_jurnal"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="hygiene">
            <div class="doc-card-title">Акт об обеспечении средствами личной гигиены</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="hygiene"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="hygiene"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="water">
            <div class="doc-card-title">Акт об обеспечении круглосуточного питьевого режима</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="water"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="water"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="certificate">
            <div class="doc-card-title">Акт передачи удостоверений</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="certificate"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="certificate"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
          <div class="doc-card" data-doc="graph_disinfection">
            <div class="doc-card-title">График дезинфекции воздушной среды</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="graph_disinfection"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="graph_disinfection"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
        </div>
      </div>
      <div class="doc-column">
        <div class="doc-column-title">Внутренние документы</div>
        <div class="doc-cards-grid">
          <div class="doc-card" data-doc="fizo">
            <div class="doc-card-title">Физо (100м)</div>
            <div class="doc-card-buttons">
              <button class="doc-card-btn generate" data-doc="fizo"><i class="fas fa-download"></i> Скачать</button>
              <button class="doc-card-btn print" data-doc="fizo"><i class="fas fa-print"></i> Печать</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  window.contentBody.innerHTML = html;

  // Скачать
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
        case 'graph_disinfection': await handlers.handleGraphDisinfection(); break;
        default: break;
      }
    });
  });

  // Печать – заглушка
  document.querySelectorAll('.doc-card-btn.print').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await showNotAvailableModal();
    });
  });
}