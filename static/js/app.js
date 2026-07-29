"use strict";

const SNOOZE_MINUTES = 5;
let alarms = [];
let ringingAlarmId = null;
let audioContext = null;
let oscillator = null;

/* ---- CSRF helper (reads Django's csrftoken cookie) ---- */
function getCSRFToken() {
  const name = "csrftoken";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/* ---- DOM element references ---- */
const elements = {
  clock: document.querySelector("section:first-child time"),
  date: document.querySelector("#current-date"),
  form: document.querySelector("#alarm-form"),
  timeInput: document.querySelector("#alarm-time"),
  labelInput: document.querySelector("#alarm-label"),
  repeatInputs: document.querySelectorAll('input[name="repeat"]'),
  alarmsList: document.querySelector("#alarms-list"),
  stopButton: document.querySelector("#stop-alarm"),
};

/* ---- Time formatting helpers ---- */
function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimeValue(date) {
  return [date.getHours(), date.getMinutes()]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

/* ---- Clock display ---- */
function updateClock() {
  const now = new Date();
  elements.clock.dateTime = formatTimeValue(now);
  elements.clock.textContent = formatTime(now);
  elements.date.textContent = formatDate(now);
}

/* ---- API helpers ---- */
function apiPost(url, body) {
  const formData = new URLSearchParams(body);
  return fetch(url, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCSRFToken(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  }).then((r) => r.json());
}

/* ---- Render alarm list from scratch (replaces SSR or old list) ---- */
function renderAlarmList(data) {
  alarms = data.alarms;
  elements.alarmsList.innerHTML = "";
  for (const alarm of alarms) {
    const li = document.createElement("li");
    li.dataset.alarmId = alarm.id;
    li.innerHTML = `
      <article>
        <h3>${escapeHtml(alarm.label)}</h3>
        <p>
          <time datetime="${alarm.time}">${formatTimeFromValue(alarm.time)}</time>
          ${alarm.snooze_until ? ", Snoozed" : ", " + alarm.repeat}
        </p>
        <p class="alarm-toggle">
          <input type="checkbox" id="enabled-${alarm.id}" class="alarm-enabled-input"
                 ${alarm.enabled ? "checked" : ""} data-alarm-id="${alarm.id}">
          <label for="enabled-${alarm.id}">Enabled</label>
        </p>
        <p class="alarm-controls">
          <button type="button" class="snooze-button" data-alarm-id="${alarm.id}">Snooze 5 min</button>
          <button type="button" class="cancel-button" data-alarm-id="${alarm.id}">Cancel</button>
        </p>
      </article>`;
    elements.alarmsList.append(li);
  }
  // If the ringing alarm still exists, keep ringing state
  if (ringingAlarmId && !alarms.some((a) => a.id === ringingAlarmId)) {
    ringingAlarmId = null;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeFromValue(timeValue) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatTime(date);
}

function getRepeatValue() {
  const selected = Array.from(elements.repeatInputs).find((i) => i.checked);
  return selected ? selected.value : "once";
}

/* ---- Alarm actions ---- */
function handleFormSubmit(event) {
  event.preventDefault();
  if (!elements.timeInput.value) return;

  apiPost(elements.form.action, {
    time: elements.timeInput.value,
    label: elements.labelInput.value,
    repeat: getRepeatValue(),
  }).then(renderAlarmList);

  elements.form.reset();
  document.querySelector("#repeat-once").checked = true;
}

function handleToggle(alarmId, checked) {
  apiPost(`/api/alarms/${alarmId}/toggle/`, {}).then(renderAlarmList);
}

function handleSnooze(alarmId) {
  apiPost(`/api/alarms/${alarmId}/snooze/`, {}).then(renderAlarmList);
}

function handleCancel(alarmId) {
  apiPost(`/api/alarms/${alarmId}/delete/`, {}).then(renderAlarmList);
}

/* ---- Audio ---- */
function startSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioContext) audioContext = new AC();
  audioContext.resume().catch(() => {});

  oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
}

function stopSound() {
  if (oscillator) oscillator.stop();
  oscillator = null;
  ringingAlarmId = null;
  document.body.removeAttribute("data-alarm-ringing");
  elements.stopButton.hidden = true;
}

function ringAlarm(alarm) {
  if (ringingAlarmId) return;
  ringingAlarmId = alarm.id;
  document.body.dataset.alarmRinging = "true";
  elements.stopButton.hidden = false;
  startSound();

  if (alarm.repeat === "once") {
    apiPost(`/api/alarms/${alarm.id}/toggle/`, {}).then(renderAlarmList);
  }
}

function shouldRing(alarm, now) {
  if (!alarm.enabled) return false;
  if (alarm.snooze_until) return now >= new Date(alarm.snooze_until);

  const [hours, minutes] = alarm.time.split(":").map(Number);
  return now.getHours() === hours && now.getMinutes() === minutes;
}

function checkAlarms() {
  const now = new Date();
  for (const alarm of alarms) {
    if (ringingAlarmId === alarm.id) continue;
    if (shouldRing(alarm, now)) {
      ringAlarm(alarm);
      break;
    }
  }
}

/* ---- Event delegation (handles dynamically-created buttons) ---- */
function setupEventDelegation() {
  elements.alarmsList.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("cancel-button")) {
      handleCancel(target.dataset.alarmId);
    } else if (target.classList.contains("snooze-button")) {
      handleSnooze(target.dataset.alarmId);
    }
  });

  elements.alarmsList.addEventListener("change", (e) => {
    if (e.target.classList.contains("alarm-enabled-input")) {
      handleToggle(e.target.dataset.alarmId, e.target.checked);
    }
  });
}

/* ---- Bootstrap ---- */
function initialize() {
  // Load initial alarms from SSR JSON
  const dataScript = document.querySelector("#alarms-data");
  if (dataScript) {
    try {
      alarms = JSON.parse(dataScript.textContent);
    } catch (_) {
      alarms = [];
    }
  }

  elements.form.addEventListener("submit", handleFormSubmit);
  elements.stopButton.addEventListener("click", stopSound);

  setupEventDelegation();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(checkAlarms, 1000);
}

initialize();
