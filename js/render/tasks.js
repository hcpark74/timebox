import { MAX_PRIORITY_TASKS, state } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { getDateString } from "../lib/date.js";

let isBacklogExpanded = false;

export function toggleBacklogSection() {
    isBacklogExpanded = !isBacklogExpanded;
    renderTaskLists();
    announceStatus(isBacklogExpanded ? "할 일 목록을 펼쳤습니다." : "할 일 목록을 접었습니다.");
}

export function renderTaskLists() {
    const prioritySectionElement = document.getElementById("priority-section");
    const priorityHintElement = document.getElementById("priority-limit-hint");
    const openSchedulerButton = document.getElementById("open-scheduler-btn");
    const checklistPriorityCount = document.getElementById("checklist-priority-count");
    const checklistScheduleCount = document.getElementById("checklist-schedule-count");
    const checklistExecute = document.getElementById("checklist-execute");
    const priorityElement = document.getElementById("priority-list");
    const backlogElement = document.getElementById("backlog-list");
    const backlogToggle = document.querySelector('[data-action="toggle-backlog"]');
    const backlogToggleCount = document.getElementById("backlog-toggle-count");
    const scheduleStatusPriority = document.getElementById("schedule-status-priority");
    const scheduleStatusAssigned = document.getElementById("schedule-status-assigned");
    const scheduleStatusUnassigned = document.getElementById("schedule-status-unassigned");

    if (!priorityElement || !backlogElement) {
        return;
    }

    priorityElement.innerHTML = "";
    backlogElement.innerHTML = "";
    const priorityTasks = state.tasks.filter((task) => task.priority === "high");
    const backlogTasks = state.tasks.filter((task) => task.priority !== "high");

    state.tasks.forEach((task) => {
        const isPriorityTask = task.priority === "high";
        const siblingTasks = isPriorityTask ? priorityTasks : backlogTasks;
        const siblingIndex = siblingTasks.findIndex((item) => item.id === task.id);
        const isFirstInList = siblingIndex <= 0;
        const isLastInList = siblingIndex === siblingTasks.length - 1;
        const moveUpLabel = isFirstInList ? "이미 첫 항목입니다" : "위로 이동";
        const moveDownLabel = isLastInList ? "이미 마지막 항목입니다" : "아래로 이동";
        const manualControlsMarkup = isPriorityTask ? `
            <div class="task-actions" aria-label="할 일 이동 제어">
                <button type="button" class="icon-button task-move-button" data-action="move-task-up" data-task-id="${task.id}" aria-label="${moveUpLabel}" ${isFirstInList ? "disabled" : ""}>
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button type="button" class="icon-button task-move-button" data-action="move-task-down" data-task-id="${task.id}" aria-label="${moveDownLabel}" ${isLastInList ? "disabled" : ""}>
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        ` : "";
        const taskMarkup = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="task-icon"><i class="fas fa-briefcase"></i></div>
            <span class="task-name">${task.title}</span>
            ${manualControlsMarkup}
            <button type="button" class="icon-button task-bucket-button" data-action="move-task-bucket" data-task-id="${task.id}" data-target-priority="${isPriorityTask ? "medium" : "high"}" aria-label="${isPriorityTask ? "할 일 목록으로 이동" : "오늘의 핵심으로 이동"}">
                <i class="fas ${isPriorityTask ? "fa-arrow-right-from-bracket" : "fa-star"}"></i>
            </button>
            <button type="button" class="icon-button delete-task-button" data-action="delete-task" data-task-id="${task.id}" aria-label="할 일 삭제">
                <i class="fas fa-trash"></i>
            </button>
        `;

        const taskElement = document.createElement("div");
        taskElement.className = "task-item";
        taskElement.setAttribute("data-id", task.id);
        taskElement.innerHTML = taskMarkup;

        if (task.priority === "high") {
            priorityElement.appendChild(taskElement.cloneNode(true));
        } else {
            backlogElement.appendChild(taskElement.cloneNode(true));
        }
    });

    const priorityCount = state.tasks.filter((task) => task.priority === "high").length;
    const backlogCount = backlogTasks.length;
    const selectedDate = getDateString(state.selectedDate);
    const scheduledPriorityCount = state.tasks.filter((task) => task.priority === "high" && task.scheduledDate === selectedDate && task.scheduledTime).length;
    const completedScheduledPriorityCount = state.tasks.filter((task) => task.priority === "high" && task.scheduledDate === selectedDate && task.scheduledTime && task.status === "completed").length;
    const unassignedPriorityCount = priorityTasks.filter((task) => !(task.scheduledDate === selectedDate && task.scheduledTime)).length;
    const isPriorityFull = priorityCount >= MAX_PRIORITY_TASKS;

    if (prioritySectionElement) {
        prioritySectionElement.classList.toggle("priority-full", isPriorityFull);
    }

    if (backlogToggle) {
        backlogToggle.setAttribute("aria-expanded", isBacklogExpanded ? "true" : "false");
        backlogToggle.classList.toggle("is-open", isBacklogExpanded);
    }

    if (backlogToggleCount) {
        backlogToggleCount.textContent = backlogCount > 0 ? `${backlogCount}개` : "비어 있음";
    }

    if (backlogToggle) {
        backlogToggle.setAttribute(
            "aria-label",
            backlogCount > 0
                ? `할 일 목록 ${backlogCount}개 ${isBacklogExpanded ? "접기" : "펼치기"}`
                : "할 일 목록 비어 있음"
        );
    }

    backlogElement.classList.toggle("hidden", !isBacklogExpanded);

    if (scheduleStatusPriority) {
        scheduleStatusPriority.textContent = `핵심 ${priorityCount}개`;
    }

    if (scheduleStatusAssigned) {
        scheduleStatusAssigned.textContent = `배치 ${scheduledPriorityCount}개`;
        scheduleStatusAssigned.classList.toggle("is-strong", scheduledPriorityCount > 0);
    }

    if (scheduleStatusUnassigned) {
        scheduleStatusUnassigned.textContent = `미배정 ${unassignedPriorityCount}개`;
        scheduleStatusUnassigned.classList.toggle("is-warning", unassignedPriorityCount > 0);
    }

    if (priorityHintElement) {
        if (isPriorityFull) {
            priorityHintElement.textContent = `오늘의 핵심이 가득 찼습니다. 최대 ${MAX_PRIORITY_TASKS}개까지 선택할 수 있습니다.`;
        } else if (priorityCount === 0) {
            priorityHintElement.textContent = "오늘의 핵심을 1개 이상 선택하면 시간 배치를 시작할 수 있습니다.";
        } else if (priorityCount < 3) {
            priorityHintElement.textContent = "지금도 배치할 수 있지만, 오늘의 핵심을 3개 이상 고르면 하루 흐름이 더 안정적입니다.";
        } else {
            priorityHintElement.textContent = "좋아요. 지금 상태로 시간 블록에 배치하면 됩니다.";
        }
    }

    if (openSchedulerButton) {
        const isReadyToSchedule = priorityCount >= 3;
        openSchedulerButton.disabled = priorityCount === 0;
        openSchedulerButton.classList.toggle("btn-ready", isReadyToSchedule);
        openSchedulerButton.textContent = priorityCount === 0
            ? "오늘의 핵심을 먼저 선택하세요"
            : "시간 배치하기";
    }

    if (checklistPriorityCount) {
        checklistPriorityCount.textContent = `1. 오늘의 핵심 고르기 (${priorityCount}/${MAX_PRIORITY_TASKS})`;
        checklistPriorityCount.classList.toggle("is-active", priorityCount > 0 && priorityCount < 3);
        checklistPriorityCount.classList.toggle("is-done", priorityCount >= 3);
    }

    if (checklistScheduleCount) {
        checklistScheduleCount.textContent = `2. 고정 블록에 배치하기 (${scheduledPriorityCount}/${priorityCount || 0})`;
        checklistScheduleCount.classList.toggle("is-active", scheduledPriorityCount > 0 && scheduledPriorityCount < priorityCount);
        checklistScheduleCount.classList.toggle("is-done", priorityCount > 0 && scheduledPriorityCount >= priorityCount);
    }

    if (checklistExecute) {
        checklistExecute.textContent = `3. 오늘 일정에서 실행하기 (${completedScheduledPriorityCount}/${scheduledPriorityCount})`;
        checklistExecute.classList.toggle("is-active", scheduledPriorityCount > 0 && completedScheduledPriorityCount < scheduledPriorityCount);
        checklistExecute.classList.toggle("is-done", scheduledPriorityCount > 0 && completedScheduledPriorityCount >= scheduledPriorityCount);
    }
}

export function renderCategoryCounts() {
    const counts = { personal: 0, meet: 0, event: 0, work: 0 };

    state.tasks.forEach((task) => {
        if (counts[task.category] !== undefined) {
            counts[task.category] += 1;
        }
    });

    const personal = document.getElementById("cat-personal-count");
    const meet = document.getElementById("cat-meet-count");
    const event = document.getElementById("cat-event-count");
    const work = document.getElementById("cat-work-count");

    if (personal) personal.innerText = `${counts.personal}개`;
    if (meet) meet.innerText = `${counts.meet}개`;
    if (event) event.innerText = `${counts.event}개`;
    if (work) work.innerText = `${counts.work}개`;
}
