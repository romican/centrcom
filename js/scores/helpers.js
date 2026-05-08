import { scores_currentPlatoonId, scores_currentSchoolId } from './state.js';

export function showLoader() {
  const container = document.getElementById('scoresTableContainer');
  if (!container) return;
  let loader = container.querySelector('.scores-loader');
  if (loader) loader.remove();
  loader = document.createElement('div');
  loader.className = 'scores-loader';
  loader.innerHTML = '<div class="loader-spinner"></div>';
  container.style.position = 'relative';
  container.appendChild(loader);
}

export function hideLoader() {
  const loader = document.querySelector('.scores-loader');
  if (loader) loader.remove();
  const container = document.getElementById('scoresTableContainer');
  if (container) container.style.position = '';
}

export function updatePlatoonButtonsState() {
  const btns = ['platoonAll5Btn', 'platoonAll4Btn', 'platoonAll3Btn', 'platoonClearBtn'];
  const isSelected = scores_currentPlatoonId !== null && scores_currentPlatoonId !== '';
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !isSelected;
      btn.style.opacity = isSelected ? '1' : '0.5';
      btn.style.cursor = isSelected ? 'pointer' : 'not-allowed';
    }
  });
}

export function updateSchoolButtonsState() {
  const btns = ['schoolAll5Btn', 'schoolAll4Btn', 'schoolAll3Btn', 'schoolClearBtn'];
  const isSchoolSelected = scores_currentSchoolId !== null && scores_currentSchoolId !== '';
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !isSchoolSelected;
      btn.style.opacity = isSchoolSelected ? '1' : '0.5';
      btn.style.cursor = isSchoolSelected ? 'pointer' : 'not-allowed';
    }
  });
}