// ========== ОБРАБОТЧИКИ ДЛЯ ШКОЛ (добавление, удаление, редактирование, открытие участников) ==========
// Эта функция вызывается после отрисовки таблицы школ
window.initSchoolsModalHandlers = function() {
  // Кнопка "Добавить школу"
  const addBtn = document.getElementById('addSchoolBtn');
  if (addBtn) {
    addBtn.removeEventListener('click', window.handleAddSchool);
    addBtn.addEventListener('click', window.handleAddSchool);
  }
  
  // Кнопки удаления и редактирования в строках
  document.querySelectorAll('.delete-school-btn').forEach(btn => {
    btn.removeEventListener('click', window.handleDeleteSchool);
    btn.addEventListener('click', window.handleDeleteSchool);
  });
  document.querySelectorAll('.edit-school-btn').forEach(btn => {
    btn.removeEventListener('click', window.handleEditSchool);
    btn.addEventListener('click', window.handleEditSchool);
  });
  
  // Клик по строке школы – открыть участников
  document.querySelectorAll('.school-row').forEach(row => {
    row.removeEventListener('click', window.handleSchoolRowClick);
    row.addEventListener('click', window.handleSchoolRowClick);
  });
};

window.handleAddSchool = function() {
  // Создаём модалку добавления школы, если её нет
  let addModal = document.getElementById('addSchoolModal');
  if (!addModal) {
    addModal = document.createElement('div');
    addModal.id = 'addSchoolModal';
    addModal.className = 'modal';
    addModal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2><i class="fas fa-plus-circle"></i> Добавить школу</h2>
          <button class="close-modal" id="closeAddSchoolModalBtn">&times;</button>
        </div>
        <div style="padding: 16px 24px;">
          <form id="addSchoolForm">
            <div class="form-group">
              <label><i class="fas fa-school"></i> Название школы</label>
              <input type="text" id="schoolName" placeholder="ГБОУ Школа №..." required>
            </div>
            <div class="form-group">
              <label><i class="fas fa-user-tie"></i> Руководитель сборов (школа)</label>
              <input type="text" id="headTeacher" placeholder="Иванов Иван Иванович">
            </div>
            <div class="form-group">
              <label><i class="fas fa-list-ul"></i> Список людей (ФИО, каждый с новой строки)</label>
              <textarea id="schoolPeopleList" rows="8" placeholder="Иванов Иван Иванович&#10;Петров Петр Петрович" required style="width:100%; padding:12px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit;"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn cancel" id="cancelAddSchoolBtn">Отменить</button>
              <button type="submit" class="btn add">Сохранить школу</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(addModal);
    
    // Обработчики закрытия модалки
    document.getElementById('closeAddSchoolModalBtn').addEventListener('click', () => {
      addModal.style.display = 'none';
    });
    document.getElementById('cancelAddSchoolBtn').addEventListener('click', () => {
      addModal.style.display = 'none';
    });
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) addModal.style.display = 'none';
    });
    
    // Обработчик отправки формы
    document.getElementById('addSchoolForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const edu_org = document.getElementById('schoolName').value.trim();
      const head_teacher = document.getElementById('headTeacher').value.trim();
      const peopleList = document.getElementById('schoolPeopleList').value;
      if (!edu_org || !peopleList) {
        alert('Заполните название школы и список людей');
        return;
      }
      const collectionId = window.currentCollectionIdForSchools;
      if (!collectionId) {
        alert('Ошибка: не выбран сбор');
        return;
      }
      try {
        const response = await fetch(`/api/collections/${collectionId}/schools`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edu_org, head_teacher, peopleList })
        });
        if (!response.ok) throw new Error('Ошибка сервера');
        addModal.style.display = 'none';
        // Перезагружаем модалку школ
        if (window.openSchoolsModal) {
          await window.openSchoolsModal(collectionId);
        }
        if (window.loadCollections) window.loadCollections();
      } catch (err) {
        alert('Ошибка добавления школы: ' + err.message);
      }
    });
  }
  addModal.style.display = 'flex';
  document.getElementById('addSchoolForm').reset();
};

window.handleDeleteSchool = async function(e) {
  e.stopPropagation();
  const schoolId = this.getAttribute('data-school-id');
  if (!confirm('Удалить школу и всех её участников?')) return;
  try {
    await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
    const collectionId = window.currentCollectionIdForSchools;
    if (collectionId && window.openSchoolsModal) {
      await window.openSchoolsModal(collectionId);
    }
    if (window.loadCollections) window.loadCollections();
  } catch (err) { alert('Ошибка удаления школы'); }
};

window.handleEditSchool = async function(e) {
  e.stopPropagation();
  const schoolId = this.getAttribute('data-school-id');
  const row = this.closest('.school-row');
  const currentName = row.querySelector('.school-name').innerText;
  const currentHead = row.querySelector('.school-head').innerText === '—' ? '' : row.querySelector('.school-head').innerText;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>Редактировать школу</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <form id="editSchoolForm">
          <div class="form-group">
            <label>Название школы</label>
            <input type="text" id="editSchoolName" value="${window.escapeHtml(currentName)}" required>
          </div>
          <div class="form-group">
            <label>Руководитель сборов</label>
            <input type="text" id="editHeadTeacher" value="${window.escapeHtml(currentHead)}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel">Отмена</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.btn.cancel').addEventListener('click', closeModal);
  modal.querySelector('#editSchoolForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('editSchoolName').value.trim();
    const newHead = document.getElementById('editHeadTeacher').value.trim();
    if (!newName) { alert('Название школы обязательно'); return; }
    try {
      await fetch(`/api/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edu_org: newName, head_teacher: newHead || null })
      });
      closeModal();
      const collectionId = window.currentCollectionIdForSchools;
      if (collectionId && window.openSchoolsModal) {
        await window.openSchoolsModal(collectionId);
      }
      if (window.loadCollections) window.loadCollections();
    } catch (err) { alert('Ошибка редактирования: ' + err.message); }
  });
};

window.handleSchoolRowClick = function(e) {
  if (e.target.closest('.edit-school-btn') || e.target.closest('.delete-school-btn')) return;
  const schoolId = this.getAttribute('data-school-id');
  const schoolName = this.querySelector('.school-name').innerText;
  if (window.openPeopleModal) {
    window.openPeopleModal(schoolId, schoolName);
  } else {
    console.error('window.openPeopleModal не определена');
  }
};