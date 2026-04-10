// ========== ЛОГИСТИКА ==========
const dateStartInput = document.getElementById('dateStart');
const dateEndInput = document.getElementById('dateEnd');
const weekYearInput = document.getElementById('weekYear');
const collectionTypeSelect = document.getElementById('collectionType');
const orgNameInput = document.getElementById('orgName');
const addressInput = document.getElementById('address');

const closeBusModal = document.getElementById('closeModalBtn');
const cancelBusModal = document.getElementById('cancelModalBtn');
const busForm = document.getElementById('addForm');

// Функция открытия модалки (должна быть определена до вызова)
window.openBusModal = function() {
  if (!window.busModal) {
    console.error('busModal not found');
    return;
  }
  window.busModal.style.display = 'flex';
  if (busForm) busForm.reset();
};

function closeBusModalFunc() {
  if (window.busModal) window.busModal.style.display = 'none';
}

async function loadBuses() {
  try {
    const resp = await fetch('/api/buses');
    if (!resp.ok) throw new Error();
    const buses = await resp.json();
    renderBuses(buses);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="table-container">Ошибка загрузки логистики</div>';
  }
}

function renderBuses(buses) {
  if (!buses.length) {
    window.contentBody.innerHTML = `<div class="table-container"><table class="modern-table"><thead><tr><th>Дата заезда</th><th>Дата выезда</th><th>Неделя/год</th><th>Вид сборов</th><th>Наименование ОО</th><th>Адрес подачи</th><th>Действия</th></tr></thead><tbody><tr><td colspan="7" class="loading-cell">Нет данных</td></tbody></table></div>`;
    return;
  }
  let html = `<div class="table-container"><table class="modern-table"><thead><tr><th>Дата заезда</th><th>Дата выезда</th><th>Неделя/год</th><th>Вид сборов</th><th>Наименование ОО</th><th>Адрес подачи</th><th style="width:60px">Действия</th></tr></thead><tbody>`;
  buses.forEach(bus => {
    html += `<tr>
      <td>${window.formatDate(bus.date_start)}</td>
      <td>${window.formatDate(bus.date_end)}</td>
      <td>${window.escapeHtml(bus.week_year)}</td>
      <td>${window.escapeHtml(bus.collection_type)}</td>
      <td>${window.escapeHtml(bus.organization_name)}</td>
      <td>${window.escapeHtml(bus.address)}</td>
      <td><button class="delete-btn" data-id="${bus.id}" data-type="bus"><i class="fas fa-trash-alt"></i></button></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  window.contentBody.innerHTML = html;
  attachDeleteHandlers();
}

async function deleteBus(id) {
  if (!confirm('Удалить запись логистики?')) return;
  try {
    await fetch(`/api/buses/${id}`, { method: 'DELETE' });
    loadBuses();
  } catch (err) { alert('Ошибка удаления'); }
}

busForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newBus = {
    date_start: dateStartInput.value,
    date_end: dateEndInput.value,
    week_year: weekYearInput.value.trim(),
    collection_type: collectionTypeSelect.value,
    organization_name: orgNameInput.value.trim(),
    address: addressInput.value.trim()
  };
  if (Object.values(newBus).some(v => !v)) return alert('Заполните все поля');
  if (newBus.date_start > newBus.date_end) return alert('Дата заезда не может быть позже выезда');
  try {
    await fetch('/api/buses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBus) });
    closeBusModalFunc();
    loadBuses();
  } catch (err) { alert('Ошибка'); }
});

function attachDeleteHandlers() {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'bus') deleteBus(id);
      else if (type === 'collection' && window.deleteCollection) window.deleteCollection(id);
      else if (type === 'invoice' && window.deleteInvoice) window.deleteInvoice(id);
      else if (type === 'employee' && window.deleteEmployee) window.deleteEmployee(id);
    });
  });
}

closeBusModal.addEventListener('click', closeBusModalFunc);
cancelBusModal.addEventListener('click', closeBusModalFunc);
window.addEventListener('click', (e) => { if (e.target === window.busModal) closeBusModalFunc(); });

window.loadBuses = loadBuses;
window.deleteBus = deleteBus;