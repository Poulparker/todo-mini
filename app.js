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

const form = document.getElementById('task-form');
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
const initialState = TaskStore.load();
applyState(initialState);
input.value = initialState.draft;

function applyState(state) {
  tasks = state.tasks;
  filter = Object.hasOwn(FILTERS, state.filter) ? state.filter : 'all';
}

// Сохраняем всё состояние целиком: задачи, фильтр и текст в поле ввода
function persist() {
  TaskStore.save({ version: 1, tasks, filter, draft: input.value });
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
  const text = input.value.trim();
  if (!text) {
    formError.hidden = false;
    input.focus();
    return;
  }
  formError.hidden = true;
  // Новая задача активная: на фильтре «Выполненные» она бы не появилась,
  // и казалось бы, что добавление не сработало. Поэтому показываем все задачи.
  if (filter === 'done') filter = 'all';
  input.value = '';
  addTask(text);
  input.focus();
});

// Черновик: текст в поле сохраняется сразу, даже если не нажать «Добавить»
input.addEventListener('input', () => {
  formError.hidden = true;
  persist();
});

clearDoneBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  persist();
  render();
});

// Изменения, сделанные в другой вкладке, сразу появляются и здесь
window.addEventListener('storage', event => {
  if (event.key !== TaskStore.KEY) return;
  applyState(TaskStore.load());
  render();
});

render();
