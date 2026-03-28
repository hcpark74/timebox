import { announceStatus } from "../lib/a11y.js";
import { state } from "../state/store.js";
import { saveData } from "./sync.js";

export async function editUserName() {
    const nextName = prompt("내 정보 화면에 표시할 이름을 입력하세요:", state.user.name);

    if (!nextName) {
        return;
    }

    const trimmedName = nextName.trim();

    if (!trimmedName || trimmedName === state.user.name) {
        return;
    }

    state.user.name = trimmedName;
    await saveData(false);
    announceStatus(`이름을 '${trimmedName}'(으)로 변경했습니다.`, "success");
}
