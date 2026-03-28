import { renderCalendar, renderScheduleList } from "./calendar.js";
import { renderProfile } from "./profile.js";
import { renderCategoryCounts, renderTaskLists } from "./tasks.js";
import { renderTimeline, renderTimelineSlots } from "./timeline.js";

export function updateUI() {
    renderCalendar();
    renderScheduleList();
    renderTaskLists();
    renderTimeline();
    renderCategoryCounts();
    renderProfile();
    renderTimelineSlots();
}
