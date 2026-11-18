'use strict';

// Интерфейс задачника. Логика списка — в tasks.js, хранение — в storage.js.

// Сообщения о проблемах с хранилищем
const STORAGE_MESSAGES = {
  corrupted: 'Сохранённые данные повреждены и не читаются, поэтому список начат заново. ' +
    `Копия старых данных лежит в localStorage под ключом ${TaskStore.BACKUP_KEY}.`,
  unavailable: 'Хранилище браузера недоступно (например, запрещены cookie и данные сайтов). ' +
    'Задачи будут работать, но пропадут после закрытия вкладки.',
  saveFailed: 'Не удалось сохранить изменения: хранилище браузера недоступно или переполнено. ' +
    'Они пропадут после закрытия вкладки.',
};

const form = document.getElementById('task-form');
const storageAlert = document.getElementById('storage-alert');
const storageAlertText = document.getElementById('storage-alert-text');
const input = document.getElementById('task-input');
const formError = document.getElementById('form-error');
const list = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const counter = document.getElementById('counter');
const clearDoneBtn = document.getElementById('clear-done');
const filterButtons = document.querySelectorAll('[data-filter]');
const searchInput = document.getElementById('search-input');

// Состояние восстанавливается из localStorage (см. storage.js)
let tasks = [];
let filter = 'all';
// Поисковый запрос не сохраняется: после перезапуска показываются все задачи
let query = '';
const initial = TaskStore.load();
applyState(initial.state);
input.value = initial.state.draft;
if (initial.problem) showStorageAlert(STORAGE_MESSAGES[initial.problem]);

function applyState(state) {
  tasks = state.tasks;
  filter = TaskLogic.isFilter(state.filter) ? state.filter : 'all';
}

// Сохраняем всё состояние целиком: задачи, фильтр и текст в поле ввода
function persist() {
  const ok = TaskStore.save({ version: 1, tasks, filter, draft: input.value });
  if (!ok) showStorageAlert(STORAGE_MESSAGES.saveFailed);
}

// После любого изменения задач или фильтра: сохранить и перерисовать
function update() {
  persist();
  render();
}

function showStorageAlert(message) {
  storageAlertText.textContent = message;
  storageAlert.hidden = false;
}

function showInputError(message) {
  formError.textContent = message;
  formError.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.focus();
}

function clearInputError() {
  formError.hidden = true;
  input.removeAttribute('aria-invalid');
}

// Date.now() мог дать одинаковый id при двух добавлениях в одну миллисекунду,
// поэтому добавлен случайный суффикс
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function setFilter(name) {
  filter = name;
  update();
}

function addTask(text) {
  tasks.push({ id: makeId(), text, done: false, createdAt: Date.now() });
  update();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  update();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  update();
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  update();
}

// Одна строка списка. Текст вставляется текстовыми узлами, а не innerHTML,
// поэтому HTML из задачи не выполнится; найденные фрагменты — в <mark>.
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task' + (task.done ? ' task--done' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Отметить выполненной');
  checkbox.addEventListener('change', () => toggleTask(task.id));

  const text = document.createElement('span');
  text.className = 'task__text';
  for (const part of TaskLogic.splitByQuery(task.text, query)) {
    if (part.match) {
      const mark = document.createElement('mark');
      mark.textContent = part.text;
      text.append(mark);
    } else {
      text.append(part.text);
    }
  }

  const del = document.createElement('button');
  del.className = 'task__delete';
  del.type = 'button';
  del.title = 'Удалить';
  del.textContent = '×';
  del.addEventListener('click', () => deleteTask(task.id));

  li.append(checkbox, text, del);
  return li;
}

function renderFilters(counts) {
  for (const button of filterButtons) {
    const name = button.dataset.filter;
    button.textContent = `${TaskLogic.FILTER_LABELS[name]} (${counts[name]})`;
    button.classList.toggle('filters__button--active', name === filter);
    button.setAttribute('aria-pressed', name === filter);
  }
}

function render() {
  const visible = TaskLogic.visibleTasks(tasks, filter, query);
  list.replaceChildren(...visible.map(createTaskElement));

  const counts = TaskLogic.countTasks(tasks);
  counter.textContent = `${counts.done} из ${counts.all} выполнено`;
  emptyState.textContent = TaskLogic.emptyText(tasks, filter, query);
  emptyState.hidden = visible.length > 0;
  clearDoneBtn.disabled = counts.done === 0;
  renderFilters(counts);
}

for (const button of filterButtons) {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = TaskLogic.cleanText(input.value);
  const error = TaskLogic.validateTaskText(text, tasks);
  if (error) {
    // Текст остаётся в поле, чтобы его можно было исправить
    showInputError(error);
    return;
  }
  clearInputError();
  // Новая задача активная: на фильтре «Выполненные» она бы не появилась,
  // и казалось бы, что добавление не сработало. Поэтому показываем все задачи.
  if (filter === 'done') filter = 'all';
  // То же с поиском: если новая задача не подходит под запрос, сбрасываем поиск
  if (!TaskLogic.matchesQuery({ text }, query)) {
    query = '';
    searchInput.value = '';
  }
  input.value = '';
  addTask(text);
  input.focus();
});

// Черновик: текст в поле сохраняется сразу, даже если не нажать «Добавить»
input.addEventListener('input', () => {
  clearInputError();
  persist();
});

searchInput.addEventListener('input', () => {
  query = searchInput.value;
  render();
});

document.getElementById('storage-alert-close').addEventListener('click', () => {
  storageAlert.hidden = true;
});

clearDoneBtn.addEventListener('click', clearDone);

// Изменения, сделанные в другой вкладке, сразу появляются и здесь
window.addEventListener('storage', event => {
  if (event.key !== TaskStore.KEY) return;
  const { state, problem } = TaskStore.load();
  applyState(state);
  if (problem) showStorageAlert(STORAGE_MESSAGES[problem]);
  render();
});

render();
