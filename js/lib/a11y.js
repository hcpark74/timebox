let liveRegionClearTimer = null;
let toastClearTimer = null;

function clearToastTimer() {
    if (toastClearTimer) {
        window.clearTimeout(toastClearTimer);
        toastClearTimer = null;
    }
}

function hideToast(toast, toastText) {
    if (!toast) {
        return;
    }

    clearToastTimer();
    toast.classList.remove("is-visible");
    toast.setAttribute("aria-hidden", "true");

    window.setTimeout(() => {
        toast.classList.add("hidden");
        if (toastText) {
            toastText.textContent = "";
        }
    }, 220);
}

function getToastMeta(type = "neutral") {
    const toastMetaMap = {
        info: { tone: "info", icon: "i", duration: 1500 },
        success: { tone: "success", icon: "✓", duration: 1400 },
        warning: { tone: "warning", icon: "!", duration: 2200 },
        danger: { tone: "danger", icon: "-", duration: 2400 },
        neutral: { tone: "neutral", icon: "i", duration: 1600 }
    };

    return toastMetaMap[type] || toastMetaMap.neutral;
}

export function announceStatus(message, type = "neutral") {
    const liveRegion = document.getElementById("app-status");
    const toast = document.getElementById("app-toast");
    const toastText = document.getElementById("app-toast-text");
    const toastIcon = document.getElementById("app-toast-icon");

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

    if (!toast) {
        return;
    }

    const { tone, icon, duration } = getToastMeta(type);

    toast.classList.remove("toast-info", "toast-success", "toast-warning", "toast-danger", "toast-neutral");
    toast.classList.add(`toast-${tone}`);
    if (toastText) {
        toastText.textContent = message;
    }
    if (toastIcon) {
        toastIcon.textContent = icon;
    }
    toast.classList.remove("hidden");
    toast.classList.add("is-visible");
    toast.setAttribute("aria-hidden", "false");

    clearToastTimer();

    toastClearTimer = window.setTimeout(() => {
        hideToast(toast, toastText);
    }, duration);
}

export function dismissToast() {
    const toast = document.getElementById("app-toast");
    const toastText = document.getElementById("app-toast-text");

    hideToast(toast, toastText);
}
