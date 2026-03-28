import { state, STORAGE_KEY, SYNC_ID_KEY } from "../state/store.js";

export function loadLocalTasks() {
    const localData = localStorage.getItem(STORAGE_KEY);

    if (!localData) {
        return false;
    }

    const parsed = JSON.parse(localData);
    state.tasks = parsed.tasks || [];
    state.user = {
        ...state.user,
        ...(parsed.user || {})
    };
    return true;
}

export function saveLocalTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks: state.tasks,
        user: state.user
    }));
}

export function loadStoredSyncId() {
    return localStorage.getItem(SYNC_ID_KEY);
}

export function saveStoredSyncId(syncId) {
    localStorage.setItem(SYNC_ID_KEY, syncId);
}
