import { renderBarracksSection, initBarracksHandlers } from './render.js';

window.renderBarracks = async function() {
  await renderBarracksSection();
  initBarracksHandlers();
};