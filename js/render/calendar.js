import { SCHEDULING_BLOCKS, state, refreshUI } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { formatTime12, getDateString, getStartOfWeek, isSameDate } from "../lib/date.js";

export function selectCalendarDate(dateString, shouldAnnounce = true) {
    const nextDate = new Date(dateString);

    if (Number.isNaN(nextDate.getTime())) {
        return;
    }

    state.selectedDate = nextDate;
    refreshUI();

    if (shouldAnnounce) {
        announceStatus(`${state.selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })} 일정을 확인합니다.`);
    }
}

export function renderCalendar() {
    const calendarElement = document.getElementById("week-calendar");

    if (!calendarElement) {
        return;
    }

    calendarElement.innerHTML = "";

    const startOfWeek = getStartOfWeek(state.currentDate);
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let index = 0; index < 7; index += 1) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + index);

        const isSelected = isSameDate(date, state.selectedDate);
        const dayElement = document.createElement("button");
        dayElement.type = "button";
        dayElement.className = `day-column ${isSelected ? "active" : ""}`;
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

    const timelineHeader = document.getElementById("timeline-date-header");

    if (timelineHeader) {
        const options = { weekday: "long", day: "numeric", month: "long" };
        timelineHeader.textContent = state.selectedDate.toLocaleDateString("ko-KR", options);
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
