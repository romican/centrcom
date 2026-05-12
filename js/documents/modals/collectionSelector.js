// Модалка выбора одного или нескольких сборов
const collectionsChecklistDiv = document.getElementById('collectionsChecklist');
const selectModal = document.getElementById('selectCollectionsModal');
const generateDocBtn = document.getElementById('generateDocBtn');
const closeSelectModalBtn = document.getElementById('closeSelectModalBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');

export function showCollectionSelector(collections, options = { singleSelect: false }) {
  return new Promise((resolve) => {
    if (!collections.length) {
      resolve(null);
      return;
    }

    const oldHandler = generateDocBtn.onclick;

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
      generateDocBtn.onclick = oldHandler;
    };

    const onConfirm = () => {
      const selected = getSelected();
      if (!selected.length) {
        alert('Выберите хотя бы один сбор');
        return;
      }
      closeModal();
      resolve(selected);
    };

    const onCancel = () => {
      closeModal();
      resolve(null); // разрешаем Promise с null – отмена
    };

    generateDocBtn.onclick = onConfirm;
    closeSelectModalBtn.onclick = onCancel;
    cancelSelectBtn.onclick = onCancel;
    selectModal.onclick = (e) => {
      if (e.target === selectModal) onCancel();
    };

    renderCheckboxes();
    selectModal.style.display = 'flex';
  });
}