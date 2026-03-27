// --- 상태 관리 ---
const state = {
    currentDate: new Date(),
    selectedDate: new Date(),
    tasks: [],
    syncId: null,
    user: {
        name: "Jayraj",
        profilePic: "assets/profile.svg"
    }
};

const STORAGE_KEY = 'timebox_app_data';
const SYNC_ID_KEY = 'timebox_sync_id';

// --- 동기화 및 데이터 로직 ---

function initSyncId() {
    let id = localStorage.getItem(SYNC_ID_KEY);
    if (!id) {
        id = 'user-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(SYNC_ID_KEY, id);
    }
    state.syncId = id;
    updateSyncUI();
}

function updateSyncUI() {
    const display = document.getElementById('sync-id-display');
    if (display) display.innerText = state.syncId;
}

function editSyncId() {
    const newId = prompt("다른 기기와 연결할 동기화 ID를 입력하세요:", state.syncId);
    if (newId && newId !== state.syncId) {
        state.syncId = newId;
        localStorage.setItem(SYNC_ID_KEY, newId);
        updateSyncUI();
        loadData(); // 새 ID 기준으로 데이터 다시 불러오기
    }
}

function copySyncId() {
    navigator.clipboard.writeText(state.syncId);
    alert("동기화 ID를 복사했습니다.");
}

async function loadData() {
    // 1. 로컬 저장 데이터 불러오기
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        const parsed = JSON.parse(localData);
        state.tasks = parsed.tasks || [];
        updateUI(); // 즉시 화면 반영
    }

    // 2. Cloudflare KV에서 동기화 데이터 불러오기
    try {
        // 단순한 구조를 유지하기 위해 전체 태스크 목록을 'global' 키 하나로 동기화한다.
        // 이후 필요하면 날짜별 저장 전략으로 확장할 수 있다.

        const response = await fetch(`/api/data?id=${state.syncId}&date=global`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data)) {
                // 충돌 병합은 단순화하고, 서버 데이터가 있으면 우선 적용한다.
                state.tasks = data;
                saveData(false); // 로컬에는 저장하되 즉시 재동기화는 하지 않음
                updateUI();
            }
        }
    } catch (e) {
        console.error("Sync failed:", e);
    }

    // 아무 데이터도 없을 때 기본 예시 데이터 사용
    if (!state.tasks.length && !localData) {
        state.tasks = [
            { id: 't1', title: '팀 미팅', category: 'work', status: 'pending', priority: 'high', scheduledTime: '16:30' },
            { id: 't2', title: '장보기', category: 'personal', status: 'pending', priority: 'medium', scheduledTime: '17:30' }
        ];
        saveData();
    }
}

async function saveData(sync = true) {
    // 1. 로컬 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks: state.tasks
    }));

    // 2. KV로 동기화
    if (sync) {
        try {
            await fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: state.syncId,
                    date: 'global', // 전체 태스크를 하나의 키로 동기화
                    data: state.tasks,
                    level: calculateDailyActivity() // 활동량 통계용 값
                })
            });
        } catch (e) {
            console.error("Save sync failed:", e);
        }
    }

    updateUI();
}

function calculateDailyActivity() {
    // Simple logic: syncs heatmap for TODAY based on completed tasks
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Count completed tasks? Or just interaction? 
    // Let's just return 1-4 random for demo, or actual count
    const completed = state.tasks.filter(t => t.status === 'completed').length;
    return Math.min(completed, 4);
}


// --- UI Rendering ---

function updateUI() {
    renderCalendar();
    renderScheduleList();
    renderTaskLists();
    renderTimeline();
    renderCategoryCounts();
    renderTimelineSlots();
}

// 1. Calendar Renderer
function renderCalendar() {
    const calendarEl = document.getElementById('week-calendar');
    calendarEl.innerHTML = '';

    const startOfWeek = getStartOfWeek(state.currentDate);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);

        const isSelected = isSameDate(date, state.selectedDate);

        const dayEl = document.createElement('div');
        dayEl.className = `day-column ${isSelected ? 'active' : ''}`;
        dayEl.onclick = () => {
            state.selectedDate = date;
            updateUI();
        };

        dayEl.innerHTML = `
            <span class="day-name">${days[i]}</span>
            <span class="day-number">${date.getDate()}</span>
        `;
        calendarEl.appendChild(dayEl);
    }

    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('timeline-date-header').textContent =
        state.selectedDate.toLocaleDateString('ko-KR', options);
}

