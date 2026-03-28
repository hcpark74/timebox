function updateTabState(activeTab) {
    document.querySelectorAll(".tab-item").forEach((tab) => {
        tab.classList.remove("active");
        tab.classList.remove("active-calendar");
        tab.removeAttribute("aria-current");
    });

    if (!activeTab) {
        return;
    }

    activeTab.setAttribute("aria-current", "page");

    if (activeTab.querySelector(".fa-home") || activeTab.querySelector(".fa-calendar-alt") || activeTab.dataset.page === "timeline-page") {
        activeTab.classList.add("active-calendar");
        return;
    }

    activeTab.classList.add("active");
}

function syncActiveTabByPage(pageId) {
    const tabPageId = pageId === "profile-page" ? "stats-page" : pageId;
    const activeTab = document.querySelector(`.tab-item[data-page="${tabPageId}"]`);
    updateTabState(activeTab);
}

export function showPage(pageId) {
    document.querySelectorAll(".page").forEach((page) => page.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");
    syncActiveTabByPage(pageId);

    window.scrollTo(0, 0);
}

export function setActiveTab(clickedTab) {
    updateTabState(clickedTab);
}
