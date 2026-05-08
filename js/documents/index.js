// ========== Точка входа в модуль документов ==========
import { renderDocuments } from './ui.js';

// Делаем функцию доступной глобально (для вызова из основного navigation)
window.renderDocuments = renderDocuments;