// Вспомогательные функции

export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function generateWeekDays(dateStart, dateEnd) {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const days = [];
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  let current = new Date(start);
  while (current <= end) {
    const dayName = weekdays[current.getDay()];
    const dateStr = current.toISOString().slice(0,10);
    days.push({
      dayName,
      date: dateStr,
      display: `${dayName} (${window.formatDate(dateStr)})`
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function getAutoSelectCollectionId(collections) {
  if (!collections.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const current = collections.find(c => c.date_start <= today && c.date_end >= today);
  if (current) return current.id;
  const sorted = [...collections].sort((a,b) => new Date(b.date_end) - new Date(a.date_end));
  return sorted[0].id;
}