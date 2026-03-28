let liveRegionClearTimer = null;

export function announceStatus(message) {
    const liveRegion = document.getElementById("app-status");

    if (!liveRegion || !message) {
        return;
    }

    liveRegion.textContent = "";

    if (liveRegionClearTimer) {
        window.clearTimeout(liveRegionClearTimer);
    }

    window.setTimeout(() => {
        liveRegion.textContent = message;
    }, 20);

    liveRegionClearTimer = window.setTimeout(() => {
        liveRegion.textContent = "";
    }, 1500);
}
