import { refreshUI, state } from "../state/store.js";
import { announceStatus } from "../lib/a11y.js";
import { loadLocalTasks, loadStoredSyncId, saveLocalTasks, saveStoredSyncId } from "./storage.js";

function updateSyncUI() {
    const display = document.getElementById("sync-id-display");

    if (display) {
        display.innerText = state.syncId;
    }
}

function getDefaultTasks() {
    return [
        { id: "t1", title: "팀 미팅", category: "work", status: "pending", priority: "high", scheduledTime: null, scheduledDate: null },
        { id: "t2", title: "장보기", category: "personal", status: "pending", priority: "medium", scheduledTime: null, scheduledDate: null }
    ];
}

function calculateDailyActivity() {
    const completedCount = state.tasks.filter((task) => task.status === "completed").length;
    return Math.min(completedCount, 4);
}

export function initSyncId() {
    let syncId = loadStoredSyncId();

    if (!syncId) {
        syncId = `user-${Math.random().toString(36).slice(2, 11)}`;
        saveStoredSyncId(syncId);
    }

    state.syncId = syncId;
    updateSyncUI();
}

export async function loadData() {
    const hasLocalData = loadLocalTasks();

    if (hasLocalData) {
        refreshUI();
    }

    try {
        const response = await fetch(`/api/data?id=${state.syncId}&date=global`);

        if (response.ok) {
            const data = await response.json();

            if (data && Array.isArray(data)) {
                state.tasks = data;
                await saveData(false);
                refreshUI();
            }
        }
    } catch (error) {
        console.error("Sync failed:", error);
    }

    if (!state.tasks.length && !hasLocalData) {
        state.tasks = getDefaultTasks();
        await saveData();
    }
}

export async function saveData(sync = true) {
    saveLocalTasks();

    if (sync) {
        try {
            await fetch("/api/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: state.syncId,
                    date: "global",
                    data: state.tasks,
                    level: calculateDailyActivity()
                })
            });
        } catch (error) {
            console.error("Save sync failed:", error);
        }
    }

    refreshUI();
}

export async function editSyncId() {
    const nextSyncId = prompt("다른 기기와 연결할 동기화 ID를 입력하세요:", state.syncId);

    if (!nextSyncId || nextSyncId === state.syncId) {
        return;
    }

    state.syncId = nextSyncId;
    saveStoredSyncId(nextSyncId);
    updateSyncUI();
    await loadData();
    announceStatus("동기화 ID를 변경했습니다.", "info");
}

export function copySyncId() {
    navigator.clipboard.writeText(state.syncId);
    announceStatus("동기화 ID를 복사했습니다.", "info");
}
