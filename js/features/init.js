import { registerUIUpdater } from "../state/store.js";
import { selectCalendarDate } from "../render/calendar.js";
import { updateUI } from "../render/index.js";
import { toggleBacklogSection } from "../render/tasks.js";
import { copySyncId, editSyncId, initSyncId, loadData } from "../services/sync.js";
import { addNewTask, deleteTask, moveTaskToBucket, moveTaskWithinList } from "./tasks.js";
import { initDragAndDrop, resetSchedule, toggleTaskStatus, unscheduleTask } from "./schedule.js";
import { setActiveTab, showPage } from "./navigation.js";

function bindStaticEvents() {
    document.addEventListener("click", async (event) => {
        const actionTarget = event.target.closest("[data-action]");

        if (!actionTarget) {
            return;
        }

        const { action, page, taskId } = actionTarget.dataset;

        switch (action) {
            case "show-page":
                showPage(page);
                break;
            case "switch-tab":
                event.preventDefault();
                showPage(page);
                setActiveTab(actionTarget);
                break;
            case "select-date":
                selectCalendarDate(actionTarget.dataset.date);
                break;
            case "noop":
                event.preventDefault();
                break;
            case "add-task":
                await addNewTask();
                break;
            case "toggle-backlog":
                toggleBacklogSection();
                break;
            case "move-task-up":
                await moveTaskWithinList(taskId, "up");
                break;
            case "move-task-down":
                await moveTaskWithinList(taskId, "down");
                break;
            case "move-task-bucket":
                await moveTaskToBucket(taskId, actionTarget.dataset.targetPriority);
                break;
            case "copy-sync-id":
                copySyncId();
                break;
            case "edit-sync-id":
                await editSyncId();
                break;
            case "reset-schedule":
                await resetSchedule();
                break;
            case "delete-task":
                await deleteTask(taskId, event);
                break;
            case "unschedule-task":
                await unscheduleTask(taskId);
                break;
            case "toggle-task-status":
                await toggleTaskStatus(taskId);
                break;
            default:
                break;
        }
    });

    const newTaskInput = document.getElementById("new-task-input");

    if (newTaskInput) {
        newTaskInput.addEventListener("keydown", async (event) => {
            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();
            await addNewTask();
        });
    }
}

export async function initApp() {
    registerUIUpdater(updateUI);
    bindStaticEvents();
    initSyncId();
    await loadData();
    initDragAndDrop();
    showPage("timeline-page");
}
