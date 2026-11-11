'use strict';

// Какие задачи показывать при каждом фильтре
const FILTERS = {
  all: () => true,
  active: task => !task.done,
  done: task => task.done,
};

// Что писать, когда при выбранном фильтре список пуст
const EMPTY_TEXT = {
  all: 'Задач пока нет — добавьте первую.',
  active: 'Активных задач нет — всё сделано!',
  done: 'Выполненных задач пока нет.',
};

const MAX_LENGTH = 200;

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

// Состояние восстанавливается из localStorage (см. storage.js)
let tasks = [];
let filter = 'all';
const initial = TaskStore.load();
applyState(initial.state);
input.value = initial.state.draft;
if (initial.problem) showStorageAlert(STORAGE_MESSAGES[initial.problem]);

function applyState(state) {
  tasks = state.tasks;
  filter = Object.hasOwn(FILTERS, state.filter) ? state.filter : 'all';
}

// Сохраняем всё состояние целиком: задачи, фильтр и текст в поле ввода
function persist() {
  const ok = TaskStore.save({ version: 1, tasks, filter, draft: input.value });
  if (!ok) showStorageAlert(STORAGE_MESSAGES.saveFailed);
}

function showStorageAlert(message) {
  storageAlertText.textContent = message;
  storageAlert.hidden = false;
}

// Пробелы по краям убираем, несколько пробелов подряд схлопываем
function cleanText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

// Проверка ввода: возвращает текст ошибки или null, если всё в порядке
function validateTaskText(text) {
  if (!text) return 'Введите текст задачи.';
  if (text.length > MAX_LENGTH) {
    return `Слишком длинная задача: ${text.length} символов, можно не больше ${MAX_LENGTH}.`;
  }
  const same = tasks.find(t => cleanText(t.text).toLowerCase() === text.toLowerCase());
  if (same) {
    return same.done
      ? `Задача «${same.text}» уже есть в списке и отмечена выполненной.`
      : `Задача «${same.text}» уже есть в списке.`;
  }
  return null;
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

function setFilter(name) {
  filter = name;
  persist();
  render();
}

// Date.now() мог дать одинаковый id при двух добавлениях в одну миллисекунду,
// поэтому добавлен случайный суффикс
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addTask(text) {
  tasks.push({ id: makeId(), text, done: false, createdAt: Date.now() });
  persist();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  persist();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  persist();
  render();
}

function render() {
  list.innerHTML = '';
  const visible = tasks.filter(FILTERS[filter]);

  for (const task of visible) {
    const li = document.createElement('li');
    li.className = 'task' + (task.done ? ' task--done' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Отметить выполненной');
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const text = document.createElement('span');
    text.className = 'task__text';
    text.textContent = task.text; // textContent, а не innerHTML — защита от HTML-вставок

    const del = document.createElement('button');
    del.className = 'task__delete';
    del.type = 'button';
    del.title = 'Удалить';
    del.textContent = '×';
    del.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, text, del);
    list.append(li);
  }

  const done = tasks.filter(t => t.done).length;
  counter.textContent = `${done} из ${tasks.length} выполнено`;
  emptyState.textContent = tasks.length === 0 ? EMPTY_TEXT.all : EMPTY_TEXT[filter];
  emptyState.hidden = visible.length > 0;
  clearDoneBtn.disabled = done === 0;

  const counts = { all: tasks.length, active: tasks.length - done, done };
  const labels = { all: 'Все', active: 'Активные', done: 'Выполненные' };
  for (const button of filterButtons) {
    const name = button.dataset.filter;
    button.textContent = `${labels[name]} (${counts[name]})`;
    button.classList.toggle('filters__button--active', name === filter);
    button.setAttribute('aria-pressed', name === filter);
  }
}

for (const button of filterButtons) {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = cleanText(input.value);
  const error = validateTaskText(text);
  if (error) {
    // Текст остаётся в поле, чтобы его можно было исправить
    showInputError(error);
    return;
  }
  clearInputError();
  // Новая задача активная: на фильтре «Выполненные» она бы не появилась,
  // и казалось бы, что добавление не сработало. Поэтому показываем все задачи.
  if (filter === 'done') filter = 'all';
  input.value = '';
  addTask(text);
  input.focus();
});

// Черновик: текст в поле сохраняется сразу, даже если не нажать «Добавить»
input.addEventListener('input', () => {
  clearInputError();
  persist();
});

document.getElementById('storage-alert-close').addEventListener('click', () => {
  storageAlert.hidden = true;
});

clearDoneBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  persist();
  render();
});

// Изменения, сделанные в другой вкладке, сразу появляются и здесь
window.addEventListener('storage', event => {
  if (event.key !== TaskStore.KEY) return;
  const { state, problem } = TaskStore.load();
  applyState(state);
  if (problem) showStorageAlert(STORAGE_MESSAGES[problem]);
  render();
});

render();
