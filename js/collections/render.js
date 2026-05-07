// ========== ОТРИСОВКА ТАБЛИЦЫ СБОРОВ И СВОДНОЙ ИНФОРМАЦИИ ==========
window.updateSummary = async function(collections) {
  const today = new Date().toISOString().slice(0,10);
  const activeCount = collections.filter(c => c.date_end >= today).length;
  if (document.getElementById('activeCollectionsCount')) document.getElementById('activeCollectionsCount').innerText = activeCount;
  const totalParticipants = collections.reduce((sum, c) => sum + (c.people_count || 0), 0);
  if (document.getElementById('totalParticipantsCount')) document.getElementById('totalParticipantsCount').innerText = totalParticipants;
  const currentParticipants = collections.filter(c => c.date_start <= today && c.date_end >= today).reduce((sum, c) => sum + (c.people_count || 0), 0);
  if (document.getElementById('currentParticipantsCount')) document.getElementById('currentParticipantsCount').innerText = currentParticipants;
};

window.renderCollections = function(collections) {
  if (!window.contentBody) return;
  window.contentBody.innerHTML = '';

  const headerPanel = document.createElement('div');
  headerPanel.className = 'collections-header';
  headerPanel.innerHTML = `
    <div class="collections-title-area">
      <h1 class="section-title">Сборы</h1>
      <button class="add-collection-btn" id="addCollectionBtn"><i class="fas fa-plus"></i> Создать новый сбор</button>
    </div>
    <div class="collections-summary" id="collectionsSummary">
      <div class="summary-card"><div class="summary-label">Всего сборов</div><div class="summary-value" id="totalCollectionsCount">${collections.length}</div></div>
      <div class="summary-card"><div class="summary-label">Активных сборов</div><div class="summary-value" id="activeCollectionsCount">-</div></div>
      <div class="summary-card"><div class="summary-label">Участников всего</div><div class="summary-value" id="totalParticipantsCount">-</div></div>
      <div class="summary-card"><div class="summary-label">Сейчас на сборах</div><div class="summary-value" id="currentParticipantsCount">-</div></div>
    </div>
  `;
  window.contentBody.appendChild(headerPanel);

  const tableContainer = document.createElement('div');
  tableContainer.className = 'collections-table-container';
  window.contentBody.appendChild(tableContainer);

  const table = document.createElement('table');
  table.className = 'collections-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th>№</th><th>Дата заезда</th><th>Дата выезда</th><th>Войсковая часть</th><th>Руководитель</th><th>Школ</th><th>Участников</th><th>Статус</th><th>Действия</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  if (!collections.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="9" class="loading-cell">Нет сборов</td>`;
    tbody.appendChild(row);
  } else {
    collections.forEach((col, idx) => {
      let statusText = 'Сбор создан', statusClass = 'status-created';
      if (col.status === 'schools_added') {
        statusText = 'Добавление школ и участников';
        statusClass = 'status-schools-added';
      } else if (col.status === 'locked') {
        statusText = 'Сбор сформирован';
        statusClass = 'status-locked';
      }
      if (col.schools_count > 0 && col.status !== 'locked') {
        statusText = 'Добавление школ и участников';
        statusClass = 'status-schools-added';
      }
      const row = document.createElement('tr');
      row.setAttribute('data-collection-id', col.id);
      row.className = 'collection-row';
      row.innerHTML = `
        <td>${idx+1}</td>
        <td>${window.formatDate(col.date_start)}</td>
        <td>${window.formatDate(col.date_end)}</td>
        <td>${window.escapeHtml(col.military_unit)}</td>
        <td>${window.escapeHtml(col.head_teacher || '—')}</td>
        <td>${col.schools_count || 0}</td>
        <td>${col.people_count || 0}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td><button class="edit-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-id="${col.id}" data-type="collection"><i class="fas fa-trash-alt"></i></button></td>
      `;
      tbody.appendChild(row);
    });
  }
  table.appendChild(tbody);
  tableContainer.appendChild(table);

  window.attachCollectionEvents();
  window.updateSummary(collections);
};

window.attachCollectionEvents = function() {
  const addBtn = document.getElementById('addCollectionBtn');
  if (addBtn) addBtn.onclick = () => window.openNewCollectionModal();

  document.querySelectorAll('.delete-btn[data-type="collection"]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Удалить сбор?')) fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(() => window.loadCollections());
    };
  });
  document.querySelectorAll('.edit-btn[data-type="collection"]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      window.openEditCollectionModal(id);
    };
  });
  document.querySelectorAll('.collection-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;
      const id = row.getAttribute('data-collection-id');
      window.openSchoolsModal(id);
    };
  });
};