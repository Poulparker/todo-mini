'use strict';

// Хранилище задачника. Всё состояние (задачи, фильтр, черновик ввода)
// лежит в localStorage браузера одной записью под ключом todo-mini.v1.
const TaskStore = (() => {
  const KEY = 'todo-mini.v1';
  const BACKUP_KEY = 'todo-mini.v1.backup';
  // Ключи прошлой версии (практикумы 1–2): данные из них переносятся
  const OLD_TASKS_KEY = 'todo-mini.tasks';
  const OLD_FILTER_KEY = 'todo-mini.filter';

  function emptyState() {
    return { version: 1, tasks: [], filter: 'all', draft: '' };
  }

  // Оставляем только задачи правильного вида и известные поля
  function normalize(data) {
    const state = emptyState();
    if (!data || typeof data !== 'object') return state;

    if (Array.isArray(data.tasks)) {
      state.tasks = data.tasks
        .filter(t => t && typeof t.id === 'string' && typeof t.text === 'string')
        .map(t => ({
          id: t.id,
          text: t.text,
          done: Boolean(t.done),
          createdAt: Number(t.createdAt) || Date.now(),
        }));
    }
    if (typeof data.filter === 'string') state.filter = data.filter;
    if (typeof data.draft === 'string') state.draft = data.draft;
    return state;
  }

  // Перенос задач из старых ключей, чтобы после обновления ничего не пропало
  function migrateOld() {
    const oldTasks = localStorage.getItem(OLD_TASKS_KEY);
    if (oldTasks === null) return null;

    const state = normalize({
      tasks: JSON.parse(oldTasks),
      filter: localStorage.getItem(OLD_FILTER_KEY),
    });
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.removeItem(OLD_TASKS_KEY);
    localStorage.removeItem(OLD_FILTER_KEY);
    return state;
  }

  // Возвращает { state, problem }:
  //   problem = null          — всё прочитано;
  //   problem = 'corrupted'   — данные повреждены, их копия сохранена в BACKUP_KEY;
  //   problem = 'unavailable' — localStorage недоступен (запрещён в браузере).
  function load() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      return { state: emptyState(), problem: 'unavailable' };
    }

    try {
      if (raw === null) return { state: migrateOld() || emptyState(), problem: null };
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
        throw new Error('Неверная структура данных');
      }
      return { state: normalize(data), problem: null };
    } catch {
      // Раньше повреждённые данные молча заменялись пустым списком и тут же
      // затирались. Теперь сначала сохраняем их копию, чтобы ничего не потерять.
      backup(raw ?? localStorage.getItem(OLD_TASKS_KEY));
      return { state: emptyState(), problem: 'corrupted' };
    }
  }

  function backup(raw) {
    try {
      if (raw !== null) localStorage.setItem(BACKUP_KEY, raw);
    } catch {
      // Копию сохранить не удалось — пользователь всё равно увидит сообщение
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  return { KEY, BACKUP_KEY, load, save };
})();
