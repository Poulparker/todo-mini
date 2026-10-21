'use strict';

const STORAGE_KEY = 'todo-mini.tasks';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const formError = document.getElementById('form-error');
const list = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const counter = document.getElementById('counter');
const clearDoneBtn = document.getElementById('clear-done');

let tasks = loadTasks();

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

  for (const task of tasks) {
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
  emptyState.hidden = tasks.length > 0;
  clearDoneBtn.disabled = done === 0;
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
