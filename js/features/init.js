import { registerUIUpdater } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { selectCalendarDate, shiftSelectedWeek } from "../render/calendar.js";
import { updateUI } from "../render/index.js";
import { toggleBacklogSection } from "../render/tasks.js";
import { copySyncId, editSyncId, initSyncId, loadData } from "../services/sync.js";
import { addNewTask, deleteTask, moveTaskToBucket, moveTaskWithinList } from "./tasks.js";
import { clearBlockByTime, initDragAndDrop, resetSchedule, scheduleTaskToBlock, toggleTaskStatus, unscheduleTask } from "./schedule.js";
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
            case "shift-week":
                shiftSelectedWeek(actionTarget.dataset.direction);
                break;
            case "noop":
                event.preventDefault();
                break;
            case "add-task":
                await addNewTask();
                break;
            case "assign-selected-to-block": {
                const blockTime = actionTarget.dataset.time;
                const scheduleSelect = document.querySelector(`#planner-slot-select-${CSS.escape(blockTime)}`);
                const selectedTaskId = scheduleSelect?.value;

                if (!selectedTaskId) {
                    announceStatus("먼저 배정할 오늘의 핵심을 선택하세요.");
                    scheduleSelect?.focus();
                    break;
                }

                await scheduleTaskToBlock(selectedTaskId, blockTime);
                break;
            }
            case "clear-block":
                await clearBlockByTime(actionTarget.dataset.time);
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
            case "scroll-to-unassigned": {
                const firstOpenBlock = document.querySelector(".planner-slot:not(.buffer-slot) .planner-slot-current:not(.is-filled)")
                    || document.querySelector(".planner-slot .planner-slot-controls");

                if (!firstOpenBlock) {
                    announceStatus("현재 바로 배정할 블록이 없습니다.");
                    break;
                }

                firstOpenBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
                const selectElement = firstOpenBlock.closest(".planner-slot")?.querySelector(".schedule-select");
                selectElement?.focus();
                announceStatus("배정이 필요한 블록으로 이동했습니다.");
                break;
            }
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
