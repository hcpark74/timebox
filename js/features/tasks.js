import { MAX_PRIORITY_TASKS, refreshUI, state } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { saveData } from "../services/sync.js";

function findTaskIndex(taskId) {
    return state.tasks.findIndex((task) => task.id === taskId);
}

function insertTaskAt(tasks, task, index) {
    tasks.splice(index, 0, task);
}

function getLastIndexByPriority(tasks, priority) {
    let index = -1;

    tasks.forEach((task, taskIndex) => {
        if (task.priority === priority) {
            index = taskIndex;
        }
    });

    return index;
}

function getAdjacentTaskIndex(taskId, direction) {
    const currentIndex = findTaskIndex(taskId);

    if (currentIndex === -1) {
        return -1;
    }

    const currentTask = state.tasks[currentIndex];
    const step = direction === "up" ? -1 : 1;

    for (let index = currentIndex + step; index >= 0 && index < state.tasks.length; index += step) {
        if (state.tasks[index].priority === currentTask.priority) {
            return index;
        }
    }

    return -1;
}

function canMoveTaskToPriority(targetPriority) {
    if (targetPriority !== "high") {
        return true;
    }

    const priorityCount = state.tasks.filter((task) => task.priority === "high").length;

    if (priorityCount >= MAX_PRIORITY_TASKS) {
        alert(`오늘의 핵심은 최대 ${MAX_PRIORITY_TASKS}개까지 선택할 수 있습니다.`);
        refreshUI();
        announceStatus(`오늘의 핵심은 최대 ${MAX_PRIORITY_TASKS}개까지 선택할 수 있습니다.`, "warning");
        return false;
    }

    return true;
}

function moveTaskToPriorityGroup(task, targetPriority) {
    const currentIndex = findTaskIndex(task.id);

    if (currentIndex === -1) {
        return false;
    }

    const nextTasks = [...state.tasks];
    nextTasks.splice(currentIndex, 1);
    task.priority = targetPriority;

    const lastIndex = getLastIndexByPriority(nextTasks, targetPriority);
    const insertIndex = lastIndex === -1 ? (targetPriority === "high" ? 0 : nextTasks.length) : lastIndex + 1;
    insertTaskAt(nextTasks, task, insertIndex);
    state.tasks = nextTasks;
    return true;
}

export async function addNewTask() {
    const input = document.getElementById("new-task-input");

    if (!input) {
        return;
    }

    const title = input.value.trim();

    if (!title) {
        return;
    }

    state.tasks.push({
        id: `t${Date.now()}`,
        title,
        category: "personal",
        status: "pending",
        priority: "medium",
        scheduledTime: null,
        scheduledDate: null
    });

    input.value = "";
    await saveData();
    announceStatus(`할 일 '${title}'을 추가했습니다.`, "success");
}

export async function deleteTask(id, event) {
    if (event) {
        event.stopPropagation();
    }

    if (!confirm("이 할 일을 삭제할까요?")) {
        return;
    }

    const task = state.tasks.find((item) => item.id === id);
    state.tasks = state.tasks.filter((item) => item.id !== id);
    await saveData();
    announceStatus(`할 일 '${task?.title || "항목"}'을 삭제했습니다.`, "danger");
}

export async function onReorder(evt) {
    const itemId = evt.item.getAttribute("data-id");
    const targetListId = evt.to.id;
    const sourceListId = evt.from.id;
    const task = state.tasks.find((item) => item.id === itemId);

    if (!task) {
        return;
    }

    if (targetListId === "priority-list" && sourceListId !== "priority-list") {
        if (!canMoveTaskToPriority("high")) {
            return;
        }
    }

    task.priority = targetListId === "priority-list" ? "high" : "medium";
    await saveData();
    announceStatus(task.priority === "high"
        ? `할 일 '${task.title}'을 오늘의 핵심으로 옮겼습니다.`
        : `할 일 '${task.title}'을 할 일 목록으로 옮겼습니다.`, "success");
}

export async function moveTaskWithinList(taskId, direction) {
    const currentIndex = findTaskIndex(taskId);

    if (currentIndex === -1) {
        return;
    }

    const adjacentIndex = getAdjacentTaskIndex(taskId, direction);

    if (adjacentIndex === -1) {
        return;
    }

    const task = state.tasks[currentIndex];
    const otherTask = state.tasks[adjacentIndex];
    state.tasks[currentIndex] = otherTask;
    state.tasks[adjacentIndex] = task;
    await saveData();
    announceStatus(`할 일 '${task.title}'을 ${direction === "up" ? "위" : "아래"}로 이동했습니다.`, "success");
}

export async function moveTaskToBucket(taskId, targetPriority) {
    const task = state.tasks.find((item) => item.id === taskId);

    if (!task || task.priority === targetPriority) {
        return;
    }

    if (!canMoveTaskToPriority(targetPriority)) {
        return;
    }

    if (!moveTaskToPriorityGroup(task, targetPriority)) {
        return;
    }

    await saveData();
    announceStatus(targetPriority === "high"
        ? `할 일 '${task.title}'을 오늘의 핵심으로 옮겼습니다.`
        : `할 일 '${task.title}'을 할 일 목록으로 옮겼습니다.`, "success");
}
