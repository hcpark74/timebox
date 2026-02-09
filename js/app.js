let selectedDate = dayjs().format('YYYY-MM-DD');
const timelineContainer = document.getElementById('timeline-container');

// 1. Create Timeline Slots (06:00 - 22:00)
function createTimeline() {
    timelineContainer.innerHTML = '';
    for (let i = 6; i <= 22; i++) {
        const hour = i.toString().padStart(2, '0') + ":00";
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `<span class="time-label">${hour}</span><input type="text" class="time-slot" placeholder="-" data-hour="${hour}">`;
        timelineContainer.appendChild(row);
    }
}

// 2. Render Week Strip & Grass Grid
function renderWeek() {
    const strip = document.getElementById('week-strip');
    strip.innerHTML = '';
    for (let i = -3; i <= 3; i++) {
        const d = dayjs().add(i, 'day');
        const isSelected = d.format('YYYY-MM-DD') === selectedDate;
        const card = document.createElement('div');
        card.className = `day-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `<span style="display:block; font-size:0.7rem;">${d.format('ddd')}</span><strong>${d.format('D')}</strong>`;
        card.onclick = () => { selectedDate = d.format('YYYY-MM-DD'); renderWeek(); loadData(); };
        strip.appendChild(card);
    }
}

// 3. Data Loading & Saving
async function loadData() {
    const userId = localStorage.getItem('timebox_user') || "";
    if (!userId) return;
    document.getElementById('user-id').value = userId;

    // Modified to match backend API: ?id=...&date=...
    const res = await fetch(`/api/data?id=${userId}&date=${selectedDate}`);
    if (!res.ok) return;

    const currentData = await res.json();

    // Safety check: existing data might have different structure or be empty
    const data = currentData || {};

    document.getElementById('brain-dump').value = data.brainDump || '';

    // Top 3 Priorities
    document.querySelectorAll('.p-top').forEach((el, i) => {
        el.value = (data.top3 && data.top3[i]) ? data.top3[i] : '';
    });

    // Timeline
    document.querySelectorAll('.time-slot').forEach((el, i) => {
        el.value = (data.timeline && data.timeline[i]) ? data.timeline[i] : '';
    });
}

const saveData = debounce(async () => {
    const userId = document.getElementById('user-id').value;
    if (!userId) return;
    localStorage.setItem('timebox_user', userId);

    // Collect Data
    const pageData = {
        brainDump: document.getElementById('brain-dump').value,
        top3: Array.from(document.querySelectorAll('.p-top')).map(i => i.value),
        timeline: Array.from(document.querySelectorAll('.time-slot')).map(i => i.value)
    };

    // Calculate Activity Level for Heatmap (Simple heuristic)
    const filledCount = pageData.timeline.filter(t => t).length + pageData.top3.filter(t => t).length;
    let activityLevel = 0;
    if (filledCount > 0) activityLevel = 1;
    if (filledCount > 5) activityLevel = 2;
    if (filledCount > 10) activityLevel = 3;
    if (filledCount > 15) activityLevel = 4;

    // Backend expects { id, date, data, level }
    const payload = {
        id: userId,
        date: selectedDate,
        data: pageData,
        level: activityLevel
    };

    await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}, 1200);

function debounce(f, t) {
    let timer;
    return (...a) => {
        clearTimeout(timer);
        timer = setTimeout(() => f(...a), t);
    }
}

// Initialize
createTimeline();
renderWeek();
loadData();

// Input Listeners
document.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', saveData));
// Bind ID input specifically to reload on change
document.getElementById('user-id').addEventListener('change', (e) => {
    localStorage.setItem('timebox_user', e.target.value);
    loadData();
});

// Clock
setInterval(() => {
    document.getElementById('current-time').innerText = dayjs().format('HH:mm');
}, 1000);

// Load Heatmap Stats (Optional: Add this feature back if desired to show streaks)
async function updateStatsDisplay() {
    const userId = localStorage.getItem('timebox_user');
    if (!userId) return;
    try {
        const res = await fetch(`/api/stats?id=${userId}`);
        if (res.ok) {
            const stats = await res.json();
            // Calculate streak logic here or just show simple count
            // Simple streak calc matching previous logic could go here
            // For now, placeholder
        }
    } catch (e) { console.error(e); }
}
updateStatsDisplay();
