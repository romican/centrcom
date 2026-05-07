// ========== МОДАЛКИ ДЛЯ СОЗДАНИЯ И РЕДАКТИРОВАНИЯ СБОРА ==========
window.openNewCollectionModal = function() {
  let modal = document.getElementById('newCollectionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newCollectionModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><div class="modal-header"><h2><i class="fas fa-plus-circle"></i> Создать новый сбор</h2><button class="close-modal" id="closeNewCollectionModalBtn">&times;</button></div>
      <div style="padding:16px 24px;"><form id="newCollectionForm">
        <div class="form-group"><label><i class="fas fa-calendar-alt"></i> Дата начала сборов (заезда)</label><input type="date" id="newColDateStart" required></div>
        <div class="form-group"><label><i class="fas fa-calendar-check"></i> Дата окончания (выезда) – автоматически +4 дня</label><input type="date" id="newColDateEnd" readonly disabled style="background:#f0f0f0;"></div>
        <div class="form-group"><label><i class="fas fa-user-tie"></i> Руководитель сборов</label><input type="text" id="newColHeadTeacher" placeholder="Иванов Иван Иванович" required></div>
        <div class="form-group"><label><i class="fas fa-shield-alt"></i> Войсковая часть</label><input type="text" id="newColMilitaryUnit" placeholder="в/ч 12345" required></div>
        <div class="form-actions"><button type="button" class="btn cancel" id="cancelNewCollectionBtn">Отменить</button><button type="submit" class="btn add">Создать сбор</button></div>
      </form></div></div>`;
    document.body.appendChild(modal);
    const dateStart = document.getElementById('newColDateStart');
    const dateEnd = document.getElementById('newColDateEnd');
    dateStart.addEventListener('change', () => {
      if (dateStart.value) {
        const end = new Date(dateStart.value);
        end.setDate(end.getDate() + 4);
        dateEnd.value = end.toISOString().slice(0,10);
      } else dateEnd.value = '';
    });
    const closeModal = () => modal.style.display = 'none';
    document.getElementById('closeNewCollectionModalBtn').onclick = closeModal;
    document.getElementById('cancelNewCollectionBtn').onclick = closeModal;
    document.getElementById('newCollectionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const date_start = document.getElementById('newColDateStart').value;
      const date_end = document.getElementById('newColDateEnd').value;
      const head_teacher = document.getElementById('newColHeadTeacher').value.trim();
      const military_unit = document.getElementById('newColMilitaryUnit').value.trim();
      if (!date_start || !date_end || !head_teacher || !military_unit) { alert('Заполните все поля'); return; }
      try {
        const response = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date_start, date_end, head_teacher, military_unit })
        });
        if (!response.ok) throw new Error();
        closeModal();
        window.loadCollections();
      } catch(err) { alert('Ошибка добавления сбора'); }
    });
  }
  modal.style.display = 'flex';
  document.getElementById('newCollectionForm').reset();
  document.getElementById('newColDateEnd').value = '';
};

window.openEditCollectionModal = async function(id) {
  try {
    const resp = await fetch('/api/collections');
    const collections = await resp.json();
    const collection = collections.find(c => c.id == id);
    if (!collection) return;
    window.editModalContent.innerHTML = `<div class="modal-header"><h2><i class="fas fa-edit"></i> Редактировать сбор</h2><button class="close-modal" id="closeEditModalBtn">&times;</button></div>
      <div style="padding:16px 24px;"><form id="editCollectionForm">
        <div class="form-row"><div class="form-group"><label><i class="fas fa-calendar-alt"></i> Дата заезда</label><input type="date" id="editDateStart" value="${collection.date_start}" required></div>
        <div class="form-group"><label><i class="fas fa-calendar-check"></i> Дата выезда</label><input type="date" id="editDateEnd" value="${collection.date_end}" readonly disabled style="background:#f0f0f0;"></div></div>
        <div class="form-group"><label><i class="fas fa-user-tie"></i> Руководитель сборов</label><input type="text" id="editHeadTeacher" value="${window.escapeHtml(collection.head_teacher || '')}" required></div>
        <div class="form-group"><label><i class="fas fa-shield-alt"></i> Войсковая часть</label><input type="text" id="editMilitaryUnit" value="${window.escapeHtml(collection.military_unit)}" required></div>
        <div class="form-actions"><button type="button" class="btn cancel" id="cancelEditBtn">Отменить</button><button type="submit" class="btn add">Сохранить</button></div>
      </form></div>`;
    window.editModal.style.display = 'flex';
    document.getElementById('closeEditModalBtn').onclick = () => window.editModal.style.display = 'none';
    document.getElementById('cancelEditBtn').onclick = () => window.editModal.style.display = 'none';
    document.getElementById('editCollectionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const date_start = document.getElementById('editDateStart').value;
      const head_teacher = document.getElementById('editHeadTeacher').value.trim();
      const military_unit = document.getElementById('editMilitaryUnit').value.trim();
      try {
        await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date_start, head_teacher, military_unit })
        });
        window.editModal.style.display = 'none';
        window.loadCollections();
      } catch(err) { alert('Ошибка обновления'); }
    });
  } catch(err) { alert('Ошибка загрузки данных'); }
};