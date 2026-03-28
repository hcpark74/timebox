import { state } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { getDateString } from "../lib/date.js";
import { saveData } from "../services/sync.js";
import { onReorder } from "./tasks.js";

export async function toggleTaskStatus(id) {
    const task = state.tasks.find((item) => item.id === id);

    if (!task) {
        return;
    }

    task.status = task.status === "completed" ? "pending" : "completed";
    await saveData();
    announceStatus(task.status === "completed"
        ? `할 일 '${task.title}'을 완료로 표시했습니다.`
        : `할 일 '${task.title}'의 완료를 해제했습니다.`);
}

export async function unscheduleTask(id) {
    const task = state.tasks.find((item) => item.id === id);

    if (!task) {
        return;
    }

    task.scheduledTime = null;
    task.scheduledDate = null;
    await saveData();
    announceStatus(`할 일 '${task.title}' 배치를 해제했습니다.`);
}

export async function scheduleTaskToBlock(taskId, time) {
    const task = state.tasks.find((item) => item.id === taskId);

    if (!task || !time) {
        return;
    }

    const selectedDate = getDateString(state.selectedDate);

    let replacedTaskTitle = null;

    state.tasks.forEach((item) => {
        if (item.scheduledDate === selectedDate && item.scheduledTime === time) {
            replacedTaskTitle = item.title;
            item.scheduledTime = null;
            item.scheduledDate = null;
        }
    });

    task.scheduledTime = time;
    task.scheduledDate = selectedDate;
    await saveData();
    announceStatus(replacedTaskTitle
        ? `할 일 '${task.title}'을 ${time} 블록에 배치하고 '${replacedTaskTitle}'을 해제했습니다.`
        : `할 일 '${task.title}'을 ${time} 블록에 배치했습니다.`);
}

export async function clearBlockByTime(time) {
    if (!time) {
        return;
    }

    const selectedDate = getDateString(state.selectedDate);
    const task = state.tasks.find((item) => item.scheduledDate === selectedDate && item.scheduledTime === time);

    if (!task) {
        return;
    }

    task.scheduledTime = null;
    task.scheduledDate = null;
    await saveData();
    announceStatus(`할 일 '${task.title}'을 ${time} 블록에서 해제했습니다.`);
}

export async function resetSchedule() {
    const selectedDate = getDateString(state.selectedDate);
    let resetCount = 0;

    state.tasks.forEach((task) => {
        if (task.scheduledDate === selectedDate) {
            task.scheduledTime = null;
            task.scheduledDate = null;
            resetCount += 1;
        }
    });

    await saveData();

    if (resetCount > 0) {
        announceStatus(`선택한 날짜의 일정 ${resetCount}개를 초기화했습니다.`);
    }
}

export function initDragAndDrop() {
    const priorityList = document.getElementById("priority-list");
    const backlogList = document.getElementById("backlog-list");

    if (priorityList) {
        new Sortable(priorityList, {
            group: "shared",
            animation: 150,
            onEnd: onReorder
        });
    }

    if (backlogList) {
        new Sortable(backlogList, {
            group: "shared",
            animation: 150,
            onEnd: onReorder
        }
        );
    }
}
