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
const MAX_PRIORITY_TASKS = 4;
const SCHEDULING_BLOCKS = [
    { start: '09:00', end: '11:30', title: '핵심 블록 1', description: '가장 중요한 일 한 가지에 깊게 집중하세요.', tag: '집중' },
    { start: '13:00', end: '15:00', title: '핵심 블록 2', description: '오후 첫 집중 시간을 대표 작업에 배정하세요.', tag: '집중' },
    { start: '15:00', end: '17:00', title: '핵심 블록 3', description: '남은 핵심 작업이나 후속 작업을 이어서 진행하세요.', tag: '집중' },
    { start: '17:00', end: '18:00', title: '버퍼 블록', description: '밀린 일 정리, 마무리, 예상 밖 작업 처리에 활용하세요.', tag: '버퍼', buffer: true }
];

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
    const scheduledTasks = SCHEDULING_BLOCKS.map((block) => {
        const task = state.tasks.find(t =>
            t.scheduledDate === selectedDateStr && t.scheduledTime === block.start
        );
        return task ? { block, task } : null;
    }).filter(Boolean);

    if (scheduledTasks.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">선택한 날짜에 배치된 고정 블록 일정이 없습니다.</p>';
        return;
    }

    scheduledTasks.forEach(({ block, task }) => {
        const el = document.createElement('div');
        el.className = `schedule-item ${block.buffer ? 'buffer-item' : ''}`;
        el.innerHTML = `
            <div class="schedule-info">
                <div class="schedule-block-label">${block.title}</div>
                <h3>${task.title}</h3>
                <span class="schedule-time"><i class="far fa-clock"></i>${formatTime12(block.start)} - ${formatTime12(block.end)}</span>
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
    const prioritySectionEl = document.getElementById('priority-section');
    const priorityHintEl = document.getElementById('priority-limit-hint');
    const openSchedulerBtn = document.getElementById('open-scheduler-btn');
    const checklistPriorityCount = document.getElementById('checklist-priority-count');
    const checklistScheduleCount = document.getElementById('checklist-schedule-count');
    const checklistExecute = document.getElementById('checklist-execute');
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

    const priorityCount = state.tasks.filter(task => task.priority === 'high').length;
    const selectedDateStr = getDateString(state.selectedDate);
    const scheduledPriorityCount = state.tasks.filter(task =>
        task.priority === 'high' &&
        task.scheduledDate === selectedDateStr &&
        task.scheduledTime
    ).length;
    const completedScheduledPriorityCount = state.tasks.filter(task =>
        task.priority === 'high' &&
        task.scheduledDate === selectedDateStr &&
        task.scheduledTime &&
        task.status === 'completed'
    ).length;
    const isPriorityFull = priorityCount >= MAX_PRIORITY_TASKS;

    if (prioritySectionEl) {
        prioritySectionEl.classList.toggle('priority-full', isPriorityFull);
    }

    if (priorityHintEl) {
        if (isPriorityFull) {
            priorityHintEl.textContent = `오늘의 핵심이 가득 찼습니다. 최대 ${MAX_PRIORITY_TASKS}개까지 선택할 수 있습니다.`;
        } else if (priorityCount === 0) {
            priorityHintEl.textContent = `오늘의 핵심을 1개 이상 선택하면 시간 배치를 시작할 수 있습니다.`;
        } else if (priorityCount < 3) {
            priorityHintEl.textContent = `지금도 배치할 수 있지만, 오늘의 핵심을 3개 이상 고르면 하루 흐름이 더 안정적입니다.`;
        } else {
            priorityHintEl.textContent = `좋아요. 지금 상태로 시간 블록에 배치하면 됩니다.`;
        }
    }

    if (openSchedulerBtn) {
        const isReadyToSchedule = priorityCount >= 3;
        openSchedulerBtn.disabled = priorityCount === 0;
        openSchedulerBtn.classList.toggle('btn-ready', isReadyToSchedule);
        openSchedulerBtn.textContent = priorityCount === 0
            ? '오늘의 핵심을 먼저 선택하세요'
            : '시간 배치하기';
    }

    if (checklistPriorityCount) {
        checklistPriorityCount.textContent = `1. 오늘의 핵심 고르기 (${priorityCount}/${MAX_PRIORITY_TASKS})`;
        checklistPriorityCount.classList.toggle('is-active', priorityCount > 0 && priorityCount < 3);
        checklistPriorityCount.classList.toggle('is-done', priorityCount >= 3);
    }

    if (checklistScheduleCount) {
        checklistScheduleCount.textContent = `2. 고정 블록에 배치하기 (${scheduledPriorityCount}/${priorityCount || 0})`;
        checklistScheduleCount.classList.toggle('is-active', scheduledPriorityCount > 0 && scheduledPriorityCount < priorityCount);
        checklistScheduleCount.classList.toggle('is-done', priorityCount > 0 && scheduledPriorityCount >= priorityCount);
    }

    if (checklistExecute) {
        checklistExecute.textContent = `3. 오늘 일정에서 실행하기 (${completedScheduledPriorityCount}/${scheduledPriorityCount})`;
        checklistExecute.classList.toggle('is-active', scheduledPriorityCount > 0 && completedScheduledPriorityCount < scheduledPriorityCount);
        checklistExecute.classList.toggle('is-done', scheduledPriorityCount > 0 && completedScheduledPriorityCount >= scheduledPriorityCount);
    }
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

    SCHEDULING_BLOCKS.forEach((block) => {
        const task = state.tasks.find(t => t.scheduledDate === selectedDateStr && t.scheduledTime === block.start);
        const blockEl = document.createElement('div');
        blockEl.className = `timeline-block ${block.buffer ? 'buffer-block' : ''}`;
        blockEl.innerHTML = `
            <div class="timeline-block-header">
                <div class="timeline-block-title">
                    <span class="timeline-block-name">${block.title}</span>
                    <span class="timeline-block-time">${formatTime12(block.start)} - ${formatTime12(block.end)}</span>
                </div>
                <span class="timeline-block-badge">${block.tag}</span>
            </div>
            <p class="timeline-block-description">${block.description}</p>
            ${task ? `
            <div class="task-block">
                <h3>${task.title}</h3>
                <div class="task-block-meta">
                    <i class="far fa-flag"></i>
                    <button class="task-remove-btn" onclick="unscheduleTask('${task.id}')" aria-label="배치 해제">
                        <i class="fas fa-xmark"></i>
                    </button>
                    <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}')"
                         style="background: ${task.status === 'completed' ? 'var(--primary-color)' : 'transparent'}"></div>
                </div>
            </div>` : '<div class="timeline-empty">아직 배치된 할 일이 없습니다.</div>'}
        `;
        timelineEl.appendChild(blockEl);
    });
}

function toggleTaskStatus(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.status = task.status === 'completed' ? 'pending' : 'completed';
        saveData();
    }
}

function unscheduleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.scheduledTime = null;
        task.scheduledDate = null;
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

    SCHEDULING_BLOCKS.forEach((block) => {
        const slot = document.createElement('div');
        slot.className = `time-slot drop-zone block-slot ${block.buffer ? 'buffer-slot' : ''}`;
        slot.setAttribute('data-time', block.start);
        slot.innerHTML = `
            <div class="block-slot-header">
                <div class="block-slot-title">
                    <span class="block-slot-name">${block.title}</span>
                    <span class="block-slot-time">${formatTime12(block.start)} - ${formatTime12(block.end)}</span>
                </div>
                <span class="block-slot-badge">${block.tag}</span>
            </div>
            <p class="block-slot-description">${block.description}</p>
        `;

        const task = state.tasks.find(t => t.scheduledDate === selectedDateStr && t.scheduledTime === block.start);
        if (task) {
            slot.innerHTML += `
                <div class="task-item-embedded scheduled-task-chip">
                    <span>${task.title}</span>
                    <button class="task-remove-btn" onclick="unscheduleTask('${task.id}')" aria-label="배치 해제">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>
            `;
        }

        container.appendChild(slot);

        new Sortable(slot, {
            group: { name: 'scheduling', pull: false, put: true },
            sort: false,
            onAdd: function (evt) {
                const taskId = evt.item.getAttribute('data-id');
                const time = slot.getAttribute('data-time');
                const task = state.tasks.find(t => t.id === taskId);

                if (task) {
                    const dateStr = getDateString(state.selectedDate);
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
    const sourceListId = evt.from.id;
    const task = state.tasks.find(t => t.id === itemId);

    if (task) {
        if (targetListId === 'priority-list' && sourceListId !== 'priority-list') {
            const priorityCount = state.tasks.filter(t => t.priority === 'high').length;
            if (priorityCount >= MAX_PRIORITY_TASKS) {
                alert(`오늘의 핵심은 최대 ${MAX_PRIORITY_TASKS}개까지 선택할 수 있습니다.`);
                updateUI();
                return;
            }
        }

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