// 2. Schedule List (Home Page)
function renderScheduleList() {
    const listEl = document.getElementById('schedule-list');
    listEl.innerHTML = '';

    const selectedDateStr = getDateString(state.selectedDate);
    const scheduledTasks = state.tasks.filter(t =>
        t.scheduledDate === selectedDateStr && t.scheduledTime
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    if (scheduledTasks.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">선택한 날짜에 배치된 일정이 없습니다.</p>';
        return;
    }

    scheduledTasks.forEach(task => {
        const el = document.createElement('div');
        el.className = 'schedule-item';
        el.innerHTML = `
            <div class="schedule-info">
                <h3>${task.title}</h3>
                <span class="schedule-time"><i class="far fa-clock"></i>${formatTimeRange(task.scheduledTime)}</span>
            </div>
            <div class="schedule-meta">
                <i class="far fa-flag"></i>
                <span class="status ${task.status === 'completed' ? 'upcoming' : 'pending'}">
                    ${task.status === 'completed' ? '완료' : '진행 전'}
                </span>
            </div>
        `;
        listEl.appendChild(el);
    });
}

// 3. Task Lists (Priorities & Backlog)
function renderTaskLists() {
    const priorityEl = document.getElementById('priority-list');
    const backlogEl = document.getElementById('backlog-list');
    const dragSourceEl = document.getElementById('draggable-source-list');

    priorityEl.innerHTML = '';
    backlogEl.innerHTML = '';
    dragSourceEl.innerHTML = '';

    state.tasks.forEach(task => {
        const taskHTML = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="task-icon"><i class="fas fa-briefcase"></i></div>
            <span class="task-name">${task.title}</span>
            <i class="fas fa-trash" onclick="deleteTask('${task.id}', event)" style="color:red; cursor:pointer; margin-left:10px;"></i>
        `;

        const taskEl = document.createElement('div');
        taskEl.className = 'task-item';
        taskEl.setAttribute('data-id', task.id);
        taskEl.innerHTML = taskHTML;

        // Populate Lists
        if (task.priority === 'high') {
            priorityEl.appendChild(taskEl.cloneNode(true));
        } else {
            backlogEl.appendChild(taskEl.cloneNode(true));
        }

        // For Scheduling Page
        if (!task.scheduledTime) {
            const dragEl = document.createElement('div');
            dragEl.className = 'task-item';
            dragEl.setAttribute('data-id', task.id);
            dragEl.innerHTML = `<div class="task-icon"><i class="fas fa-briefcase"></i></div><span class="task-name">${task.title}</span>`;
            dragSourceEl.appendChild(dragEl);
        }
    });
}

function deleteTask(id, event) {
    if (event) event.stopPropagation();
    if (confirm('이 할 일을 삭제할까요?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
    }
}

// 4. Timeline
function renderTimeline() {
    const timelineEl = document.getElementById('timeline-view');
    timelineEl.innerHTML = '';

    const selectedDateStr = getDateString(state.selectedDate);

    // Generate time slots 08:00 to 22:00
    for (let i = 8; i <= 22; i++) {
        const hour = i.toString().padStart(2, '0') + ":00";
        const hourHalf = i.toString().padStart(2, '0') + ":30";

        [hour, hourHalf].forEach(time => {
            const task = state.tasks.find(t => t.scheduledDate === selectedDateStr && t.scheduledTime === time);

            const slotEl = document.createElement('div');
            slotEl.className = 'time-slot';
            slotEl.innerHTML = `
                <span class="time-label">${formatTime12(time)}</span>
                <div class="timeline-bg-line" style="top: 10px;"></div>
                ${task ? `
                <div class="task-block" style="height: 60px;">
                    <h3>${task.title}</h3>
                    <div class="task-block-meta">
                        <i class="far fa-flag"></i>
                        <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}')" 
                             style="background: ${task.status === 'completed' ? 'var(--primary-color)' : 'transparent'}"></div>
                    </div>
                </div>` : ''}
            `;
            timelineEl.appendChild(slotEl);
        });
    }
}

function toggleTaskStatus(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.status = task.status === 'completed' ? 'pending' : 'completed';
        saveData();
    }
}

// 5. Category Counts
function renderCategoryCounts() {
    const counts = { personal: 0, meet: 0, event: 0, work: 0 };
    state.tasks.forEach(t => {
        if (counts[t.category] !== undefined) counts[t.category]++;
    });

    document.getElementById('cat-personal-count').innerText = `${counts.personal}개`;
    document.getElementById('cat-meet-count').innerText = `${counts.meet}개`;
    document.getElementById('cat-event-count').innerText = `${counts.event}개`;
    document.getElementById('cat-work-count').innerText = `${counts.work}개`;
}

// 6. Timeline Slots
function renderTimelineSlots() {
    const container = document.getElementById('timeline-slots');
    container.innerHTML = '';

    const selectedDateStr = getDateString(state.selectedDate);

    // 08:00 to 20:00
    for (let i = 8; i <= 20; i++) {
        ['00', '30'].forEach(min => {
            const time = `${i.toString().padStart(2, '0')}:${min}`;
            const slot = document.createElement('div');
            slot.className = 'time-slot drop-zone';
            slot.setAttribute('data-time', time);
            slot.innerHTML = `<span class="time-label">${formatTime12(time)}</span>`;

            const task = state.tasks.find(t => t.scheduledDate === selectedDateStr && t.scheduledTime === time);
            if (task) {
                slot.innerHTML += `<div class="task-item-embedded" style="background:#eef; padding:4px; border-radius:4px; margin-left:10px; font-size:12px;">${task.title}</div>`;
            }
            container.appendChild(slot);

            // Init Sortable for this slot
            new Sortable(slot, {
                group: { name: 'scheduling', pull: false, put: true },
                sort: false,
                onAdd: function (evt) {
                    const taskId = evt.item.getAttribute('data-id');
                    const time = slot.getAttribute('data-time');
                    const task = state.tasks.find(t => t.id === taskId);

                    if (task) {
                        const dateStr = getDateString(state.selectedDate);
                        // Clear any other task already in this slot for this date
                        state.tasks.forEach(t => {
                            if (t.scheduledDate === dateStr && t.scheduledTime === time) {
                                t.scheduledTime = null;
                                t.scheduledDate = null;
                            }
                        });
                        task.scheduledTime = time;
                        task.scheduledDate = dateStr;
                        saveData();
                    }
                }
            });
        });
    }
}

// --- Interaction Logic ---

function addNewTask() {
    const input = document.getElementById('new-task-input');
    const title = input.value.trim();
    if (title) {
        state.tasks.push({
            id: 't' + Date.now(),
            title: title,
            category: 'personal',
            status: 'pending',
            priority: 'medium',
            scheduledTime: null,
            scheduledDate: null
        });
        input.value = '';
        saveData();
    }
}

function resetSchedule() {
    const dateStr = getDateString(state.selectedDate);
    state.tasks.forEach(t => {
        if (t.scheduledDate === dateStr) {
            t.scheduledTime = null;
            t.scheduledDate = null;
        }
    });
    saveData();
}

// 드래그 앤 드롭 초기화
function initDragAndDrop() {
    new Sortable(document.getElementById('priority-list'), { group: 'shared', animation: 150, onEnd: onReorder });
    new Sortable(document.getElementById('backlog-list'), { group: 'shared', animation: 150, onEnd: onReorder });

    new Sortable(document.getElementById('draggable-source-list'), {
        group: { name: 'scheduling', pull: 'clone', put: true },
        sort: false,
        animation: 150,
        onAdd: function (evt) {
            const taskId = evt.item.getAttribute('data-id');
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                task.scheduledTime = null;
                task.scheduledDate = null;
                saveData();
            }
        }
    });


}

function onReorder(evt) {
    const itemId = evt.item.getAttribute('data-id');
    const targetListId = evt.to.id;
    const task = state.tasks.find(t => t.id === itemId);

    if (task) {
        task.priority = (targetListId === 'priority-list') ? 'high' : 'medium';
        saveData();
    }
}


// --- Helpers ---

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function isSameDate(d1, d2) {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}

function getDateString(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function formatTime12(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function formatTimeRange(startTime) {
    if (!startTime) return '';
    const [h, m] = startTime.split(':');
    let endH = parseInt(h);
    let endM = parseInt(m) + 30;
    if (endM >= 60) { endH++; endM = 0; }
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    return `${formatTime12(startTime)} - ${formatTime12(endTime)}`;
}

// --- Navigation ---

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');

    // Update FAB
    const fab = document.querySelectorAll('.fab');
    fab.forEach(f => {
        if (pageId === 'profile-page' || pageId === 'timeline-page') {
            f.classList.add('dark');
        } else {
            f.classList.remove('dark');
        }
    });

    window.scrollTo(0, 0);
}

function setActiveTab(clickedTab) {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.remove('active-calendar');
    });

    if (clickedTab.querySelector('.fa-home') || clickedTab.querySelector('.fa-calendar-alt')) {
        clickedTab.classList.add('active-calendar');
    } else {
        clickedTab.classList.add('active');
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    initSyncId(); // NEW
    loadData();
    initDragAndDrop();
    showPage('timeline-page');
});
