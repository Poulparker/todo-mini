'use strict';

// Автотесты логики задачника (tasks.js) на встроенном node:test.
// Запуск из папки проекта: npm test  (или напрямую: node --test)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const TaskLogic = require('./tasks.js');

const tasks = [
  { id: '1', text: 'Купить продукты', done: false },
  { id: '2', text: 'Сделать практикум 5', done: true },
  { id: '3', text: 'Позвонить бабушке', done: false },
  { id: '4', text: 'Купить подарок маме', done: true },
];
const texts = list => list.map(task => task.text);

// 1. Основной случай: фильтр и поиск работают вместе, счётчики верные
test('основной случай: фильтр «Активные» + поиск «куп»', () => {
  assert.deepEqual(texts(TaskLogic.visibleTasks(tasks, 'active', 'куп')), ['Купить продукты']);
  assert.deepEqual(
    texts(TaskLogic.visibleTasks(tasks, 'all', '  КУП ')),
    ['Купить продукты', 'Купить подарок маме'],
  );
  assert.deepEqual(TaskLogic.countTasks(tasks), { all: 4, active: 2, done: 2 });
});

// 2. Граничный случай: ровно 200 символов — можно, 201 — уже нельзя
test('граничный случай: 200 символов можно, 201 — нельзя', () => {
  assert.equal(TaskLogic.validateTaskText('а'.repeat(200), tasks), null);
  assert.match(TaskLogic.validateTaskText('а'.repeat(201), tasks), /^Слишком длинная задача: 201 .*не больше 200\.$/);
});

// 3. Ошибочный случай: пустой ввод и повтор существующей задачи отклоняются
test('ошибочный случай: пустой ввод и повтор задачи', () => {
  assert.equal(TaskLogic.validateTaskText(TaskLogic.cleanText('   '), tasks), 'Введите текст задачи.');
  assert.equal(
    TaskLogic.validateTaskText(TaskLogic.cleanText('  купить   ПРОДУКТЫ '), tasks),
    'Задача «Купить продукты» уже есть в списке.',
  );
});

// 4. Подсветка: найденный кусок помечается, остальной текст не теряется
test('подсветка найденного текста', () => {
  assert.deepEqual(TaskLogic.splitByQuery('Купить продукты', 'куп'), [
    { text: 'Куп', match: true },
    { text: 'ить продукты', match: false },
  ]);
  assert.deepEqual(TaskLogic.splitByQuery('Купить продукты', ''), [
    { text: 'Купить продукты', match: false },
  ]);
});

// 5. Дефект: «ё» и «е» должны считаться одной буквой
test('дефект: поиск и проверка повтора не различают «ё» и «е»', () => {
  const list = [{ id: '5', text: 'Купить ёлку', done: false }];
  assert.equal(TaskLogic.matchesQuery(list[0], 'елку'), true, 'поиск «елку» должен найти «Купить ёлку»');
  assert.equal(
    TaskLogic.validateTaskText('Купить елку', list),
    'Задача «Купить ёлку» уже есть в списке.',
    '«Купить елку» — повтор задачи «Купить ёлку»',
  );
  assert.deepEqual(TaskLogic.splitByQuery('Купить ёлку', 'елк'), [
    { text: 'Купить ', match: false },
    { text: 'ёлк', match: true },
    { text: 'у', match: false },
  ]);
});
