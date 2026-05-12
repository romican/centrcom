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
window.formatDateTime = function(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
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
    if (window.themeToggleBtn) window.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-theme');
    if (window.themeToggleBtn) window.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}
function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
    if (window.themeToggleBtn) window.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  } else {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    if (window.themeToggleBtn) window.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  }
}
if (window.themeToggleBtn) window.themeToggleBtn.addEventListener('click', toggleTheme);
loadTheme();

// ========== ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ==========
window.switchSection = function(section) {
  localStorage.setItem('activeSection', section);

  // Управление подменю
  const logisticsSubmenu = document.getElementById('logisticsSubmenu');
  const collectionsSubmenu = document.getElementById('collectionsSubmenu');
  if (section === 'buses' || section === 'logistics-docs') {
    if (logisticsSubmenu) logisticsSubmenu.classList.add('show');
  } else {
    if (logisticsSubmenu) logisticsSubmenu.classList.remove('show');
  }
  if (section === 'collections' || section === 'platoons' || section === 'barracks' || section === 'documents' || section === 'topics' || section === 'scores') {
    if (collectionsSubmenu) collectionsSubmenu.classList.add('show');
  } else {
    if (collectionsSubmenu) collectionsSubmenu.classList.remove('show');
  }

  // Обработка разделов
  if (section === 'buses') {
    window.sectionTitle.innerText = 'Логистика';
    if (window.addButton) window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openBusModal();
    if (window.loadBuses) window.loadBuses();
  } else if (section === 'logistics-docs') {
    window.sectionTitle.innerText = 'Документы (логистика)';
    if (window.addButton) window.addButton.style.display = 'none';
    window.contentBody.innerHTML = '<div class="empty-message">Раздел в разработке</div>';
  } else if (section === 'collections') {
    window.sectionTitle.innerText = 'Сборы';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.loadCollections) window.loadCollections();
  } else if (section === 'platoons') {
    window.sectionTitle.innerText = 'Взвода';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.renderPlatoons) window.renderPlatoons();
  } else if (section === 'barracks') {
    window.sectionTitle.innerText = 'Казармы';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.renderBarracks) window.renderBarracks();
  } else if (section === 'documents') {
    window.sectionTitle.innerText = 'Документы (сборы)';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.renderDocuments) window.renderDocuments();
  } else if (section === 'topics') {
    window.sectionTitle.innerText = 'Занятия';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.renderTopics) window.renderTopics();
  } else if (section === 'scores') {
    window.sectionTitle.innerText = 'Оценки';
    if (window.addButton) window.addButton.style.display = 'none';
    if (window.renderScores) window.renderScores();
  } else if (section === 'invoices') {
    window.sectionTitle.innerText = 'Счета';
    if (window.addButton) window.addButton.style.display = 'flex';
    window.addButton.onclick = () => window.openInvoiceModal();
    if (window.loadInvoices) window.loadInvoices();
  } else if (section === 'employees') {
    window.sectionTitle.innerText = 'Сотрудники';
    if (window.addButton) window.addButton.style.display = 'flex';
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

if (window.toggleBtn) {
  window.toggleBtn.addEventListener('click', () => {
    if (window.sidebar) window.sidebar.classList.toggle('collapsed');
  });
}

// Инициализация
window.addEventListener('load', function() {
  setTimeout(() => {
    const savedSection = localStorage.getItem('activeSection');
    const validSections = ['buses', 'logistics-docs', 'collections', 'platoons', 'barracks', 'documents', 'topics', 'scores', 'invoices', 'employees'];
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
  }, 50);
});