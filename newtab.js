const STORAGE_KEY = "todoTabState";
const LISTS = ["today", "thisWeek", "nextWeek"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  return dateKey(new Date());
}

// Monday-start week, identified by that Monday's date key.
function weekStartKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return dateKey(d);
}

function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

function saveState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve);
  });
}

function applyRollover(state) {
  const currentDateKey = todayKey();
  const currentWeekKey = weekStartKey();

  if (!state.meta) {
    state.meta = { lastOpenedDate: currentDateKey, weekStartKey: currentWeekKey };
    return state;
  }

  const dayChanged = state.meta.lastOpenedDate !== currentDateKey;
  const weekChanged = state.meta.weekStartKey !== currentWeekKey;

  if (dayChanged) {
    state.tasks.forEach((task) => {
      if (task.list === "today") task.list = "thisWeek";
    });
  }

  if (weekChanged) {
    state.tasks.forEach((task) => {
      if (task.list === "thisWeek") task.list = "nextWeek";
    });
  }

  state.meta.lastOpenedDate = currentDateKey;
  state.meta.weekStartKey = currentWeekKey;

  return state;
}

let state = { tasks: [], meta: null };

function render() {
  const template = document.getElementById("task-template");

  LISTS.forEach((listName) => {
    const ul = document.querySelector(`.task-list[data-list="${listName}"]`);
    ul.innerHTML = "";

    state.tasks
      .filter((task) => task.list === listName)
      .forEach((task) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.dataset.id = task.id;

        const checkbox = node.querySelector(".task-done");
        checkbox.checked = task.done;

        const text = node.querySelector(".task-text");
        text.textContent = task.text;

        ul.appendChild(node);
      });
  });
}

async function mutate(fn) {
  fn(state);
  await saveState(state);
  render();
}

function addTask(listName, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  mutate((s) => {
    s.tasks.push({
      id: crypto.randomUUID(),
      text: trimmed,
      list: listName,
      done: false,
    });
  });
}

function toggleTask(id) {
  mutate((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (task) task.done = !task.done;
  });
}

function deleteTask(id) {
  mutate((s) => {
    s.tasks = s.tasks.filter((t) => t.id !== id);
  });
}

function moveTask(id, listName) {
  mutate((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (task) task.list = listName;
  });
}

function wireAddForms() {
  document.querySelectorAll(".add-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      addTask(form.dataset.list, input.value);
      input.value = "";
    });
  });
}

function wireBoardEvents() {
  const board = document.querySelector(".board");

  board.addEventListener("click", (e) => {
    const li = e.target.closest(".task");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task-delete")) {
      deleteTask(id);
    } else if (e.target.classList.contains("task-done")) {
      toggleTask(id);
    }
  });

  board.addEventListener("dragstart", (e) => {
    const li = e.target.closest(".task");
    if (!li) return;
    e.dataTransfer.setData("text/plain", li.dataset.id);
    e.dataTransfer.effectAllowed = "move";
    li.classList.add("dragging");
  });

  board.addEventListener("dragend", (e) => {
    const li = e.target.closest(".task");
    if (li) li.classList.remove("dragging");
  });

  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      if (id) moveTask(id, column.dataset.list);
    });
  });
}

async function init() {
  const stored = await loadState();
  state = stored || { tasks: [], meta: null };
  applyRollover(state);
  await saveState(state);
  render();
  wireAddForms();
  wireBoardEvents();
}

init();
