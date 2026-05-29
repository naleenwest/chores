const storageKey = "summer-command-center-v1";

const starter = {
  kids: [
    { id: crypto.randomUUID(), name: "Avery" },
    { id: crypto.randomUUID(), name: "Mia" }
  ],
  chores: [
    { id: crypto.randomUUID(), title: "Make bed", kidId: null, minutes: 5, done: false },
    { id: crypto.randomUUID(), title: "Clear breakfast dishes", kidId: null, minutes: 10, done: false },
    { id: crypto.randomUUID(), title: "Wipe bathroom sink", kidId: null, minutes: 10, done: false },
    { id: crypto.randomUUID(), title: "Put laundry away", kidId: null, minutes: 15, done: false },
    { id: crypto.randomUUID(), title: "Tidy living room", kidId: null, minutes: 15, done: false }
  ],
  balance: [
    { id: crypto.randomUUID(), title: "45 minutes outside", type: "outside", minutes: 20, done: false },
    { id: crypto.randomUUID(), title: "Read or workbook", type: "learning", minutes: 15, done: false },
    { id: crypto.randomUUID(), title: "Creative project", type: "creative", minutes: 10, done: false },
    { id: crypto.randomUUID(), title: "Screens after lunch only", type: "screens", minutes: 0, done: false }
  ],
  routine: [
    { id: crypto.randomUUID(), title: "Morning reset", detail: "Beds, breakfast dishes, get dressed", done: false },
    { id: crypto.randomUUID(), title: "House help block", detail: "One shared cleaning sprint", done: false },
    { id: crypto.randomUUID(), title: "Outside block", detail: "Fresh air before electronics", done: false },
    { id: crypto.randomUUID(), title: "Quiet recharge", detail: "Reading, puzzle, art, or rest", done: false },
    { id: crypto.randomUUID(), title: "Evening pickup", detail: "Reset rooms before tomorrow", done: false }
  ]
};

let state = loadState();

