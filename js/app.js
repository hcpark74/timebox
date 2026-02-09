dayjs.locale('ko');

// Config
const API_BASE = '/api';

// State
let currentDate = dayjs();
let syncId = localStorage.getItem('timebox_sync_id') || '';
let currentData = {
    brainDump: '',
    priorities: ['', '', ''],
    schedule: {} // "08:00": "Task"
};
let isSaving = false;

// DOM Elements
const els = {
    syncIdInput: document.getElementById('sync-id'),
    syncStatus: document.getElementById('sync-status'),
    currentDateDisplay: document.getElementById('current-date'),
    prevDayBtn: document.getElementById('prev-day'),
    nextDayBtn: document.getElementById('next-day'),
    brainDump: document.getElementById('brain-dump'),
    prioInputs: [
        document.getElementById('prio-1'),
        document.getElementById('prio-2'),
        document.getElementById('prio-3')
    ],
    timeboxContainer: document.getElementById('timebox-container'),
    saveBtn: document.getElementById('save-btn'),
    heatmapGrid: document.getElementById('heatmap-grid'),
    streakBadge: document.getElementById('streak-badge')
};

// Initialize
function init() {
    setupTimeboxGrid();
    setupEventListeners();
    
    if (syncId) {
        els.syncIdInput.value = syncId;
    }
    
    loadDate(currentDate);
    fetchHeatmap();
}

function setupTimeboxGrid() {
    const startHour = 6;
    const endHour = 23;
    let html = '';
    
    for (let i = startHour; i <= endHour; i++) {
        const hourLabel = `${i.toString().padStart(2, '0')}:00`;
        html += `
            <div class="timebox-row">
                <span class="time-label">${hourLabel}</span>
                <input type="text" 
                    class="timebox-input" 
                    data-time="${hourLabel}" 
                    placeholder="계획 입력...">
            </div>
        `;
    }
    els.timeboxContainer.innerHTML = html;
}

function setupEventListeners() {
    // Navigation
    els.prevDayBtn.addEventListener('click', () => {
        currentDate = currentDate.subtract(1, 'day');
        loadDate(currentDate);
    });
    els.nextDayBtn.addEventListener('click', () => {
        currentDate = currentDate.add(1, 'day');
        loadDate(currentDate);
    });

    // Inputs (Auto-save to state)
    els.brainDump.addEventListener('input', (e) => {
        currentData.brainDump = e.target.value;
        triggerDebouncedSave();
    });
    
    els.prioInputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            currentData.priorities[idx] = e.target.value;
            triggerDebouncedSave();
        });
    });

    els.timeboxContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('timebox-input')) {
            const time = e.target.dataset.time;
            currentData.schedule[time] = e.target.value;
            triggerDebouncedSave();
        }
    });

    // Sync ID
    els.syncIdInput.addEventListener('change', (e) => {
        syncId = e.target.value.trim();
        localStorage.setItem('timebox_sync_id', syncId);
        loadDate(currentDate); // Reload data for new ID
        fetchHeatmap();
    });

    // Manual Save
    els.saveBtn.addEventListener('click', () => {
        saveData(true);
    });
}

// Data Handling
async function loadDate(dateObj) {
    // Update UI
    const dateStr = dateObj.format('YYYY-MM-DD');
    const isToday = dateObj.isSame(dayjs(), 'day');
    els.currentDateDisplay.textContent = isToday ? 'Today' : dateObj.format('M월 D일 (ddd)');
    
    // Reset UI inputs
    els.brainDump.value = '';
    els.prioInputs.forEach(i => i.value = '');
    document.querySelectorAll('.timebox-input').forEach(i => i.value = '');
    
    // Reset State
    currentData = {
        brainDump: '',
        priorities: ['', '', ''],
        schedule: {}
    };

    if (!syncId) return;

    els.syncStatus.textContent = '🔄';
    
    try {
        // Try LocalStorage first (Cache)
        const localKey = `timebox_${syncId}_${dateStr}`;
        const cached = localStorage.getItem(localKey);
        
        if (cached) {
            applyData(JSON.parse(cached));
        }

        // Fetch from Cloudflare
        const res = await fetch(`${API_BASE}/data?id=${syncId}&date=${dateStr}`);
        if (res.ok) {
            const remoteData = await res.json();
            if (remoteData) {
                applyData(remoteData);
                // Update cache
                localStorage.setItem(localKey, JSON.stringify(remoteData));
            }
        }
    } catch (err) {
        console.error('Load failed', err);
    } finally {
        els.syncStatus.textContent = '☁️';
    }
}

