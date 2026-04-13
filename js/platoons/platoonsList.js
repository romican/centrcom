function renderPlatoonsList() {
  const list = document.getElementById('platoonsList');
  if (!list) return;
  const sorted = window.platoonsHelpers.sortPlatoonsByNumber(window.platoon_platoons || []);
  const platoonsWithCount = sorted.map(p => ({
    ...p,
    count: (window.platoon_allParticipants || []).filter(m => m.platoon_id === p.id).length
  }));
  list.innerHTML = platoonsWithCount.map(p => `
    <li class="platoon-item ${window.platoon_currentPlatoonId == p.id ? 'active' : ''}" data-id="${p.id}">
      <span class="platoon-name">${window.escapeHtml(p.name)}</span>
      <span class="platoon-count">(${p.count} чел.)</span>
      <div class="platoon-actions">
        <button class="edit-platoon" data-id="${p.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-platoon" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    </li>
  `).join('');
  attachPlatoonListEvents();
}

function attachPlatoonListEvents() {
  document.querySelectorAll('.platoon-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.edit-platoon') || e.target.closest('.delete-platoon')) return;
      const id = el.getAttribute('data-id');
      window.platoon_currentPlatoonId = parseInt(id);
      renderPlatoonsList();
      if (window.renderPlatoonDetail) window.renderPlatoonDetail(window.platoon_currentPlatoonId);
    });
    const editBtn = el.querySelector('.edit-platoon');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = editBtn.getAttribute('data-id');
        openEditPlatoonNameModal(id);
      });
    }
    const delBtn = el.querySelector('.delete-platoon');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = delBtn.getAttribute('data-id');
        if (confirm('Удалить взвод? Участники останутся без взвода.')) {
          fetch(`/api/platoons/${id}`, { method: 'DELETE' }).then(() => {
            if (window.platoon_loadData) window.platoon_loadData();
          });
        }
      });
    }
  });
}

async function openEditPlatoonNameModal(platoonId) {
  const platoon = window.platoon_platoons.find(p => p.id == platoonId);
  if (!platoon) return;
  const newName = prompt('Введите новое название взвода:', platoon.name);
  if (newName && newName.trim()) {
    await fetch(`/api/platoons/${platoonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    if (window.platoon_loadData) window.platoon_loadData();
  }
}

window.renderPlatoonsList = renderPlatoonsList;