const todayLabel = document.querySelector("#todayLabel");
const kidCount = document.querySelector("#kidCount");
const kidForm = document.querySelector("#kidForm");
const kidName = document.querySelector("#kidName");
const kidList = document.querySelector("#kidList");
const addKid = document.querySelector("#addKid");
const resetDay = document.querySelector("#resetDay");
const addChore = document.querySelector("#addChore");
const choreList = document.querySelector("#choreList");
const balanceList = document.querySelector("#balanceList");
const routineList = document.querySelector("#routineList");
const scoreText = document.querySelector("#scoreText");
const scoreBar = document.querySelector("#scoreBar");
const choresDone = document.querySelector("#choresDone");
const outsideDone = document.querySelector("#outsideDone");
const screenBank = document.querySelector("#screenBank");
const taskDialog = document.querySelector("#taskDialog");
const taskForm = document.querySelector("#taskForm");
const taskName = document.querySelector("#taskName");
const taskKid = document.querySelector("#taskKid");
const taskMinutes = document.querySelector("#taskMinutes");
const closeDialog = document.querySelector("#closeDialog");
const cancelTask = document.querySelector("#cancelTask");

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return assignStarterChores(structuredClone(starter));

  try {
    return JSON.parse(saved);
  } catch {
    return assignStarterChores(structuredClone(starter));
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function assignStarterChores(nextState) {
  nextState.chores = nextState.chores.map((chore, index) => ({
    ...chore,
    kidId: nextState.kids[index % Math.max(nextState.kids.length, 1)]?.id ?? null
  }));
  return nextState;
}

function render() {
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
  todayLabel.textContent = today;

  kidCount.textContent = `${state.kids.length} ${state.kids.length === 1 ? "kid" : "kids"}`;
  renderKids();
  renderTasks();
  renderRoutine();
  renderScore();
  saveState();
}

function renderKids() {
  kidList.innerHTML = "";
  if (!state.kids.length) {
    kidList.append(emptyNode("Add each kid to start assigning chores."));
    return;
  }

  state.kids.forEach((kid) => {
    const card = document.createElement("div");
    card.className = "kid-card";
    card.innerHTML = `
      <div class="kid-avatar">${escapeHtml(kid.name[0] || "?")}</div>
      <div>
        <strong>${escapeHtml(kid.name)}</strong>
        <span>${earnedMinutes(kid.id)} minutes earned</span>
      </div>
      <button class="delete" type="button" aria-label="Remove ${escapeHtml(kid.name)}" title="Remove">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
      </button>
    `;
    card.querySelector("button").addEventListener("click", () => removeKid(kid.id));
    kidList.append(card);
  });
}

function renderTasks() {
  choreList.innerHTML = "";
  balanceList.innerHTML = "";

  if (!state.chores.length) choreList.append(emptyNode("Add chores your house actually needs."));
  state.chores.forEach((task) => choreList.append(taskNode(task, "chores")));
  state.balance.forEach((task) => balanceList.append(taskNode(task, "balance")));
}

function renderRoutine() {
  routineList.innerHTML = "";
  state.routine.forEach((item) => {
    const node = document.createElement("div");
    node.className = `routine ${item.done ? "done" : ""}`;
    node.innerHTML = `
      <button class="check" type="button" aria-label="Toggle ${escapeHtml(item.title)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"></path></svg>
      </button>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
      <span>${item.done ? "done" : ""}</span>
    `;
    node.querySelector("button").addEventListener("click", () => toggleRoutine(item.id));
    routineList.append(node);
  });
}

function taskNode(task, group) {
  const kid = state.kids.find((item) => item.id === task.kidId);
  const node = document.createElement("div");
  node.className = `task ${task.done ? "done" : ""}`;
  node.innerHTML = `
    <button class="check" type="button" aria-label="Toggle ${escapeHtml(task.title)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"></path></svg>
    </button>
    <div>
      <strong>${escapeHtml(task.title)}</strong>
      <span>${kid ? escapeHtml(kid.name) : labelFor(task.type)}${task.minutes ? ` · ${task.minutes} min` : ""}</span>
    </div>
    <button class="delete" type="button" aria-label="Delete ${escapeHtml(task.title)}" title="Delete">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
    </button>
  `;
  node.querySelector(".check").addEventListener("click", () => toggleTask(group, task.id));
  node.querySelector(".delete").addEventListener("click", () => deleteTask(group, task.id));
  return node;
}

function renderScore() {
  const allItems = [...state.chores, ...state.balance, ...state.routine];
  const done = allItems.filter((item) => item.done).length;
  const score = allItems.length ? Math.round((done / allItems.length) * 100) : 0;
  const outside = state.balance.filter((item) => item.type === "outside" && item.done).length;
  const chores = state.chores.filter((item) => item.done).length;
  const minutes = state.chores.concat(state.balance).reduce((total, item) => {
    return total + (item.done ? Number(item.minutes || 0) : 0);
  }, 0);

  scoreText.textContent = `${score}%`;
  scoreBar.style.width = `${score}%`;
  choresDone.textContent = chores;
  outsideDone.textContent = outside;
  screenBank.textContent = minutes;
}

function earnedMinutes(kidId) {
  return state.chores.reduce((total, chore) => {
    return total + (chore.kidId === kidId && chore.done ? Number(chore.minutes || 0) : 0);
  }, 0);
}

function addKidByName(name) {
  const cleanName = name.trim();
  if (!cleanName) return;
  state.kids.push({ id: crypto.randomUUID(), name: cleanName });
  rotateUnassignedChores();
  kidName.value = "";
  render();
}

function removeKid(kidId) {
  state.kids = state.kids.filter((kid) => kid.id !== kidId);
  state.chores = state.chores.map((chore) => (chore.kidId === kidId ? { ...chore, kidId: null } : chore));
  rotateUnassignedChores();
  render();
}

function rotateUnassignedChores() {
  if (!state.kids.length) return;
  state.chores = state.chores.map((chore, index) => ({
    ...chore,
    kidId: chore.kidId || state.kids[index % state.kids.length].id
  }));
}

function toggleTask(group, id) {
  state[group] = state[group].map((task) => (task.id === id ? { ...task, done: !task.done } : task));
  render();
}

function toggleRoutine(id) {
  state.routine = state.routine.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
  render();
}

function deleteTask(group, id) {
  state[group] = state[group].filter((task) => task.id !== id);
  render();
}

function openTaskDialog() {
  taskName.value = "";
  taskMinutes.value = "10";
  taskKid.innerHTML = state.kids.length
    ? state.kids.map((kid) => `<option value="${kid.id}">${escapeHtml(kid.name)}</option>`).join("")
    : `<option value="">Family</option>`;
  taskDialog.showModal();
  taskName.focus();
}

function saveTask(event) {
  event.preventDefault();
  const title = taskName.value.trim();
  if (!title) return;

  state.chores.push({
    id: crypto.randomUUID(),
    title,
    kidId: taskKid.value || null,
    minutes: Number(taskMinutes.value || 0),
    done: false
  });
  taskDialog.close();
  render();
}

function resetToday() {
  state.chores = state.chores.map((item) => ({ ...item, done: false }));
  state.balance = state.balance.map((item) => ({ ...item, done: false }));
  state.routine = state.routine.map((item) => ({ ...item, done: false }));
  render();
}

function emptyNode(text) {
  const node = document.createElement("div");
  node.className = "empty";
  node.textContent = text;
  return node;
}

function labelFor(type) {
  const labels = {
    outside: "Outdoor goal",
    learning: "Learning",
    creative: "Creative",
    screens: "Screen rule"
  };
  return labels[type] || "Family";
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

kidForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addKidByName(kidName.value);
});

addKid.addEventListener("click", () => kidName.focus());
addChore.addEventListener("click", openTaskDialog);
taskForm.addEventListener("submit", saveTask);
resetDay.addEventListener("click", resetToday);
closeDialog.addEventListener("click", () => taskDialog.close());
cancelTask.addEventListener("click", () => taskDialog.close());

render();
