// ========== ТОЧКА ВХОДА ДЛЯ СБОРОВ ==========
// Загружает сборы и инициализирует раздел
window.loadCollections = async function() {
  try {
    const resp = await fetch('/api/collections', { cache: 'no-store' });
    if (!resp.ok) throw new Error();
    const collections = await resp.json();
    window.renderCollections(collections);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="collections-table-container">Ошибка загрузки сборов</div>';
  }
};