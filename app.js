// ===== State =====
const STORAGE_KEY = "calorieTrackerData";
const GOAL_KEY = "calorieTrackerGoal";

let currentDate = getTodayStr();
let dailyGoal = loadGoal();

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const headerDate = $("#header-date");
const totalCaloriesEl = $("#total-calories");
const remainingCaloriesEl = $("#remaining-calories");
const ringFill = $("#ring-fill");
const ringPercent = $("#ring-percent");
const calorieBar = $("#calorie-bar");
const goalDisplay = $("#goal-display");
const goalBtn = $("#goal-btn");
const goalModal = $("#goal-modal");
const goalInput = $("#goal-input");
const goalCancel = $("#goal-cancel");
const goalSave = $("#goal-save");
const editModal = $("#edit-modal");
const editCancel = $("#edit-cancel");
const editSave = $("#edit-save");
const toggleFormBtn = $("#toggle-form-btn");
const entryForm = $("#entry-form");
const cancelFormBtn = $("#cancel-form-btn");
const mealsSection = $("#meals-section");
const historyChart = $("#history-chart");
const prevDayBtn = $("#prev-day");
const nextDayBtn = $("#next-day");
const datePickerBtn = $("#date-picker-btn");
const datePickerInput = $("#date-picker-input");
const macroProtein = $("#macro-protein");
const macroCarbs = $("#macro-carbs");
const macroFat = $("#macro-fat");
const toast = $("#toast");

// ===== Helpers =====
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = getTodayStr();
  const yesterday = shiftDate(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatHeaderDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getDayName(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// ===== Storage =====
function loadAllData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadGoal() {
  return parseInt(localStorage.getItem(GOAL_KEY)) || 2000;
}

function saveGoal(val) {
  localStorage.setItem(GOAL_KEY, String(val));
}

function getEntries(dateStr) {
  const data = loadAllData();
  return data[dateStr] || [];
}

function setEntries(dateStr, entries) {
  const data = loadAllData();
  if (entries.length === 0) {
    delete data[dateStr];
  } else {
    data[dateStr] = entries;
  }
  saveAllData(data);
}

// ===== Toast =====
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

// ===== Rendering =====
const MEAL_CONFIG = {
  breakfast: { label: "Breakfast", emoji: "🌅", color: "var(--breakfast)" },
  lunch: { label: "Lunch", emoji: "☀️", color: "var(--lunch)" },
  dinner: { label: "Dinner", emoji: "🌙", color: "var(--dinner)" },
  snack: { label: "Snack", emoji: "🍿", color: "var(--snack)" },
};

function render() {
  const entries = getEntries(currentDate);
  const totalCal = entries.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = entries.reduce((s, e) => s + (e.protein || 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs || 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat || 0), 0);
  const remaining = dailyGoal - totalCal;
  const pct = dailyGoal > 0 ? Math.min((totalCal / dailyGoal) * 100, 100) : 0;
  const isOver = totalCal > dailyGoal;

  // Header
  headerDate.textContent = formatHeaderDate(currentDate);

  // Summary numbers
  totalCaloriesEl.textContent = totalCal.toLocaleString();
  remainingCaloriesEl.textContent = remaining.toLocaleString();
  remainingCaloriesEl.style.color = isOver ? "var(--danger)" : "";

  // Ring
  const circumference = 2 * Math.PI * 52; // ~326.73
  const offset = circumference - (pct / 100) * circumference;
  ringFill.style.strokeDashoffset = offset;
  ringFill.classList.toggle("over", isOver);
  ringPercent.textContent = Math.round((totalCal / dailyGoal) * 100) + "%";

  // Bar
  calorieBar.style.width = Math.min(pct, 100) + "%";
  calorieBar.classList.toggle("over", isOver);

  // Goal display
  goalDisplay.textContent = dailyGoal.toLocaleString();

  // Macros
  macroProtein.textContent = totalProtein.toFixed(1) + "g";
  macroCarbs.textContent = totalCarbs.toFixed(1) + "g";
  macroFat.textContent = totalFat.toFixed(1) + "g";

  // Date nav
  datePickerBtn.textContent = formatDateDisplay(currentDate);

  // Meals
  renderMeals(entries);

  // History
  renderHistory();
}

function renderMeals(entries) {
  if (entries.length === 0) {
    mealsSection.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>No entries yet. Add your first meal!</p>
      </div>`;
    return;
  }

  const grouped = {};
  for (const meal of ["breakfast", "lunch", "dinner", "snack"]) {
    const items = entries.filter((e) => e.meal === meal);
    if (items.length > 0) grouped[meal] = items;
  }

  let html = "";
  for (const [meal, items] of Object.entries(grouped)) {
    const cfg = MEAL_CONFIG[meal];
    const mealTotal = items.reduce((s, e) => s + (e.calories || 0), 0);
    html += `
      <div class="meal-group">
        <div class="meal-header">
          <div class="meal-title">
            <span class="meal-dot" style="background:${cfg.color}"></span>
            ${cfg.emoji} ${cfg.label}
          </div>
          <span class="meal-total">${mealTotal} kcal</span>
        </div>`;
    for (const entry of items) {
      const macrosText = [];
      if (entry.protein) macrosText.push(`P: ${entry.protein}g`);
      if (entry.carbs) macrosText.push(`C: ${entry.carbs}g`);
      if (entry.fat) macrosText.push(`F: ${entry.fat}g`);
      html += `
        <div class="entry-card">
          <div class="entry-info">
            <div class="entry-name">${escapeHtml(entry.name)}</div>
            ${macrosText.length ? `<div class="entry-macros">${macrosText.join(" · ")}</div>` : ""}
          </div>
          <div class="entry-calories">${entry.calories}</div>
          <div class="entry-actions">
            <button class="edit-btn" onclick="openEditModal('${entry.id}')" title="Edit">✏️</button>
            <button class="delete-btn" onclick="deleteEntry('${entry.id}')" title="Delete">🗑️</button>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  mealsSection.innerHTML = html;
}

function renderHistory() {
  const today = getTodayStr();
  let html = "";

  // Collect the last 7 days and find the max for scaling
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDate(today, -i);
    const entries = getEntries(d);
    const total = entries.reduce((s, e) => s + (e.calories || 0), 0);
    days.push({ date: d, total, day: getDayName(d) });
  }

  const maxCal = Math.max(dailyGoal, ...days.map((d) => d.total), 1);

  for (const d of days) {
    const heightPct = (d.total / maxCal) * 100;
    const isToday = d.date === today;
    const isOver = d.total > dailyGoal;
    let barClass = "";
    if (isToday) barClass = "today";
    else if (isOver) barClass = "over";

    html += `
      <div class="history-bar-wrapper">
        <div class="history-cal">${d.total > 0 ? d.total : ""}</div>
        <div class="history-bar-track">
          <div class="history-bar ${barClass}" style="height:${heightPct}%"></div>
        </div>
        <div class="history-day">${isToday ? "Today" : d.day}</div>
      </div>`;
  }
  historyChart.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== Entry CRUD =====
function addEntry(entry) {
  const entries = getEntries(currentDate);
  entries.push(entry);
  setEntries(currentDate, entries);
  render();
}

window.deleteEntry = function (id) {
  let entries = getEntries(currentDate);
  const entry = entries.find((e) => e.id === id);
  entries = entries.filter((e) => e.id !== id);
  setEntries(currentDate, entries);
  showToast(`Removed "${entry ? entry.name : "entry"}"`);
  render();
};

function updateEntry(id, updates) {
  const entries = getEntries(currentDate);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...updates };
    setEntries(currentDate, entries);
    render();
    showToast("Entry updated!");
  }
}

// ===== Form Handling =====
toggleFormBtn.addEventListener("click", () => {
  entryForm.classList.toggle("hidden");
  toggleFormBtn.classList.add("hidden");
  $("#food-name").focus();
});

cancelFormBtn.addEventListener("click", () => {
  entryForm.classList.add("hidden");
  toggleFormBtn.classList.remove("hidden");
  entryForm.reset();
});

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#food-name").value.trim();
  const calories = parseInt($("#food-calories").value) || 0;
  const protein = parseFloat($("#food-protein").value) || 0;
  const carbs = parseFloat($("#food-carbs").value) || 0;
  const fat = parseFloat($("#food-fat").value) || 0;
  const meal = $("#food-meal").value;

  if (!name || calories <= 0) {
    showToast("Please enter a food name and calories.");
    return;
  }

  addEntry({ id: generateId(), name, calories, protein, carbs, fat, meal });
  showToast(`Added "${name}" — ${calories} kcal`);
  entryForm.reset();
  entryForm.classList.add("hidden");
  toggleFormBtn.classList.remove("hidden");
});

