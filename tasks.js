'use strict';

// Логика списка задач без работы со страницей: фильтры, поиск, подсчёт,
// проверка ввода. Функции получают данные и возвращают результат —
// они не трогают DOM и localStorage, поэтому их легко проверить отдельно.
const TaskLogic = (() => {
  const MAX_LENGTH = 200;

  // Какие задачи показывать при каждом фильтре
  const FILTERS = {
    all: () => true,
    active: task => !task.done,
    done: task => task.done,
  };

  const FILTER_LABELS = { all: 'Все', active: 'Активные', done: 'Выполненные' };

  // Что писать, когда при выбранном фильтре список пуст
  const EMPTY_TEXT = {
    all: 'Задач пока нет — добавьте первую.',
    active: 'Активных задач нет — всё сделано!',
    done: 'Выполненных задач пока нет.',
  };

  // Пробелы по краям убираем, несколько пробелов подряд схлопываем
  function cleanText(text) {
    return text.trim().replace(/\s+/g, ' ');
  }

  // Для сравнения: без лишних пробелов и без учёта регистра
  function normalize(text) {
    return cleanText(text).toLowerCase();
  }

  function isFilter(name) {
    return Object.hasOwn(FILTERS, name);
  }

  function matchesQuery(task, query) {
    const q = normalize(query);
    return !q || normalize(task.text).includes(q);
  }

  // Задачи, которые видны при выбранном фильтре и поисковом запросе
  function visibleTasks(tasks, filter, query) {
    return tasks.filter(task => FILTERS[filter](task) && matchesQuery(task, query));
  }

  function countTasks(tasks) {
    const done = tasks.filter(task => task.done).length;
    return { all: tasks.length, active: tasks.length - done, done };
  }

  function emptyText(tasks, filter, query) {
    if (tasks.length === 0) return EMPTY_TEXT.all;
    if (normalize(query)) return `Ничего не найдено по запросу «${cleanText(query)}».`;
    return EMPTY_TEXT[filter];
  }

  // Проверка ввода: возвращает текст ошибки или null, если всё в порядке.
  // text уже очищен через cleanText.
  function validateTaskText(text, tasks) {
    if (!text) return 'Введите текст задачи.';
    if (text.length > MAX_LENGTH) {
      return `Слишком длинная задача: ${text.length} символов, можно не больше ${MAX_LENGTH}.`;
    }
    const same = tasks.find(task => normalize(task.text) === normalize(text));
    if (same) {
      return same.done
        ? `Задача «${same.text}» уже есть в списке и отмечена выполненной.`
        : `Задача «${same.text}» уже есть в списке.`;
    }
    return null;
  }

  // Делит текст на куски для подсветки: [{ text, match }]
  function splitByQuery(text, query) {
    const q = normalize(query);
    const lower = text.toLowerCase();
    if (!q || lower.length !== text.length) return [{ text, match: false }];

    const parts = [];
    let from = 0;
    let index = lower.indexOf(q);
    while (index !== -1) {
      if (index > from) parts.push({ text: text.slice(from, index), match: false });
      parts.push({ text: text.slice(index, index + q.length), match: true });
      from = index + q.length;
      index = lower.indexOf(q, from);
    }
    if (from < text.length) parts.push({ text: text.slice(from), match: false });
    return parts;
  }

  return {
    FILTER_LABELS,
    cleanText,
    isFilter,
    matchesQuery,
    visibleTasks,
    countTasks,
    emptyText,
    validateTaskText,
    splitByQuery,
  };
})();
