const storageKey = "summer-command-center-v2";
const oldStorageKey = "summer-command-center-v1";
const kids = [
  { id: "kade", name: "Kade", color: "green" },
  { id: "jayce", name: "Jayce", color: "blue" },
  { id: "kailah", name: "Kailah", color: "coral" }
];

const sharedDailyTasks = [
  "Make bed",
  "Clean up bathroom",
  "Make sure room is clean"
];

let state = loadState();
let midnightTimer;

const todayLabel = document.querySelector("#todayLabel");
const resetDay = document.querySelector("#resetDay");
const scoreText = document.querySelector("#scoreText");
const scoreBar = document.querySelector("#scoreBar");
const taskDone = document.querySelector("#taskDone");
const taskTotal = document.querySelector("#taskTotal");
const rotationKid = document.querySelector("#rotationKid");
const weekdayBadge = document.querySelector("#weekdayBadge");
const rotationList = document.querySelector("#rotationList");
const profileTabs = document.querySelector("#profileTabs");
const profiles = document.querySelector("#profiles");

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      return freshState();
    }
  }

  localStorage.removeItem(oldStorageKey);
  return freshState();
}

function freshState() {
  return {
    dateKey: getDateKey(),
    activeKidId: kids[0].id,
    days: {}
  };
}

function normalizeState(nextState) {
  return {
    dateKey: nextState.dateKey || getDateKey(),
    activeKidId: kids.some((kid) => kid.id === nextState.activeKidId) ? nextState.activeKidId : kids[0].id,
    days: nextState.days || {}
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function todayState() {
  const key = getDateKey();
  if (state.dateKey !== key) {
    state.dateKey = key;
  }
  if (!state.days[key]) {
    state.days[key] = {
      completed: {},
      enrichment: {},
      customTasks: []
    };
  }
  return state.days[key];
}

function render() {
  const day = todayState();
  const date = new Date();
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);

  todayLabel.textContent = today;
  weekdayBadge.textContent = isTuesday(date) ? "Tuesday chores included" : "daily";

  renderTabs();
  renderRotations(date);
  renderProfiles(day, date);
  renderScore(day, date);
  scheduleMidnightReset();
  saveState();
}

function renderTabs() {
  profileTabs.innerHTML = "";
  kids.forEach((kid) => {
    const button = document.createElement("button");
    button.className = `profile-tab ${kid.id === state.activeKidId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="kid-avatar ${kid.color}">${escapeHtml(kid.name[0])}</span>
      <span>${escapeHtml(kid.name)}</span>
    `;
    button.addEventListener("click", () => {
      state.activeKidId = kid.id;
      render();
    });
    profileTabs.append(button);
  });
}

function renderRotations(date) {
  const animalKid = dailyRotationKid(date, 0);
  const dishwasherKid = dailyRotationKid(date, 1);
  const trashcanKid = weeklyRotationKid(date);
  rotationKid.textContent = animalKid.name;

  const rows = [
    { label: "Feed cat and dogs", kid: animalKid.name, detail: "breakfast and dinner" },
    { label: "Dishwasher", kid: dishwasherKid.name, detail: "empty and fill" }
  ];

  if (isTuesday(date)) {
    rows.push({ label: "Brown trashcans", kid: trashcanKid.name, detail: "take down today" });
  }

  rotationList.innerHTML = "";
  rows.forEach((row) => {
    const node = document.createElement("div");
    node.className = "rotation-row";
    node.innerHTML = `
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.detail)}</span>
      </div>
      <b>${escapeHtml(row.kid)}</b>
    `;
    rotationList.append(node);
  });
}

function renderProfiles(day, date) {
  profiles.innerHTML = "";
  kids.forEach((kid) => {
    const allTasks = tasksForKid(kid, day, date);
    const completed = allTasks.filter((task) => isDone(day, task.id)).length;
    const visibleClass = kid.id === state.activeKidId ? "active" : "";
    const card = document.createElement("article");
    card.className = `profile-card ${visibleClass}`;
    card.innerHTML = `
      <div class="profile-heading">
        <div>
          <span class="kid-avatar large ${kid.color}">${escapeHtml(kid.name[0])}</span>
          <h2>${escapeHtml(kid.name)}</h2>
        </div>
        <span>${completed}/${allTasks.length} done</span>
      </div>
      <form class="enrichment-form" data-kid-id="${kid.id}">
        <label>
          Enrichment plan
          <textarea maxlength="180" placeholder="What are you planning to do for enrichment today?">${escapeHtml(day.enrichment[kid.id] || "")}</textarea>
        </label>
        <button class="primary" type="submit">${day.enrichment[kid.id] ? "Update plan" : "Submit plan"}</button>
      </form>
      <div class="section-heading">
        <h3>Today's tasks</h3>
        <button class="text-button add-task-button" type="button" data-kid-id="${kid.id}">Add task</button>
      </div>
      <form class="quick-add" data-kid-id="${kid.id}" hidden>
        <input maxlength="60" placeholder="Add a task that came up today" />
        <button type="submit">Add</button>
      </form>
      <div class="task-list"></div>
    `;

    const list = card.querySelector(".task-list");
    allTasks.forEach((task) => list.append(taskNode(task, day)));
    card.querySelector(".enrichment-form").addEventListener("submit", saveEnrichment);
    card.querySelector(".add-task-button").addEventListener("click", toggleQuickAdd);
    card.querySelector(".quick-add").addEventListener("submit", saveCustomTask);
    profiles.append(card);
  });
}

function tasksForKid(kid, day, date) {
  const tasks = sharedDailyTasks.map((title) => ({
    id: `daily-${state.dateKey}-${kid.id}-${slug(title)}`,
    kidId: kid.id,
    title,
    detail: "Every day",
    locked: true
  }));

  if (day.enrichment[kid.id]) {
    tasks.push({
      id: `enrichment-${state.dateKey}-${kid.id}`,
      kidId: kid.id,
      title: `Enrichment: ${day.enrichment[kid.id]}`,
      detail: "Submitted plan",
      locked: true
    });
  }

  const animalKid = dailyRotationKid(date, 0);
  if (animalKid.id === kid.id) {
    tasks.push(
      {
        id: `animals-breakfast-${state.dateKey}`,
        kidId: kid.id,
        title: "Feed cat and dogs breakfast",
        detail: "Rotating daily",
        locked: true
      },
      {
        id: `animals-dinner-${state.dateKey}`,
        kidId: kid.id,
        title: "Feed cat and dogs dinner",
        detail: "Rotating daily",
        locked: true
      }
    );
  }

  const dishwasherKid = dailyRotationKid(date, 1);
  if (dishwasherKid.id === kid.id) {
    tasks.push({
      id: `dishwasher-${state.dateKey}`,
      kidId: kid.id,
      title: "Empty and fill dishwasher",
      detail: "Rotating daily",
      locked: true
    });
  }

  if (isTuesday(date)) {
    tasks.push({
      id: `tuesday-trash-${state.dateKey}-${kid.id}`,
      kidId: kid.id,
      title: "Empty bathroom and loft trash",
      detail: "Every Tuesday",
      locked: true
    });

    const trashcanKid = weeklyRotationKid(date);
    if (trashcanKid.id === kid.id) {
      tasks.push({
        id: `brown-trashcans-${state.dateKey}`,
        kidId: kid.id,
        title: "Take down the brown trashcans",
        detail: "Tuesday rotation",
        locked: true
      });
    }
  }

  return tasks.concat(day.customTasks.filter((task) => task.kidId === kid.id));
}

function taskNode(task, day) {
  const node = document.createElement("div");
  node.className = `task ${isDone(day, task.id) ? "done" : ""}`;
  node.innerHTML = `
    <button class="check" type="button" aria-label="Toggle ${escapeHtml(task.title)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"></path></svg>
    </button>
    <div>
      <strong>${escapeHtml(task.title)}</strong>
      <span>${escapeHtml(task.detail || "Added today")}</span>
    </div>
    ${task.locked ? '<span class="lock">daily</span>' : deleteButton(task)}
  `;
  node.querySelector(".check").addEventListener("click", () => toggleTask(task.id));
  const deleteControl = node.querySelector(".delete");
  if (deleteControl) deleteControl.addEventListener("click", () => deleteCustomTask(task.id));
  return node;
}

function deleteButton(task) {
  return `
    <button class="delete" type="button" aria-label="Delete ${escapeHtml(task.title)}" title="Delete">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
    </button>
  `;
}

function renderScore(day, date) {
  const allTasks = kids.flatMap((kid) => tasksForKid(kid, day, date));
  const done = allTasks.filter((task) => isDone(day, task.id)).length;
  const score = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;

  scoreText.textContent = `${score}%`;
  scoreBar.style.width = `${score}%`;
  taskDone.textContent = done;
  taskTotal.textContent = allTasks.length;
}

function saveEnrichment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const kidId = form.dataset.kidId;
  const textarea = form.querySelector("textarea");
  const plan = textarea.value.trim();
  const day = todayState();
  if (!plan) return;
  day.enrichment[kidId] = plan;
  render();
}

