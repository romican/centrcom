// ========== СЧЕТА ==========
const issuerInput = document.getElementById('issuer');
const dateIssuedInput = document.getElementById('dateIssued');
const amountInput = document.getElementById('amount');
const ourOrderNumberInput = document.getElementById('ourOrderNumber');
const paymentsInput = document.getElementById('payments');

const closeInvoiceModal = document.getElementById('closeInvoiceModalBtn');
const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
const invoiceForm = document.getElementById('invoiceForm');

let currentInvoiceId = null;

// Модальное окно просмотра счёта (создаём, если ещё нет)
if (!document.getElementById('viewInvoiceModal')) {
  const viewInvoiceModal = document.createElement('div');
  viewInvoiceModal.id = 'viewInvoiceModal';
  viewInvoiceModal.className = 'modal';
  viewInvoiceModal.innerHTML = `<div class="modal-content" style="max-width: 700px; height: 60vh; display: flex; flex-direction: column;">
    <div class="modal-header"><h2><i class="fas fa-file-invoice"></i> Детали счёта</h2><div style="display: flex; align-items: center; gap: 12px;"><input type="text" id="searchInvoiceInput" placeholder="Поиск..." style="padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; width: 180px;"><button class="close-modal" id="closeViewInvoiceModalBtn">&times;</button></div></div>
    <div id="viewInvoiceInfo" style="margin: 0 24px 16px 24px;"></div><div style="flex:1; overflow-y: auto; padding:0 24px;" id="invoiceDetailsContainer"><p>Здесь будет детальная информация.</p></div>
  </div>`;
  document.body.appendChild(viewInvoiceModal);
  document.getElementById('closeViewInvoiceModalBtn').addEventListener('click', () => viewInvoiceModal.style.display = 'none');
  viewInvoiceModal.addEventListener('click', (e) => { if (e.target === viewInvoiceModal) viewInvoiceModal.style.display = 'none'; });
}

window.openInvoiceModal = function() {
  window.invoiceModal.style.display = 'flex';
  invoiceForm.reset();
};

function closeInvoiceModalFunc() {
  window.invoiceModal.style.display = 'none';
}

async function loadInvoices() {
  try {
    const resp = await fetch('/api/invoices');
    if (!resp.ok) throw new Error();
    const invoices = await resp.json();
    renderInvoices(invoices);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="invoices-table-container">Ошибка загрузки счетов</div>';
  }
}

function renderInvoices(invoices) {
  if (!invoices.length) {
    window.contentBody.innerHTML = `<div class="invoices-table-container"><table class="invoices-table"><thead><tr><th>№</th><th>Кто выставил</th><th>Дата выставления</th><th>Сумма счёта</th><th>Номер нашей заявки</th><th>Платежи</th><th>Действия</th></tr></thead><tbody><tr><td colspan="7" class="loading-cell">Нет счетов</td></tr></tbody></table></div>`;
    return;
  }
  let html = `<div class="invoices-table-container"><table class="invoices-table"><thead><tr><th>№</th><th>Кто выставил</th><th>Дата выставления</th><th>Сумма счёта</th><th>Номер нашей заявки</th><th>Платежи</th><th>Действия</th></tr></thead><tbody>`;
  invoices.forEach((inv, idx) => {
    html += `<tr data-invoice-id="${inv.id}" class="invoice-row">
      <td>${idx+1}</td>
      <td>${window.escapeHtml(inv.issuer)}</td>
      <td>${window.formatDate(inv.date_issued)}</td>
      <td>${window.formatCurrency(inv.amount)}</td>
      <td>${window.escapeHtml(inv.our_order_number)}</td>
      <td>${window.escapeHtml(inv.payments || '—')}</td>
      <td>
        <button class="edit-btn" data-id="${inv.id}" data-type="invoice"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${inv.id}" data-type="invoice"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`;
  });
  html += `</tbody></td></div>`;
  window.contentBody.innerHTML = html;
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'invoice') deleteInvoice(id);
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'invoice') openEditInvoiceModal(id);
    });
  });
  document.querySelectorAll('.invoice-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn') || e.target.classList.contains('edit-btn')) return;
      const id = row.getAttribute('data-invoice-id');
      openViewInvoiceModal(id);
    });
  });
}

