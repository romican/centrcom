// ========== СОТРУДНИКИ ==========
const empPosition = document.getElementById('empPosition');
const empFio = document.getElementById('empFio');
const empStartDate = document.getElementById('empStartDate');
const empBirthday = document.getElementById('empBirthday');
const empPhone = document.getElementById('empPhone');

const closeEmployeeModal = document.getElementById('closeEmployeeModalBtn');
const cancelEmployeeBtn = document.getElementById('cancelEmployeeBtn');
const employeeForm = document.getElementById('employeeForm');

window.openEmployeeModal = function() {
  window.employeeModal.style.display = 'flex';
  employeeForm.reset();
};

function closeEmployeeModalFunc() {
  window.employeeModal.style.display = 'none';
}

async function loadEmployees() {
  try {
    const resp = await fetch('/api/employees');
    if (!resp.ok) throw new Error();
    const employees = await resp.json();
    renderEmployees(employees);
  } catch (err) {
    window.contentBody.innerHTML = '<div class="employees-table-container">Ошибка загрузки сотрудников</div>';
  }
}

function renderEmployees(employees) {
  if (!employees.length) {
    window.contentBody.innerHTML = `<div class="employees-table-container"><table class="employees-table"><thead><tr><th>№</th><th>Должность</th><th>ФИО</th><th>Дата начала</th><th>Стаж (лет)</th><th>Дата рождения</th><th>Телефон</th><th>Полных лет</th><th>Действия</th></tr></thead><tbody><tr><td colspan="9" class="loading-cell">Нет сотрудников</td></tr></tbody></table></div>`;
    return;
  }
  let html = `<div class="employees-table-container"><table class="employees-table"><thead><tr><th>№</th><th>Должность</th><th>ФИО</th><th>Дата начала</th><th>Стаж (лет)</th><th>Дата рождения</th><th>Телефон</th><th>Полных лет</th><th>Действия</th></tr></thead><tbody>`;
  employees.forEach((emp, idx) => {
    const age = window.calculateAge(emp.birthday);
    const yearsExp = window.calculateYears(emp.start_date);
    html += `<tr data-employee-id="${emp.id}">
      <td>${idx+1}</td>
      <td>${window.escapeHtml(emp.position)}</td>
      <td>${window.escapeHtml(emp.fio)}</td>
      <td>${window.formatDate(emp.start_date)}</td>
      <td>${yearsExp}</td>
      <td>${window.formatDate(emp.birthday)}</td>
      <td>${window.escapeHtml(emp.phone)}</td>
      <td>${age}</td>
      <td>
        <button class="edit-btn" data-id="${emp.id}" data-type="employee"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${emp.id}" data-type="employee"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  window.contentBody.innerHTML = html;
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'employee') deleteEmployee(id);
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (type === 'employee') openEditEmployeeModal(id);
    });
  });
}

async function deleteEmployee(id) {
  if (!confirm('Удалить сотрудника?')) return;
  try {
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
  } catch (err) { alert('Ошибка удаления'); }
}

async function openEditEmployeeModal(id) {
  try {
    const resp = await fetch('/api/employees');
    const employees = await resp.json();
    const employee = employees.find(e => e.id == id);
    if (!employee) return;
    
    window.editModalContent.innerHTML = `
      <div class="modal-header">
        <h2><i class="fas fa-edit"></i> Редактировать сотрудника</h2>
        <button class="close-modal" id="closeEditModalBtn">&times;</button>
      </div>
      <div style="padding: 16px 24px;">
        <form id="editEmployeeForm">
          <div class="form-group">
            <label><i class="fas fa-user-tag"></i> Должность</label>
            <input type="text" id="editPosition" value="${window.escapeHtml(employee.position)}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-user"></i> ФИО</label>
            <input type="text" id="editFio" value="${window.escapeHtml(employee.fio)}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> Дата начала работы</label>
            <input type="date" id="editStartDate" value="${employee.start_date}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-birthday-cake"></i> Дата рождения</label>
            <input type="date" id="editBirthday" value="${employee.birthday}" required>
          </div>
          <div class="form-group">
            <label><i class="fas fa-phone"></i> Телефон</label>
            <input type="tel" id="editPhone" value="${window.escapeHtml(employee.phone)}" required>
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
    document.getElementById('editEmployeeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        position: document.getElementById('editPosition').value.trim(),
        fio: document.getElementById('editFio').value.trim(),
        start_date: document.getElementById('editStartDate').value,
        birthday: document.getElementById('editBirthday').value,
        phone: document.getElementById('editPhone').value.trim()
      };
      try {
        await fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        window.editModal.style.display = 'none';
        loadEmployees();
      } catch (err) { alert('Ошибка обновления'); }
    });
  } catch (err) { alert('Ошибка загрузки данных'); }
}

employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    position: empPosition.value.trim(),
    fio: empFio.value.trim(),
    start_date: empStartDate.value,
    birthday: empBirthday.value,
    phone: empPhone.value.trim()
  };
  if (!data.position || !data.fio || !data.start_date || !data.birthday || !data.phone) {
    return alert('Заполните все поля');
  }
  try {
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    closeEmployeeModalFunc();
    loadEmployees();
  } catch (err) { alert('Ошибка добавления сотрудника'); }
});

closeEmployeeModal.addEventListener('click', closeEmployeeModalFunc);
cancelEmployeeBtn.addEventListener('click', closeEmployeeModalFunc);
window.addEventListener('click', (e) => { if (e.target === window.employeeModal) closeEmployeeModalFunc(); });
window.editModal.addEventListener('click', (e) => { if (e.target === window.editModal) window.editModal.style.display = 'none'; });

window.loadEmployees = loadEmployees;
window.deleteEmployee = deleteEmployee;