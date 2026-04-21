// ========== ОСНОВНАЯ ЛОГИКА СБОРОВ ==========
window.loadCollections = async function() {
  try {
    const resp = await fetch('/api/collections');
    if (!resp.ok) throw new Error();
    const collections = await resp.json();
    renderCollections(collections);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="collections-table-container">Ошибка загрузки сборов</div>';
  }
};

function renderCollections(collections) {
  if (!collections.length) {
    window.contentBody.innerHTML = `<div class="collections-table-container"><table class="collections-table"><thead><tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Кол-во человек</th><th>Взводов</th><th>Войсковая часть</th><th>Действия</th></tr></thead><tbody><tr><td colspan="7" class="loading-cell">Нет сборов</tbody></table></div>`;
    return;
  }
  let html = `<div class="collections-table-container"><table class="collections-table"><thead><tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Кол-во человек</th><th>Взводов</th><th>Войсковая часть</th><th>Действия</th></tr></thead><tbody>`;
  collections.forEach((col, idx) => {
    html += `<tr data-collection-id="${col.id}" class="collection-row">
      <td>${idx+1}</td>
      <td>${window.formatDate(col.date_start)}</td>
      <td>${window.formatDate(col.date_end)}</td>
      <td>${col.people_count || 0}</td>
      <td>${col.platoons_count || 0}</td>
      <td>${window.escapeHtml(col.military_unit)}</td>
      <td>
        <button class="edit-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  window.contentBody.innerHTML = html;
  attachCollectionEvents();
}

function attachCollectionEvents() {
  document.querySelectorAll('.delete-btn[data-type="collection"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Удалить сбор со всеми школами и участниками?')) {
        fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(() => window.loadCollections());
      }
    });
  });
  document.querySelectorAll('.edit-btn[data-type="collection"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openEditCollectionModal(id);
    });
  });
  document.querySelectorAll('.collection-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;
      const id = row.getAttribute('data-collection-id');
      openSchoolsModal(id);
    });
  });
}

async function openEditCollectionModal(id) {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    const collection = collections.find(c => c.id == id);
    if (!collection) return;
    window.editModalContent.innerHTML = `
      <div class="modal-header">
        <h2><i class="fas fa-edit"></i> Редактировать сбор</h2>
        <button class="close-modal" id="closeEditModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <form id="editCollectionForm">
          <div class="form-row">
            <div class="form-group"><label><i class="fas fa-calendar-alt"></i> Дата заезда</label><input type="date" id="editDateStart" value="${collection.date_start}" required></div>
            <div class="form-group"><label><i class="fas fa-calendar-check"></i> Дата выезда</label><input type="date" id="editDateEnd" value="${collection.date_end}" required></div>
          </div>
          <div class="form-group"><label><i class="fas fa-shield-alt"></i> Войсковая часть</label><input type="text" id="editMilitaryUnit" value="${window.escapeHtml(collection.military_unit)}" required></div>
          <div class="form-actions">
            <button type="button" class="btn cancel" id="cancelEditBtn">Отменить</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    `;
    window.editModal.style.display = 'flex';
    document.getElementById('closeEditModalBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('cancelEditBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('editCollectionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        date_start: document.getElementById('editDateStart').value,
        date_end: document.getElementById('editDateEnd').value,
        military_unit: document.getElementById('editMilitaryUnit').value.trim()
      };
      try {
        await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        window.editModal.style.display = 'none';
        window.loadCollections();
      } catch (err) { alert('Ошибка обновления'); }
    });
  } catch (err) { alert('Ошибка загрузки данных'); }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ openSchoolsModal
async function openSchoolsModal(collectionId) {
  // Устанавливаем ID сбора в schools.js
  if (typeof window.setCurrentCollectionId === 'function') {
    window.setCurrentCollectionId(collectionId);
  }
  
  const collectionsResp = await fetch('/api/collections');
  const allCollections = await collectionsResp.json();
  const collection = allCollections.find(c => c.id == collectionId);
  if (collection) {
    const schoolsInfoDiv = document.getElementById('schoolsInfo');
    if (schoolsInfoDiv) {
      schoolsInfoDiv.innerHTML = `
        <strong>Сбор:</strong> ${window.formatDate(collection.date_start)} — ${window.formatDate(collection.date_end)}<br>
        <strong>Войсковая часть:</strong> ${window.escapeHtml(collection.military_unit)}
      `;
    }
  }
  if (window.loadSchools) {
    await window.loadSchools(collectionId);
  }
  const schoolsModal = document.getElementById('schoolsModal');
  if (schoolsModal) schoolsModal.style.display = 'flex';
  const searchInput = document.getElementById('searchSchoolInput');
  if (searchInput) searchInput.value = '';
  if (window.filterSchools) window.filterSchools();
}

// Форма создания сбора
const collectionForm = document.getElementById('collectionForm');
if (collectionForm) {
  collectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date_start = document.getElementById('colDateStart')?.value;
    const date_end = document.getElementById('colDateEnd')?.value;
    const military_unit = document.getElementById('militaryUnit')?.value.trim();
    if (!date_start || !date_end || !military_unit) {
      alert('Заполните даты и войсковую часть');
      return;
    }
    if (date_start > date_end) {
      alert('Дата заезда не может быть позже даты выезда');
      return;
    }
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_start, date_end, military_unit })
      });
      if (!response.ok) throw new Error('Ошибка сервера');
      const modal = document.getElementById('collectionModal');
      if (modal) modal.style.display = 'none';
      window.loadCollections();
    } catch (err) { alert('Ошибка добавления сбора: ' + err.message); }
  });
}

window.openCollectionModal = function() {
  const modal = document.getElementById('collectionModal');
  if (modal) modal.style.display = 'flex';
  const form = document.getElementById('collectionForm');
  if (form) form.reset();
};

window.addEventListener('click', (e) => {
  const modal = document.getElementById('collectionModal');
  if (modal && e.target === modal) modal.style.display = 'none';
});

window.loadCollections();