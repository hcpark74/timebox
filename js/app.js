dayjs.locale('ko');

// === Init ===
const userIdInput = document.getElementById('user-id');
const selectedDate = dayjs().format('YYYY-MM-DD');
const els = {
    timerVal: document.getElementById('timer-val'),
    btnToggle: document.getElementById('btn-toggle'),
    focusInput: document.getElementById('focus-input'),
    brainDump: document.getElementById('brain-dump'),
    syncStatus: document.getElementById('sync-status'),
    todayDate: document.getElementById('today-date'),
    timelineContainer: document.getElementById('timeline-container'),
    grassGrid: document.getElementById('grass-grid'),
    streakCount: document.getElementById('streak-count')
};

// === 1. Timer Logic ===
let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    els.timerVal.innerText = `${m}:${s}`;
}

window.toggleTimer = function () {
    if (isRunning) {
        clearInterval(timerInterval);
        els.btnToggle.innerHTML = '<i data-lucide="play"></i>';
        els.btnToggle.classList.remove('btn-reset');
        isRunning = false;
    } else {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                resetTimer();
                // Simple notification if supported/wanted
                try { navigator.vibrate([200, 100, 200]); } catch (e) { }
                alert("Time's up!");
            }
        }, 1000);
        els.btnToggle.innerHTML = '<i data-lucide="pause"></i>';
        isRunning = true;
    }
    lucide.createIcons();
}

window.resetTimer = function () {
    clearInterval(timerInterval);
    timeLeft = 25 * 60;
    updateTimerDisplay();
    isRunning = false;
    els.btnToggle.innerHTML = '<i data-lucide="play"></i>';
    lucide.createIcons();
}

// === 2. Tab Logic ===
window.switchTab = function (tabName, el) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');

    if (tabName === 'stats') renderGrass();
}

// === 3. Timeline Init ===
function initTimeline() {
    els.timelineContainer.innerHTML = '';
    for (let i = 6; i <= 23; i++) {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <span class="time-label">${i.toString().padStart(2, '0')}:00</span>
            <input type="text" class="time-slot" data-hour="${i}" placeholder="-">
        `;
        els.timelineContainer.appendChild(row);
    }
}

// === 4. Data Sync (Compatibility with existing API) ===
/*
    Existing API expects:
    PUT body: { id, date, data, level }
    GET response: { ...data }
*/

async function loadData() {
    els.todayDate.innerText = dayjs().format('MM.DD ddd'); // Update UI date

    const userId = localStorage.getItem('timebox_user');
    if (!userId) return;
    userIdInput.value = userId;

    // Use specific ID-Date key format for compatibility if needed.
    // The previous app.js used user_ID_DATE. This new code sends ID:DATE as ID.
    // To maintain clean KV, let's allow the user's simpler ID logic:
    // User enters "user1". We query id="user1" date="2023-10-10".

    try {
        const res = await fetch(`/api/data?id=${userId}&date=${selectedDate}`);
        if (!res.ok) return;
        const data = await res.json() || {};

        // Populate Fields
        if (data.focus) els.focusInput.value = data.focus;
        if (data.brainDump) els.brainDump.value = data.brainDump;

        document.querySelectorAll('.p-top').forEach((el, i) => {
            el.value = data.top3?.[i] || '';
        });

        document.querySelectorAll('.time-slot').forEach((el, i) => {
            el.value = data.timeline?.[i] || '';
        });
    } catch (e) { console.error("Load Error", e); }
}

let saveTimer;
function autoSave() {
    clearTimeout(saveTimer);
    els.syncStatus.innerText = "Syncing...";

    saveTimer = setTimeout(async () => {
        const userId = userIdInput.value;
        if (!userId) {
            els.syncStatus.innerText = "No ID";
            return;
        }

        const top3 = Array.from(document.querySelectorAll('.p-top')).map(i => i.value);
        const timeline = Array.from(document.querySelectorAll('.time-slot')).map(i => i.value);

        const payloadData = {
            focus: els.focusInput.value,
            brainDump: els.brainDump.value,
            top3: top3,
            timeline: timeline
        };

        // Logic to calculate heatmap level
        const activityCount = top3.filter(x => x).length + timeline.filter(x => x).length;
        let level = 0;
        if (activityCount > 0) level = 1;
        if (activityCount > 5) level = 2;
        if (activityCount > 10) level = 3;
        if (activityCount > 15) level = 4;

        const payload = {
            id: userId,
            date: selectedDate,
            data: payloadData,
            level: level
        };

        try {
            await fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            localStorage.setItem('timebox_user', userId);
            els.syncStatus.innerText = "Synced";
        } catch (e) {
            console.error("Save Error", e);
            els.syncStatus.innerText = "Error";
        }
    }, 1000);
}

// === 5. Stats Logic (Adapting to Existing Backend) ===
async function renderGrass() {
    const userId = userIdInput.value;
    if (!userId) return;

    try {
        const res = await fetch(`/api/stats?id=${userId}`);
        const stats = await res.json();
        // stats is expected to be { "YYYY-MM-DD": level, ... }

        // Render last 35 days (5 weeks)
        let html = '';
        let activeDatesCounter = 0;

        for (let i = 34; i >= 0; i--) {
            const d = dayjs().subtract(i, 'day');
            const dateStr = d.format('YYYY-MM-DD');
            const level = stats[dateStr] || 0;
            const isActive = level > 0;

            html += `<div class="grass-cell ${isActive ? 'active' : ''}" title="${dateStr}"></div>`;
        }
        els.grassGrid.innerHTML = html;

        // Calculate Streak
        let streak = 0;
        let d = dayjs();
        // Check today first, if 0 check yesterday
        if (!stats[d.format('YYYY-MM-DD')]) {
            d = d.subtract(1, 'day');
        }

        while (true) {
            const str = d.format('YYYY-MM-DD');
            if (stats[str] > 0) {
                streak++;
                d = d.subtract(1, 'day');
            } else {
                break;
            }
        }
        els.streakCount.innerText = streak;

    } catch (e) { console.error("Stats Error", e); }
}

// === Setup ===
initTimeline();
loadData();
lucide.createIcons();

// Listeners
document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', autoSave);
});

userIdInput.addEventListener('change', () => {
    localStorage.setItem('timebox_user', userIdInput.value);
    loadData();
});