async function deleteInvoice(id) {
  if (!confirm('Удалить счёт?')) return;
  try {
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    loadInvoices();
  } catch (err) { alert('Ошибка удаления'); }
}

async function openEditInvoiceModal(id) {
  try {
    const resp = await fetch('/api/invoices');
    const invoices = await resp.json();
    const invoice = invoices.find(i => i.id == id);
    if (!invoice) return;
    
    window.editModalContent.innerHTML = `
      <div class="modal-header">
        <h2><i class="fas fa-edit"></i> Редактировать счёт</h2>
        <button class="close-modal" id="closeEditModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <form id="editInvoiceForm">
          <div class="form-group">
            <label><i class="fas fa-user"></i> Кто выставил</label>
            <input type="text" id="editIssuer" value="${window.escapeHtml(invoice.issuer)}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> Дата выставления</label>
            <input type="date" id="editDateIssued" value="${invoice.date_issued}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-ruble-sign"></i> Сумма счёта</label>
            <input type="number" step="0.01" id="editAmount" value="${invoice.amount}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-hashtag"></i> Номер нашей заявки</label>
            <input type="text" id="editOurOrderNumber" value="${window.escapeHtml(invoice.our_order_number)}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-credit-card"></i> Платежи</label>
            <input type="text" id="editPayments" value="${window.escapeHtml(invoice.payments || '')}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel" id="cancelEditBtn">Отменить</button>
            <button type="submit" class="btn add">Сохранить</button>
          </div>
        </form>
      </div>
    `;
    window.editModal.style.display = 'flex';
    
    document.getElementById('closeEditModalBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('cancelEditBtn').addEventListener('click', () => window.editModal.style.display = 'none');
    document.getElementById('editInvoiceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        issuer: document.getElementById('editIssuer').value.trim(),
        date_issued: document.getElementById('editDateIssued').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        our_order_number: document.getElementById('editOurOrderNumber').value.trim(),
        payments: document.getElementById('editPayments').value.trim()
      };
      try {
        await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        window.editModal.style.display = 'none';
        loadInvoices();
      } catch (err) { alert('Ошибка обновления'); }
    });
  } catch (err) { alert('Ошибка загрузки данных'); }
}

invoiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    issuer: issuerInput.value.trim(),
    date_issued: dateIssuedInput.value,
    amount: parseFloat(amountInput.value),
    our_order_number: ourOrderNumberInput.value.trim(),
    payments: paymentsInput.value.trim()
  };
  if (!data.issuer || !data.date_issued || isNaN(data.amount) || !data.our_order_number) {
    return alert('Заполните обязательные поля');
  }
  try {
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    closeInvoiceModalFunc();
    loadInvoices();
  } catch (err) { alert('Ошибка добавления счёта'); }
});

async function openViewInvoiceModal(invoiceId) {
  currentInvoiceId = invoiceId;
  const resp = await fetch('/api/invoices');
  const allInvoices = await resp.json();
  const invoice = allInvoices.find(i => i.id == invoiceId);
  if (invoice) {
    document.getElementById('viewInvoiceInfo').innerHTML = `
      <strong>Счёт №${invoice.id}</strong><br>
      <strong>Кто выставил:</strong> ${window.escapeHtml(invoice.issuer)}<br>
      <strong>Дата:</strong> ${window.formatDate(invoice.date_issued)}<br>
      <strong>Сумма:</strong> ${window.formatCurrency(invoice.amount)}<br>
      <strong>Номер заявки:</strong> ${window.escapeHtml(invoice.our_order_number)}<br>
      <strong>Платежи:</strong> ${window.escapeHtml(invoice.payments || '—')}
    `;
  }
  const viewModal = document.getElementById('viewInvoiceModal');
  if (viewModal) viewModal.style.display = 'flex';
}

closeInvoiceModal.addEventListener('click', closeInvoiceModalFunc);
cancelInvoiceBtn.addEventListener('click', closeInvoiceModalFunc);
window.addEventListener('click', (e) => { if (e.target === window.invoiceModal) closeInvoiceModalFunc(); });
window.editModal.addEventListener('click', (e) => { if (e.target === window.editModal) window.editModal.style.display = 'none'; });

window.loadInvoices = loadInvoices;
window.deleteInvoice = deleteInvoice;