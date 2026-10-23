const STORAGE_KEY = "todoTabState";
const THEME_KEY = "todoTabTheme";
const LISTS = ["today", "later", "deadlines"];
const LIST_MIGRATIONS = { thisWeek: "later", nextWeek: "deadlines" };

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀" : "🌙";
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderClock() {
  const now = new Date();
  document.getElementById("clock-date").textContent = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(",", "");
  document.getElementById("clock-time").textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Days between today and a "YYYY-MM-DD" due date (negative = overdue).
function daysRemaining(dueDate) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function dueLabel(diff) {
  if (diff < 0) return "Overdue";
  return `${diff}d remaining`;
}

function dueUrgency(diff) {
  if (diff <= 1) return "due-red";
  if (diff < 7) return "due-amber";
  return "due-green";
}

function formatDueDate(dueDate) {
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  parsed.tasks.forEach((task) => {
    if (LIST_MIGRATIONS[task.list]) task.list = LIST_MIGRATIONS[task.list];
  });
  return parsed;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = { tasks: [] };

function wireCommonTaskNode(node, task) {
  const checkbox = node.querySelector(".task-done");
  if (checkbox) checkbox.checked = task.done;

  const text = node.querySelector(".task-text");
  text.textContent = task.text;

  text.addEventListener("click", (e) => {
    if (text.isContentEditable) return;
    e.stopPropagation();
    node.draggable = false;
    text.contentEditable = "true";
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      text.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      text.textContent = task.text;
      text.blur();
    }
  });

  text.addEventListener("blur", () => {
    node.draggable = true;
    text.contentEditable = "false";
    const newText = text.textContent.trim();
    if (newText && newText !== task.text) {
      editTaskText(task.id, newText);
    } else if (!newText && !task.text) {
      deleteTask(task.id);
    } else {
      text.textContent = task.text;
    }
  });
}

function renderTaskNode(task) {
  const template = document.getElementById("task-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;

  wireCommonTaskNode(node, task);

  const dueLabelEl = node.querySelector(".task-due-label");
  dueLabelEl.className = "task-due-label";
  if (task.dueDate) {
    const diff = daysRemaining(task.dueDate);
    dueLabelEl.textContent = dueLabel(diff);
    dueLabelEl.classList.add(dueUrgency(diff));
  } else {
    dueLabelEl.textContent = "";
  }

  const dueInput = node.querySelector(".task-due-input");
  dueInput.value = task.dueDate || "";

  const dueDisplay = node.querySelector(".task-due-display");
  dueDisplay.textContent = task.dueDate ? formatDueDate(task.dueDate) : "";

  const dueWrap = node.querySelector(".task-due-wrap");
  dueWrap.addEventListener("click", () => {
    if (typeof dueInput.showPicker === "function") dueInput.showPicker();
  });

  return node;
}

function deadlineCaption(diff) {
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  return "Days left";
}

function renderDeadlineNode(task) {
  const template = document.getElementById("deadline-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;

  wireCommonTaskNode(node, task);

  const caption = node.querySelector(".deadline-caption");
  const windowEl = node.querySelector(".deadline-window");
  const days = node.querySelector(".deadline-days");
  windowEl.classList.remove("due-red", "due-amber", "due-green");

  if (task.dueDate) {
    const diff = daysRemaining(task.dueDate);
    caption.textContent = deadlineCaption(diff);
    days.textContent = String(Math.abs(diff));
    windowEl.classList.add(dueUrgency(diff));
  } else {
    caption.textContent = "No date";
    days.textContent = "–";
  }

  const dueInput = node.querySelector(".task-due-input");
  dueInput.value = task.dueDate || "";

  const windowWrap = node.querySelector(".deadline-window-wrap");
  windowWrap.addEventListener("click", () => {
    if (typeof dueInput.showPicker === "function") dueInput.showPicker();
  });

  return node;
}

// Tasks with no due date sort to the end of the deadlines list.
function deadlineSortValue(task) {
  return task.dueDate ? daysRemaining(task.dueDate) : Infinity;
}

function render() {
  LISTS.forEach((listName) => {
    const ul = document.querySelector(`.task-list[data-list="${listName}"]`);
    ul.innerHTML = "";

    const tasks = state.tasks.filter((task) => task.list === listName);

    if (listName === "deadlines") {
      tasks
        .sort((a, b) => a.done - b.done || deadlineSortValue(a) - deadlineSortValue(b))
        .forEach((task) => ul.appendChild(renderDeadlineNode(task)));
    } else {
      tasks.sort((a, b) => a.done - b.done).forEach((task) => ul.appendChild(renderTaskNode(task)));
    }
  });
}

function mutate(fn) {
  fn(state);
  saveState(state);
  render();
}

function addEmptyTask(listName) {
  const id = crypto.randomUUID();
  mutate((s) => {
    s.tasks.push({ id, text: "", list: listName, done: false });
  });
  const text = document.querySelector(`[data-id="${id}"] .task-text`);
  if (text) text.click();
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

function reorderTasks(listName, orderedIds) {
  mutate((s) => {
    const idToTask = new Map(s.tasks.map((t) => [t.id, t]));
    orderedIds.forEach((id) => {
      const task = idToTask.get(id);
      if (task) task.list = listName;
    });
    const inOrder = orderedIds.map((id) => idToTask.get(id)).filter(Boolean);
    let i = 0;
    s.tasks = s.tasks.map((t) => (orderedIds.includes(t.id) ? inOrder[i++] : t));
  });
}

function editTaskText(id, text) {
  mutate((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (task) task.text = text;
  });
}

function setDueDate(id, dueDate) {
  mutate((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (!task) return;
    if (dueDate) task.dueDate = dueDate;
    else delete task.dueDate;
  });
}

function wireAddButtons() {
  document.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addEmptyTask(btn.dataset.list));
  });
}

function getDragAfterElement(list, y) {
  const elements = [...list.querySelectorAll(".task:not(.dragging)")];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
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

  board.addEventListener("change", (e) => {
    const li = e.target.closest(".task");
    if (!li) return;

    if (e.target.classList.contains("task-due-input")) {
      setDueDate(li.dataset.id, e.target.value);
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
    const list = column.querySelector(".task-list");

    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");

      const dragging = document.querySelector(".task.dragging");
      if (!dragging) return;
      const afterElement = getDragAfterElement(list, e.clientY);
      if (afterElement == null) {
        list.appendChild(dragging);
      } else {
        list.insertBefore(dragging, afterElement);
      }
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");
      const orderedIds = [...list.querySelectorAll(".task")].map((li) => li.dataset.id);
      reorderTasks(column.dataset.list, orderedIds);
    });
  });
}

function init() {
  applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  renderClock();
  setInterval(renderClock, 1000);

  const stored = loadState();
  state = stored || { tasks: [] };
  saveState(state);
  render();
  wireAddButtons();
  wireBoardEvents();
}

init();
