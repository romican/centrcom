window.platoonsHelpers = {
  sortPlatoonsByNumber: (platoons) => {
    return [...platoons].sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, 'ru');
    });
  },
  sortBySchoolAndName: (participants) => {
    return [...participants].sort((a, b) => {
      const schoolCompare = (a.school_name || a.organization || '').localeCompare(b.school_name || b.organization || '', 'ru');
      if (schoolCompare !== 0) return schoolCompare;
      return (a.full_name || '').localeCompare(b.full_name || '', 'ru');
    });
  },
  updateAutoDistributeButtonState: () => {
    const autoBtn = document.getElementById('autoDistributeBtn');
    if (!autoBtn) return;
    const hasPlatoons = window.platoon_platoons && window.platoon_platoons.length > 0;
    autoBtn.disabled = hasPlatoons;
    autoBtn.style.opacity = hasPlatoons ? '0.5' : '1';
    autoBtn.style.cursor = hasPlatoons ? 'not-allowed' : 'pointer';
    autoBtn.title = hasPlatoons ? 'Удалите все взводы для повторного автоматического распределения' : '';
  },
};