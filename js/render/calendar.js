import { SCHEDULING_BLOCKS, state, refreshUI } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { formatTime12, getDateString, getStartOfWeek, isSameDate } from "../lib/date.js";

let plannerTransitionTimer = null;

function triggerPlannerWeekTransition() {
    const targets = document.querySelectorAll(".planner-header-card, .schedule-status-bar, .schedule-layout");

    if (!targets.length) {
        return;
    }

    if (plannerTransitionTimer) {
        window.clearTimeout(plannerTransitionTimer);
    }

    targets.forEach((target) => target.classList.remove("is-week-transitioning"));

    window.requestAnimationFrame(() => {
        targets.forEach((target) => target.classList.add("is-week-transitioning"));

        plannerTransitionTimer = window.setTimeout(() => {
            targets.forEach((target) => target.classList.remove("is-week-transitioning"));
        }, 220);
    });
}

function renderWeekCalendar(targetId, options = {}) {
    const calendarElement = document.getElementById(targetId);

    if (!calendarElement) {
        return;
    }

    const { compact = false } = options;

    calendarElement.innerHTML = "";
    calendarElement.classList.toggle("week-calendar-compact", compact);

    const startOfWeek = getStartOfWeek(state.selectedDate);
    const dayNames = compact
        ? ["월", "화", "수", "목", "금", "토", "일"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let index = 0; index < 7; index += 1) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + index);

        const isSelected = isSameDate(date, state.selectedDate);
        const dayElement = document.createElement("button");
        dayElement.type = "button";
        dayElement.className = `day-column ${compact ? "day-column-compact" : ""} ${isSelected ? "active" : ""}`.trim();
        dayElement.setAttribute("data-action", "select-date");
        dayElement.setAttribute("data-date", getDateString(date));
        dayElement.setAttribute("aria-label", date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" }));
        dayElement.setAttribute("aria-pressed", isSelected ? "true" : "false");

        if (isSelected) {
            dayElement.setAttribute("aria-current", "date");
        }

        dayElement.innerHTML = `
            <span class="day-name">${dayNames[index]}</span>
            <span class="day-number">${date.getDate()}</span>
        `;

        calendarElement.appendChild(dayElement);
    }
}

export function selectCalendarDate(dateString, shouldAnnounce = true) {
    const nextDate = new Date(dateString);

    if (Number.isNaN(nextDate.getTime())) {
        return;
    }

    state.selectedDate = nextDate;
    refreshUI();
    triggerPlannerWeekTransition();

    if (shouldAnnounce) {
        announceStatus(`${state.selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })} 일정을 확인합니다.`, "info");
    }
}

export function shiftSelectedWeek(direction) {
    const nextDate = new Date(state.selectedDate);
    const diff = direction === "prev" ? -7 : 7;

    nextDate.setDate(nextDate.getDate() + diff);
    state.selectedDate = nextDate;
    state.currentDate = new Date(nextDate);
    refreshUI();
    triggerPlannerWeekTransition();
    announceStatus(`${state.selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })} 주차를 확인합니다.`, "info");
}

export function renderCalendar() {
    state.currentDate = new Date(state.selectedDate);
    renderWeekCalendar("week-calendar");
    renderWeekCalendar("schedule-week-calendar", { compact: true });

    const timelineHeader = document.getElementById("timeline-date-header");
    const scheduleSelectedDate = document.getElementById("schedule-selected-date");

    if (timelineHeader) {
        const options = { weekday: "long", day: "numeric", month: "long" };
        timelineHeader.textContent = state.selectedDate.toLocaleDateString("ko-KR", options);
    }

    if (scheduleSelectedDate) {
        const options = { weekday: "long", day: "numeric", month: "long" };
        scheduleSelectedDate.textContent = state.selectedDate.toLocaleDateString("ko-KR", options);
    }
}

export function renderScheduleList() {
    const listElement = document.getElementById("schedule-list");

    if (!listElement) {
        return;
    }

    listElement.innerHTML = "";

    const selectedDate = getDateString(state.selectedDate);
    const scheduledTasks = SCHEDULING_BLOCKS.map((block) => {
        const task = state.tasks.find((item) => item.scheduledDate === selectedDate && item.scheduledTime === block.start);
        return task ? { block, task } : null;
    }).filter(Boolean);

    if (scheduledTasks.length === 0) {
        listElement.innerHTML = '<p class="schedule-empty-message">선택한 날짜에 배치된 고정 블록 일정이 없습니다.</p>';
        return;
    }

    scheduledTasks.forEach(({ block, task }) => {
        const itemElement = document.createElement("div");
        itemElement.className = `schedule-item ${block.buffer ? "buffer-item" : ""}`;
        itemElement.innerHTML = `
            <div class="schedule-info">
                <div class="schedule-block-label">${block.title}</div>
                <h3>${task.title}</h3>
                <span class="schedule-time"><i class="far fa-clock"></i>${formatTime12(block.start)} - ${formatTime12(block.end)}</span>
            </div>
            <div class="schedule-meta">
                <i class="far fa-flag"></i>
                <span class="status ${task.status === "completed" ? "upcoming" : "pending"}">
                    ${task.status === "completed" ? "완료" : "진행 전"}
                </span>
            </div>
        `;
        listElement.appendChild(itemElement);
    });
}
