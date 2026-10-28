'use strict';

const STORAGE_KEY = 'todo-mini.tasks';
const FILTER_KEY = 'todo-mini.filter';

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

let tasks = loadTasks();
let filter = loadFilter();

function loadFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    return Object.hasOwn(FILTERS, saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}

function setFilter(name) {
  filter = name;
  try {
    localStorage.setItem(FILTER_KEY, name);
  } catch {
    // Фильтр просто не запомнится — это не критично
  }
  render();
}

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    // Повреждённые данные или недоступное хранилище — начинаем с пустого списка
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.warn('Не удалось сохранить задачи в localStorage');
  }
}

// Date.now() мог дать одинаковый id при двух добавлениях в одну миллисекунду,
// поэтому добавлен случайный суффикс
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addTask(text) {
  tasks.push({ id: makeId(), text, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
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
  if (filter === 'done') setFilter('all');
  addTask(text);
  input.value = '';
  input.focus();
});

input.addEventListener('input', () => { formError.hidden = true; });

clearDoneBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
});

render();
