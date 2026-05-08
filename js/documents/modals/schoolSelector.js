import { fetchPlatoonsBySchool } from '../api.js';

function createRadioModal(title, items, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div style="padding:16px 24px;">
        <div id="optionsList" style="max-height:300px; overflow-y:auto; margin-bottom:20px;"></div>
        <div style="display:flex; justify-content:flex-end; gap:12px;">
          <button class="btn cancel">Отмена</button>
          <button class="btn add">Выбрать</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const listDiv = modal.querySelector('#optionsList');
  const closeModal = () => modal.remove();
  const cancelBtn = modal.querySelector('.btn.cancel');
  const confirmBtn = modal.querySelector('.btn.add');
  const closeBtn = modal.querySelector('.close-modal');

  listDiv.innerHTML = items.map(item => `
    <label style="display:block; margin-bottom:12px; cursor:pointer;">
      <input type="radio" name="selected" value="${item.id}">
      ${window.escapeHtml(item.label)} (${item.people_count || 0} чел.)
    </label>
  `).join('');

  const getSelected = () => {
    const radio = listDiv.querySelector('input[name="selected"]:checked');
    return radio ? radio.value : null;
  };

  const handleConfirm = () => {
    const selectedId = getSelected();
    if (!selectedId) {
      alert('Выберите вариант');
      return;
    }
    closeModal();
    onConfirm(selectedId);
  };

  confirmBtn.onclick = handleConfirm;
  cancelBtn.onclick = closeModal;
  closeBtn.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  modal.style.display = 'flex';
}

export function showSchoolSelector(schools, onConfirm) {
  const items = schools.map(s => ({ id: s.id, label: s.edu_org, people_count: s.people_count }));
  createRadioModal('Выберите школу', items, onConfirm);
}

export function showPlatoonSelector(platoons, onConfirm) {
  const items = platoons.map(p => ({ id: p.id, label: p.name, people_count: p.people_count }));
  createRadioModal('Выберите взвод', items, onConfirm);
}

export async function showTempJournalSchoolAndPlatoonSelector(schools) {
  return new Promise((resolve) => {
    showSchoolSelector(schools, async (schoolId) => {
      const platoons = await fetchPlatoonsBySchool(schoolId);
      if (!platoons.length) {
        alert('В этой школе нет взводов');
        resolve(null);
      } else {
        showPlatoonSelector(platoons, (platoonId) => {
          resolve({ schoolId: parseInt(schoolId), platoonId });
        });
      }
    });
  });
}