import { SCHEDULING_BLOCKS, state } from "../state/store.js";
import { formatTime12, getDateString } from "../lib/date.js";

export function renderTimeline() {
    const timelineElement = document.getElementById("timeline-view");

    if (!timelineElement) {
        return;
    }

    timelineElement.innerHTML = "";

    const selectedDate = getDateString(state.selectedDate);

    SCHEDULING_BLOCKS.forEach((block) => {
        const task = state.tasks.find((item) => item.scheduledDate === selectedDate && item.scheduledTime === block.start);
        const blockElement = document.createElement("div");
        blockElement.className = `timeline-block ${block.buffer ? "buffer-block" : ""}`;
        blockElement.innerHTML = `
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
                    <button type="button" class="task-remove-btn" data-action="unschedule-task" data-task-id="${task.id}" aria-label="배치 해제">
                        <i class="fas fa-xmark"></i>
                    </button>
                    <button type="button" class="task-checkbox" data-action="toggle-task-status" data-task-id="${task.id}" aria-label="${task.status === "completed" ? "완료 해제" : "완료 처리"}" aria-pressed="${task.status === "completed" ? "true" : "false"}"></button>
                </div>
            </div>` : '<div class="timeline-empty">아직 배치된 할 일이 없습니다.</div>'}
        `;
        timelineElement.appendChild(blockElement);
    });
}

export function renderTimelineSlots() {
    const container = document.getElementById("timeline-slots");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const selectedDate = getDateString(state.selectedDate);
    const priorityTasks = state.tasks.filter((item) => item.priority === "high");

    SCHEDULING_BLOCKS.forEach((block) => {
        const slot = document.createElement("div");
        slot.className = `time-slot block-slot planner-slot ${block.buffer ? "buffer-slot" : ""}`;
        slot.setAttribute("data-time", block.start);
        const task = state.tasks.find((item) => item.scheduledDate === selectedDate && item.scheduledTime === block.start);
        const optionsMarkup = priorityTasks.length
            ? priorityTasks.map((priorityTask) => `
                <option value="${priorityTask.id}" ${task?.id === priorityTask.id ? "selected" : ""} ${priorityTask.scheduledDate === selectedDate && priorityTask.scheduledTime && priorityTask.scheduledTime !== block.start ? "disabled" : ""}>
                    ${priorityTask.title}${priorityTask.scheduledDate === selectedDate && priorityTask.scheduledTime && priorityTask.scheduledTime !== block.start ? " - 다른 블록에 배정됨" : ""}
                </option>
            `).join("")
            : '<option value="">오늘의 핵심이 없습니다</option>';

        slot.innerHTML = `
            <div class="block-slot-header">
                <div class="block-slot-title">
                    <span class="block-slot-name">${block.title}</span>
                    <span class="block-slot-time">${formatTime12(block.start)} - ${formatTime12(block.end)}</span>
                </div>
                <span class="block-slot-badge">${block.tag}</span>
            </div>
            <p class="block-slot-description">${block.description}</p>
            <div class="planner-slot-current ${task ? "is-filled" : ""}">
                <span class="planner-slot-current-label">현재 배정</span>
                <strong class="planner-slot-current-task">${task ? task.title : "아직 배정된 핵심 할 일이 없습니다."}</strong>
            </div>
            <div class="planner-slot-controls">
                <label class="sr-only" for="planner-slot-select-${block.start}">${block.title}에 배정할 오늘의 핵심 선택</label>
                <select id="planner-slot-select-${block.start}" class="schedule-select" data-time="${block.start}" aria-label="${block.title}에 배정할 오늘의 핵심 선택" ${priorityTasks.length ? "" : "disabled"}>
                    ${task ? "" : '<option value="">핵심 할일 선택</option>'}
                    ${optionsMarkup}
                </select>
                <button type="button" class="schedule-assign-button" data-action="assign-selected-to-block" data-time="${block.start}" ${priorityTasks.length ? "" : "disabled"}>배정</button>
                <button type="button" class="btn-secondary planner-unschedule-button" data-action="clear-block" data-time="${block.start}" ${task ? "" : "disabled"}>해제</button>
            </div>
        `;

        container.appendChild(slot);
    });
}
