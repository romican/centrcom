// ========== Модалка выбора одного или нескольких сборов ==========
const collectionsChecklistDiv = document.getElementById('collectionsChecklist');
const selectModal = document.getElementById('selectCollectionsModal');
const generateDocBtn = document.getElementById('generateDocBtn');
const closeSelectModalBtn = document.getElementById('closeSelectModalBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');

// Показывает модалку для выбора сборов и возвращает Promise с массивом выбранных id.
export function showCollectionSelector(collections, options = { singleSelect: false }) {
  return new Promise((resolve, reject) => {
    if (!collections.length) {
      reject(new Error('Нет сборов для выбора'));
      return;
    }

    const renderCheckboxes = () => {
      collectionsChecklistDiv.innerHTML = collections.map(col => `
        <label style="display: block; margin-bottom: 12px; cursor: pointer;">
          <input type="${options.singleSelect ? 'radio' : 'checkbox'}" name="collection" value="${col.id}">
          ${window.formatDate(col.date_start)} — ${window.formatDate(col.date_end)} (${col.military_unit})
        </label>
      `).join('');
    };

    const getSelected = () => {
      const inputs = collectionsChecklistDiv.querySelectorAll('input[name="collection"]:checked');
      return Array.from(inputs).map(inp => inp.value);
    };

    const closeModal = () => {
      selectModal.style.display = 'none';
      generateDocBtn.onclick = null;
    };

    const oldHandler = generateDocBtn.onclick;
    generateDocBtn.onclick = () => {
      const selected = getSelected();
      if (!selected.length) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      closeModal();
      resolve(selected);
    };

    const restoreHandler = () => {
      generateDocBtn.onclick = oldHandler;
    };

    closeSelectModalBtn.addEventListener('click', restoreHandler, { once: true });
    cancelSelectBtn.addEventListener('click', restoreHandler, { once: true });
    selectModal.addEventListener('click', (e) => {
      if (e.target === selectModal) restoreHandler();
    }, { once: true });

    renderCheckboxes();
    selectModal.style.display = 'flex';
  });
}