function applyData(data) {
    currentData = { ...currentData, ...data };
    
    els.brainDump.value = currentData.brainDump || '';
    
    els.prioInputs.forEach((input, idx) => {
        input.value = currentData.priorities[idx] || '';
    });

    if (currentData.schedule) {
        document.querySelectorAll('.timebox-input').forEach(input => {
            const time = input.dataset.time;
            if (currentData.schedule[time]) {
                input.value = currentData.schedule[time];
            }
        });
    }
}

let saveTimeout;
function triggerDebouncedSave() {
    clearTimeout(saveTimeout);
    els.syncStatus.textContent = '✏️';
    saveTimeout = setTimeout(() => saveData(), 1000); // 1 sec debounce
}

async function saveData(manual = false) {
    if (!syncId) {
        if (manual) alert('동기화 ID를 먼저 입력해주세요!');
        return;
    }

    isSaving = true;
    els.syncStatus.textContent = '🔄';
    const dateStr = currentDate.format('YYYY-MM-DD');
    
    // Determine activity level (simple heuristic)
    const filledItems = Object.values(currentData.schedule).filter(v => v).length + 
                       currentData.priorities.filter(v => v).length;
    const activityLevel = filledItems > 8 ? 4 : filledItems > 5 ? 3 : filledItems > 0 ? 1 : 0;

    // Update Local Cache immediately
    localStorage.setItem(`timebox_${syncId}_${dateStr}`, JSON.stringify(currentData));

    try {
        const res = await fetch(`${API_BASE}/data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: syncId,
                date: dateStr,
                data: currentData,
                level: activityLevel
            })
        });
        
        if (res.ok) {
            els.syncStatus.textContent = '✅';
            setTimeout(() => els.syncStatus.textContent = '☁️', 2000);
            if (manual) fetchHeatmap(); // Update stats on manual save
        } else {
            els.syncStatus.textContent = '❌';
        }
    } catch (err) {
        console.error('Save failed', err);
        els.syncStatus.textContent = '❌';
    } finally {
        isSaving = false;
    }
}

// Stats & Heatmap
async function fetchHeatmap() {
    if (!syncId) {
        renderEmptyHeatmap();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/stats?id=${syncId}`);
        if (res.ok) {
            const stats = await res.json();
            renderHeatmap(stats);
            calculateStreak(stats);
        } else {
            renderEmptyHeatmap();
        }
    } catch (err) {
        console.error('Stats fetch error', err);
        renderEmptyHeatmap();
    }
}

function renderEmptyHeatmap() {
    // Render 12 weeks of empty grid
    const weeks = 12;
    let html = '';
    for(let i=0; i<weeks; i++) {
        html += '<div class="heatmap-week">';
        for(let j=0; j<7; j++) {
            html += '<div class="heatmap-cell"></div>';
        }
        html += '</div>';
    }
    els.heatmapGrid.innerHTML = html;
}

function renderHeatmap(stats = {}) {
    // stats: { "2023-10-01": 2, "2023-10-02": 4, ... }
    // Render last 16 weeks (approx 4 months) to fill horizontal scroll
    const today = dayjs();
    // Start from Sunday 16 weeks ago
    const startDate = today.subtract(16, 'week').startOf('week');
    
    let html = '';
    let current = startDate;

    while (current.isBefore(today) || current.isSame(today, 'day') || current.day() !== 0) {
        if (current.day() === 0) html += '<div class="heatmap-week">';
        
        const dateStr = current.format('YYYY-MM-DD');
        const level = stats[dateStr] || 0;
        const title = `${dateStr}: Level ${level}`;
        
        html += `<div class="heatmap-cell level-${level}" title="${title}"></div>`;
        
        if (current.day() === 6) html += '</div>';
        
        current = current.add(1, 'day');
        if (current.isAfter(today) && current.day() === 0) break; 
    }
    els.heatmapGrid.innerHTML = html;
    
    // Scroll to end
    setTimeout(() => {
        els.heatmapGrid.scrollLeft = els.heatmapGrid.scrollWidth;
    }, 100);
}

function calculateStreak(stats) {
    let streak = 0;
    let d = dayjs().subtract(1, 'day'); // Start checking from yesterday? or today?
    const todayStr = dayjs().format('YYYY-MM-DD');
    
    // If today has data, start count from today
    if (stats[todayStr] > 0) {
        streak = 1;
    } else {
        // if today is 0, check yesterday. If yesterday is 0, streak is broken.
    }

    // Check backwards
    while (true) {
        const str = d.format('YYYY-MM-DD');
        if (stats[str] > 0) {
            streak++;
            d = d.subtract(1, 'day');
        } else {
            break;
        }
    }
    els.streakBadge.textContent = `${streak} Day Streak 🔥`;
}

// Start
init();
