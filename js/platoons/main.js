// ========== ОСНОВНАЯ ЛОГИКА ВЗВОДОВ ==========
let platoon_currentCollectionId = null;
let platoon_currentPlatoonId = null;
let platoon_allParticipants = [];

function renderPlatoonsSection() {
  window.contentBody.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'platoons-container';
  container.innerHTML = `
    <div class="platoons-sidebar">
      <div class="select-collection">
        <label>Выберите сбор:</label>
        <select id="collectionSelect" style="width:100%; padding:10px; border-radius:16px;"></select>
      </div>
      <h3>Взвода <button class="add-platoon-btn" id="addPlatoonBtn"><i class="fas fa-plus"></i> Добавить взвод</button></h3>
      <ul class="platoons-list" id="platoonsList"></ul>
    </div>
    <div class="platoons-main">
      <div class="platoon-title">
        <h2 id="platoonTitle">Выберите взвод</h2>
        <div class="platoon-actions">
          <button class="btn-auto-distribute" id="autoDistributeBtn"><i class="fas fa-magic"></i> Распределить автоматически</button>
          <button class="btn-add-to-platoon" id="addToPlatoonBtn" style="display:none;"><i class="fas fa-user-plus"></i> Добавить в взвод (<span id="selectedCountAdd">0</span>)</button>
          <button class="btn-remove-from-platoon" id="removeFromPlatoonBtn" style="display:none;"><i class="fas fa-user-minus"></i> Удалить из взвода (<span id="selectedCountRemove">0</span>)</button>
          <button class="btn-generate-doc" id="generatePlatoonDocBtn"><i class="fas fa-file-alt"></i> Сформировать документ</button>
        </div>
      </div>
      <div class="people-grid" id="peopleGrid">
        <div class="empty-message">Выберите сбор и взвод</div>
      </div>
    </div>
  `;
  window.contentBody.appendChild(container);

  // Загрузка списка сборов с автовыбором текущего
  fetch('/api/collections')
    .then(res => res.json())
    .then(collections => {
      const select = document.getElementById('collectionSelect');
      if (!select) return;
      if (collections.length === 0) {
        select.innerHTML = '<option value="">-- Нет сборов, создайте в разделе "Сборы" --</option>';
        return;
      }
      select.innerHTML = '<option value="">-- Выберите сбор --</option>' +
        collections.map(c => `<option value="${c.id}" data-start="${c.date_start}" data-end="${c.date_end}">${window.formatDate(c.date_start)} — ${window.formatDate(c.date_end)} (${c.military_unit})</option>`).join('');
      
      // Автовыбор сбора, в который попадает сегодняшняя дата
      const today = new Date().toISOString().slice(0,10);
      let autoSelectedId = null;
      for (const c of collections) {
        if (c.date_start <= today && c.date_end >= today) {
          autoSelectedId = c.id;
          break;
        }
      }
      if (autoSelectedId) {
        select.value = autoSelectedId;
        platoon_currentCollectionId = autoSelectedId;
        platoon_loadData();
      } else {
        platoon_clearUI();
      }
      
      select.addEventListener('change', (e) => {
        platoon_currentCollectionId = e.target.value;
        if (platoon_currentCollectionId) platoon_loadData();
        else platoon_clearUI();
      });
    });

  document.getElementById('addPlatoonBtn').addEventListener('click', () => {
    if (!platoon_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    const nextNumber = (window.platoon_platoons?.length || 0) + 1;
    const name = `ВЗВОД ${nextNumber}`;
    fetch(`/api/collections/${platoon_currentCollectionId}/platoons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(() => platoon_loadData());
  });

  document.getElementById('addToPlatoonBtn').addEventListener('click', window.bulkAddToPlatoon);
  document.getElementById('removeFromPlatoonBtn').addEventListener('click', window.bulkRemoveFromPlatoon);

  // Автоматическое распределение (модалка)
  const autoDistributeModal = document.createElement('div');
  autoDistributeModal.id = 'autoDistributeModal';
  autoDistributeModal.className = 'modal';
  autoDistributeModal.innerHTML = `
    <div class="modal-content" style="max-width: 450px;">
      <div class="modal-header">
        <h2><i class="fas fa-magic"></i> Автоматическое распределение</h2>
        <button class="close-modal" id="closeAutoDistributeModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <div class="form-group">
          <label>Максимум человек во взводе:</label>
          <input type="number" id="maxPerPlatoon" value="31" min="1" step="1" required>
        </div>
        <div class="form-group">
          <label>Количество взводов (оставьте пустым для авто-расчёта):</label>
          <input type="number" id="targetPlatoonsCount" placeholder="Например, 5">
        </div>
        <div class="form-actions">
          <button type="button" class="btn cancel" id="cancelAutoDistributeBtn">Отмена</button>
          <button type="button" class="btn add" id="confirmAutoDistributeBtn">Распределить</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(autoDistributeModal);
  const closeAutoModal = () => autoDistributeModal.style.display = 'none';
  document.getElementById('closeAutoDistributeModalBtn').addEventListener('click', closeAutoModal);
  document.getElementById('cancelAutoDistributeBtn').addEventListener('click', closeAutoModal);
  autoDistributeModal.addEventListener('click', (e) => { if (e.target === autoDistributeModal) closeAutoModal(); });

  document.getElementById('autoDistributeBtn').addEventListener('click', () => {
    if (!platoon_currentCollectionId) {
      alert('Сначала выберите сбор');
      return;
    }
    if (window.platoon_platoons && window.platoon_platoons.length > 0) {
      alert('Удалите все взводы для повторного автоматического распределения');
      return;
    }
    autoDistributeModal.style.display = 'flex';
    document.getElementById('confirmAutoDistributeBtn').onclick = async () => {
      const maxPerPlatoon = parseInt(document.getElementById('maxPerPlatoon').value) || 31;
      let targetPlatoonsCount = parseInt(document.getElementById('targetPlatoonsCount').value);
      if (isNaN(targetPlatoonsCount)) targetPlatoonsCount = null;
      if (maxPerPlatoon < 1) { alert('Максимум человек должен быть не менее 1'); return; }
      closeAutoModal();
      try {
        const response = await fetch(`/api/collections/${platoon_currentCollectionId}/auto-distribute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxPerPlatoon, targetPlatoonsCount })
        });
        if (!response.ok) throw new Error('Ошибка сервера');
        const data = await response.json();
        alert(data.message);
        await platoon_loadData();
      } catch (err) { alert('Ошибка: ' + err.message); }
    };
  });

  document.getElementById('generatePlatoonDocBtn').addEventListener('click', () => {
    if (platoon_currentPlatoonId) platoon_generateDocument(platoon_currentPlatoonId);
  });
}

async function platoon_loadData() {
  if (!platoon_currentCollectionId) return;
  try {
    const [platoonsRes, participantsRes] = await Promise.all([
      fetch(`/api/collections/${platoon_currentCollectionId}/platoons`),
      fetch(`/api/collections/${platoon_currentCollectionId}/participants`)
    ]);
    window.platoon_platoons = await platoonsRes.json();
    platoon_allParticipants = await participantsRes.json();
    window.platoon_allParticipants = platoon_allParticipants;

    window.renderPlatoonsList();
    if (platoon_currentPlatoonId && window.platoon_platoons.find(p => p.id == platoon_currentPlatoonId)) {
      window.renderPlatoonDetail(platoon_currentPlatoonId);
    } else if (window.platoon_platoons.length) {
      platoon_currentPlatoonId = window.platoon_platoons[0].id;
      window.renderPlatoonDetail(platoon_currentPlatoonId);
    } else {
      platoon_currentPlatoonId = null;
      document.getElementById('platoonTitle').innerText = 'Нет взводов';
      document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Создайте взвод кнопкой выше</div>';
      document.getElementById('generatePlatoonDocBtn').style.display = 'inline-block';
      document.getElementById('addToPlatoonBtn').style.display = 'none';
      document.getElementById('removeFromPlatoonBtn').style.display = 'none';
    }
    window.platoonsHelpers.updateAutoDistributeButtonState();
  } catch (err) {
    console.error(err);
    document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Ошибка загрузки</div>';
  }
}

function platoon_clearUI() {
  document.getElementById('platoonsList').innerHTML = '';
  document.getElementById('platoonTitle').innerText = 'Выберите взвод';
  document.getElementById('peopleGrid').innerHTML = '<div class="empty-message">Выберите сбор</div>';
  document.getElementById('addToPlatoonBtn').style.display = 'none';
  document.getElementById('removeFromPlatoonBtn').style.display = 'none';
}

async function platoon_generateDocument(platoonId) {
  try {
    const response = await fetch('/api/generate-platoon-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platoonId })
    });
    if (!response.ok) throw new Error('Ошибка генерации');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platoon_${platoonId}_${Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) { alert('Ошибка: ' + err.message); }
}

window.renderPlatoons = renderPlatoonsSection;
window.platoon_loadData = platoon_loadData;
window.platoon_currentPlatoonId = platoon_currentPlatoonId;
window.platoon_platoons = [];
window.platoon_allParticipants = [];