function toggleQuickAdd(event) {
  const kidId = event.currentTarget.dataset.kidId;
  const form = document.querySelector(`.quick-add[data-kid-id="${kidId}"]`);
  form.hidden = !form.hidden;
  if (!form.hidden) form.querySelector("input").focus();
}

function saveCustomTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("input");
  const title = input.value.trim();
  if (!title) return;

  todayState().customTasks.push({
    id: `custom-${state.dateKey}-${crypto.randomUUID()}`,
    kidId: form.dataset.kidId,
    title,
    detail: "Added today",
    locked: false
  });
  input.value = "";
  form.hidden = true;
  render();
}

function toggleTask(taskId) {
  const day = todayState();
  day.completed[taskId] = !day.completed[taskId];
  render();
}

function deleteCustomTask(taskId) {
  const day = todayState();
  day.customTasks = day.customTasks.filter((task) => task.id !== taskId);
  delete day.completed[taskId];
  render();
}

function resetToday() {
  state.days[getDateKey()] = {
    completed: {},
    enrichment: {},
    customTasks: []
  };
  render();
}

function scheduleMidnightReset() {
  clearTimeout(midnightTimer);
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 1, 0);
  midnightTimer = setTimeout(render, midnight.getTime() - now.getTime());
}

function isDone(day, taskId) {
  return Boolean(day.completed[taskId]);
}

function dailyRotationKid(date, offset) {
  const index = (daysSinceAnchor(date) + offset) % kids.length;
  return kids[index];
}

function weeklyRotationKid(date) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const anchorTuesday = new Date(2026, 4, 26);
  const start = startOfDay(date).getTime();
  const index = Math.floor((start - anchorTuesday.getTime()) / oneWeek) % kids.length;
  return kids[((index % kids.length) + kids.length) % kids.length];
}

function daysSinceAnchor(date) {
  const oneDay = 24 * 60 * 60 * 1000;
  const anchor = new Date(2026, 4, 29);
  return Math.floor((startOfDay(date).getTime() - anchor.getTime()) / oneDay);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTuesday(date) {
  return date.getDay() === 2;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

resetDay.addEventListener("click", resetToday);
render();