// ===== Edit Modal =====
window.openEditModal = function (id) {
  const entries = getEntries(currentDate);
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;

  $("#edit-food-name").value = entry.name;
  $("#edit-food-calories").value = entry.calories;
  $("#edit-food-protein").value = entry.protein || "";
  $("#edit-food-carbs").value = entry.carbs || "";
  $("#edit-food-fat").value = entry.fat || "";
  $("#edit-food-meal").value = entry.meal;
  $("#edit-entry-id").value = id;
  editModal.classList.remove("hidden");
};

editCancel.addEventListener("click", () => editModal.classList.add("hidden"));
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) editModal.classList.add("hidden");
});

editSave.addEventListener("click", () => {
  const id = $("#edit-entry-id").value;
  const name = $("#edit-food-name").value.trim();
  const calories = parseInt($("#edit-food-calories").value) || 0;
  const protein = parseFloat($("#edit-food-protein").value) || 0;
  const carbs = parseFloat($("#edit-food-carbs").value) || 0;
  const fat = parseFloat($("#edit-food-fat").value) || 0;
  const meal = $("#edit-food-meal").value;

  if (!name || calories <= 0) {
    showToast("Please enter a valid name and calories.");
    return;
  }

  updateEntry(id, { name, calories, protein, carbs, fat, meal });
  editModal.classList.add("hidden");
});

// ===== Goal Modal =====
goalBtn.addEventListener("click", () => {
  goalInput.value = dailyGoal;
  goalModal.classList.remove("hidden");
  goalInput.focus();
  goalInput.select();
});

goalCancel.addEventListener("click", () => goalModal.classList.add("hidden"));
goalModal.addEventListener("click", (e) => {
  if (e.target === goalModal) goalModal.classList.add("hidden");
});

goalSave.addEventListener("click", () => {
  const val = parseInt(goalInput.value);
  if (!val || val < 100) {
    showToast("Please enter a goal of at least 100 kcal.");
    return;
  }
  dailyGoal = val;
  saveGoal(val);
  goalModal.classList.add("hidden");
  showToast(`Goal set to ${val.toLocaleString()} kcal`);
  render();
});

goalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") goalSave.click();
});

// ===== Date Navigation =====
prevDayBtn.addEventListener("click", () => {
  currentDate = shiftDate(currentDate, -1);
  render();
});

nextDayBtn.addEventListener("click", () => {
  currentDate = shiftDate(currentDate, 1);
  render();
});

datePickerBtn.addEventListener("click", () => {
  datePickerInput.value = currentDate;
  datePickerInput.showPicker();
});

datePickerInput.addEventListener("change", (e) => {
  if (e.target.value) {
    currentDate = e.target.value;
    render();
  }
});

// ===== Init =====
render();

