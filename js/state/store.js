export const state = {
    currentDate: new Date(),
    selectedDate: new Date(),
    tasks: [],
    syncId: null,
    user: {
        name: "Jayraj",
        profilePic: "assets/profile.svg"
    }
};

export const STORAGE_KEY = "timebox_app_data";
export const SYNC_ID_KEY = "timebox_sync_id";
export const MAX_PRIORITY_TASKS = 4;
export const SCHEDULING_BLOCKS = [
    { start: "09:00", end: "11:30", title: "핵심 블록 1", description: "가장 중요한 일 한 가지에 깊게 집중하세요.", tag: "집중" },
    { start: "13:00", end: "15:00", title: "핵심 블록 2", description: "오후 첫 집중 시간을 대표 작업에 배정하세요.", tag: "집중" },
    { start: "15:00", end: "17:00", title: "핵심 블록 3", description: "남은 핵심 작업이나 후속 작업을 이어서 진행하세요.", tag: "집중" },
    { start: "17:00", end: "18:00", title: "버퍼 블록", description: "밀린 일 정리, 마무리, 예상 밖 작업 처리에 활용하세요.", tag: "버퍼", buffer: true }
];

let uiUpdater = () => {};

export function registerUIUpdater(fn) {
    uiUpdater = fn;
}

export function refreshUI() {
    uiUpdater();
}
