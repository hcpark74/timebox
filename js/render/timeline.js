import { SCHEDULING_BLOCKS, state } from "../state/store.js";
import { formatTime12, getDateString } from "../lib/date.js";
import { scheduleTaskToBlock } from "../features/schedule.js";

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

    SCHEDULING_BLOCKS.forEach((block) => {
        const slot = document.createElement("div");
        slot.className = `time-slot drop-zone block-slot ${block.buffer ? "buffer-slot" : ""}`;
        slot.setAttribute("data-time", block.start);
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

        const task = state.tasks.find((item) => item.scheduledDate === selectedDate && item.scheduledTime === block.start);

        if (task) {
            slot.innerHTML += `
                <div class="task-item-embedded scheduled-task-chip">
                    <div class="scheduled-task-content">
                        <span>${task.title}</span>
                        <div class="scheduled-task-controls">
                            <label class="sr-only" for="scheduled-move-${task.id}">${task.title} 이동 블록 선택</label>
                            <select id="scheduled-move-${task.id}" class="schedule-select schedule-select-inline" data-task-id="${task.id}" aria-label="${task.title} 이동 블록 선택">
                                ${SCHEDULING_BLOCKS.map((optionBlock) => `
                                    <option value="${optionBlock.start}" ${optionBlock.start === block.start ? "selected" : ""}>
                                        ${optionBlock.title} (${formatTime12(optionBlock.start)})
                                    </option>
                                `).join("")}
                            </select>
                            <button type="button" class="schedule-assign-button schedule-move-button" data-action="move-scheduled-task" data-task-id="${task.id}" aria-label="${task.title} 다른 블록으로 이동">이동</button>
                        </div>
                    </div>
                    <button type="button" class="task-remove-btn" data-action="unschedule-task" data-task-id="${task.id}" aria-label="배치 해제">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>
            `;
        }

        container.appendChild(slot);

        new Sortable(slot, {
            group: { name: "scheduling", pull: false, put: true },
            sort: false,
            onAdd(evt) {
                const taskId = evt.item.getAttribute("data-id");
                const time = slot.getAttribute("data-time");
                scheduleTaskToBlock(taskId, time);
            }
        });
    });
}
