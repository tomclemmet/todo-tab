const STORAGE_KEY = "todoTabState";
const THEME_KEY = "todoTabTheme";
const LISTS = ["today", "thisWeek", "nextWeek"];

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
  return raw ? JSON.parse(raw) : null;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = { tasks: [] };

function render() {
  const template = document.getElementById("task-template");

  LISTS.forEach((listName) => {
    const ul = document.querySelector(`.task-list[data-list="${listName}"]`);
    ul.innerHTML = "";

    state.tasks
      .filter((task) => task.list === listName)
      .sort((a, b) => a.done - b.done)
      .forEach((task) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.dataset.id = task.id;

        const checkbox = node.querySelector(".task-done");
        checkbox.checked = task.done;

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
          } else {
            text.textContent = task.text;
          }
        });

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

        ul.appendChild(node);
      });
  });
}

function mutate(fn) {
  fn(state);
  saveState(state);
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

function isLikelyUrl(text) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/\s/.test(text)) return false;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(text);
}

function wireSearchForm() {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const trimmed = input.value.trim();
    if (!trimmed) return;

    if (isLikelyUrl(trimmed)) {
      window.location.href = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
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
  wireAddForms();
  wireBoardEvents();
  wireSearchForm();
}

init();
