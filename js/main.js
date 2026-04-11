// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
window.sidebar = document.getElementById('sidebar');
window.toggleBtn = document.getElementById('toggleSidebarBtn');
window.addButton = document.getElementById('addButton');
window.themeToggleBtn = document.getElementById('themeToggleBtn');
window.sectionTitle = document.getElementById('sectionTitle');
window.contentBody = document.getElementById('contentBody');

window.busModal = document.getElementById('addModal');
window.collectionModal = document.getElementById('collectionModal');
window.invoiceModal = document.getElementById('invoiceModal');
window.employeeModal = document.getElementById('employeeModal');
window.selectCollectionsModal = document.getElementById('selectCollectionsModal');

window.editModal = document.getElementById('editModal');
window.editModalContent = document.getElementById('editModalContent');

// ========== ОБЩИЕ ФУНКЦИИ ==========
window.formatDate = function(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};
window.formatCurrency = function(amount) {
  return Number(amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽';
};
window.escapeHtml = function(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
};
window.calculateAge = function(birthday) {
  if (!birthday) return 0;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};
window.calculateYears = function(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) years--;
  return years;
};

// ========== ТЕМА ==========
function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
    window.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-theme');
    window.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}
function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
    window.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  } else {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    window.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  }
}
window.themeToggleBtn.addEventListener('click', toggleTheme);
loadTheme();

// ========== ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ С ПОДМЕНЮ ==========
window.switchSection = function(section) {
  localStorage.setItem('activeSection', section);

  // Управление видимостью подменю
  const logisticsSubmenu = document.getElementById('logisticsSubmenu');
  const collectionsSubmenu = document.getElementById('collectionsSubmenu');

  // Подменю логистики (показываем при выборе "Логистика" или "Документы (логистика)")
  if (section === 'buses' || section === 'logistics-docs') {
    if (logisticsSubmenu) logisticsSubmenu.classList.add('show');
  } else {
    if (logisticsSubmenu) logisticsSubmenu.classList.remove('show');
  }

  // Подменю сборов (показываем при выборе "Сборы", "Взвода", "Документы (сборы)")
  if (section === 'collections' || section === 'platoons' || section === 'documents') {
    if (collectionsSubmenu) collectionsSubmenu.classList.add('show');
  } else {
    if (collectionsSubmenu) collectionsSubmenu.classList.remove('show');
  }

  // Обработка разделов
  if (section === 'buses') {
    window.sectionTitle.innerText = 'Логистика';
    window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openBusModal();
    if (window.loadBuses) window.loadBuses();
  } else if (section === 'logistics-docs') {
    window.sectionTitle.innerText = 'Документы (логистика)';
    window.addButton.style.display = 'none';
    window.contentBody.innerHTML = '<div class="empty-message">Раздел в разработке</div>';
  } else if (section === 'collections') {
    window.sectionTitle.innerText = 'Сборы';
    window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openCollectionModal();
    if (window.loadCollections) window.loadCollections();
  } else if (section === 'platoons') {
    window.sectionTitle.innerText = 'Взвода';
    window.addButton.style.display = 'none';
    if (window.renderPlatoons) window.renderPlatoons();
  } else if (section === 'documents') {
    window.sectionTitle.innerText = 'Документы (сборы)';
    window.addButton.style.display = 'none';
    if (window.renderDocuments) window.renderDocuments();
  } else if (section === 'invoices') {
    window.sectionTitle.innerText = 'Счета';
    window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openInvoiceModal();
    if (window.loadInvoices) window.loadInvoices();
  } else if (section === 'employees') {
    window.sectionTitle.innerText = 'Сотрудники';
    window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openEmployeeModal();
    if (window.loadEmployees) window.loadEmployees();
  }
};

// Навигация по меню
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    window.switchSection(item.dataset.section);
  });
});

window.toggleBtn.addEventListener('click', () => {
  window.sidebar.classList.toggle('collapsed');
});

// Инициализация после полной загрузки страницы
window.addEventListener('load', function() {
  const savedSection = localStorage.getItem('activeSection');
  const validSections = ['buses', 'logistics-docs', 'collections', 'platoons', 'documents', 'invoices', 'employees'];
  if (savedSection && validSections.includes(savedSection)) {
    const activeNav = document.querySelector(`.nav-item[data-section="${savedSection}"]`);
    if (activeNav) {
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      activeNav.classList.add('active');
    }
    window.switchSection(savedSection);
  } else {
    window.switchSection('buses');
  }
});