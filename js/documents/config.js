// ========== Управление описаниями документов ==========
// Описания больше не используются, модуль оставлен для возможной будущей конфигурации.
let docDescriptions = {};

export function loadDocDescriptions() {
  const saved = localStorage.getItem('docDescriptions');
  if (saved) {
    try {
      docDescriptions = JSON.parse(saved);
    } catch(e) {}
  }
  if (!docDescriptions['svodnaya']) docDescriptions['svodnaya'] = 'Сводная ведомость по школе: список участников, даты сборов.';
  if (!docDescriptions['vrem_jurnal']) docDescriptions['vrem_jurnal'] = 'Временный журнал для школы и взвода: список участников, объединённые ячейки.';
  if (!docDescriptions['fizo']) docDescriptions['fizo'] = 'Протокол выполнения норматива "Бег 100 метров" по взводу.';
  if (!docDescriptions['hygiene']) docDescriptions['hygiene'] = 'Акт об обеспечении средствами личной гигиены по школам сбора.';
  if (!docDescriptions['water']) docDescriptions['water'] = 'Акт об обеспечении круглосуточного питьевого режима по школам сбора.';
  if (!docDescriptions['certificate']) docDescriptions['certificate'] = 'Акт передачи удостоверений по школам сбора.';
  saveDocDescriptions();
}

export function saveDocDescriptions() {
  localStorage.setItem('docDescriptions', JSON.stringify(docDescriptions));
}

export function getDocDescription(docId) {
  return docDescriptions[docId] || '';
}

export function setDocDescription(docId, desc) {
  docDescriptions[docId] = desc;
  saveDocDescriptions();
}