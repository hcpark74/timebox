import { SCHEDULING_BLOCKS, state } from "../state/store.js";
import { getDateString, getStartOfWeek } from "../lib/date.js";

function getWeekDates(baseDate) {
    const start = getStartOfWeek(baseDate);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(date.getDate() + index);
        return date;
    });
}

function getTasksForDate(dateString) {
    return state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime);
}

function getCompletedCountForDate(dateString) {
    return state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime && task.status === "completed").length;
}

function getCurrentStreak() {
    let streak = 0;
    const cursor = new Date(state.selectedDate);

    while (getCompletedCountForDate(getDateString(cursor)) > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function createWeekBars(weekDates) {
    return weekDates.map((date) => {
        const dateString = getDateString(date);
        const scheduledCount = getTasksForDate(dateString).length;
        const completedCount = getCompletedCountForDate(dateString);
        const rate = scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0;

        return `
            <div class="profile-weekly-bar-item">
                <div class="profile-weekly-bar-label-row">
                    <span class="profile-weekly-day-label">${date.toLocaleDateString("ko-KR", { weekday: "short", month: "numeric", day: "numeric" })}</span>
                    <span class="profile-weekly-day-count">${completedCount}/${scheduledCount}</span>
                </div>
                <div class="profile-weekly-bar-track" aria-hidden="true">
                    <div class="profile-weekly-bar-fill" style="width: ${rate}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function createCategoryBreakdown() {
    const labels = {
        personal: "개인",
        meet: "미팅",
        event: "이벤트",
        work: "업무",
        rest: "휴식",
        other: "기타"
    };
    const counts = {};

    state.tasks.forEach((task) => {
        counts[task.category] = (counts[task.category] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        return '<p class="profile-empty-state">아직 카테고리 데이터가 없습니다.</p>';
    }

    return entries.map(([category, count]) => {
        const share = Math.round((count / state.tasks.length) * 100);

        return `
            <div class="stats-category-item">
                <div class="stats-category-copy">
                    <strong>${labels[category] || category}</strong>
                    <span>${count}개 · ${share}%</span>
                </div>
                <div class="stats-category-track" aria-hidden="true">
                    <div class="stats-category-fill" style="width: ${share}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function createFocusList(selectedDateString) {
    const todayTasks = getTasksForDate(selectedDateString);
    const pendingTodayTasks = todayTasks.filter((task) => task.status !== "completed");
    const priorityUnassigned = state.tasks.filter((task) => task.priority === "high" && !(task.scheduledDate === selectedDateString && task.scheduledTime));

    if (pendingTodayTasks.length) {
        return {
            copy: `오늘 남은 ${pendingTodayTasks.length}개의 블록을 먼저 정리하면 완료율이 바로 올라갑니다.`,
            items: pendingTodayTasks
                .slice(0, 3)
                .map((task) => {
                    const block = SCHEDULING_BLOCKS.find((item) => item.start === task.scheduledTime);
                    return {
                        title: task.title,
                        badge: block?.title || task.scheduledTime || "오늘 일정"
                    };
                })
        };
    }

    if (priorityUnassigned.length) {
        return {
            copy: `아직 시간 블록에 넣지 않은 핵심 ${priorityUnassigned.length}개가 있습니다. 먼저 배치해보세요.`,
            items: priorityUnassigned.slice(0, 3).map((task) => ({
                title: task.title,
                badge: "미배정"
            }))
        };
    }

    return {
        copy: "오늘 핵심 흐름이 잘 정리되어 있습니다. 다음 주를 위해 후보 할 일을 정리해두세요.",
        items: [{ title: "오늘 계획과 실행 흐름이 안정적입니다.", badge: "좋아요" }]
    };
}

function createFocusMarkup(items) {
    return items.map((item) => `
        <div class="profile-list-item">
            <span>${item.title}</span>
            <span class="profile-list-badge">${item.badge}</span>
        </div>
    `).join("");
}

export function renderStats() {
    const weekDates = getWeekDates(state.selectedDate);
    const weekStrings = weekDates.map((date) => getDateString(date));
    const selectedDateString = getDateString(state.selectedDate);
    const todayCompletedCount = getCompletedCountForDate(selectedDateString);
    const weekScheduledTasks = state.tasks.filter((task) => weekStrings.includes(task.scheduledDate) && task.scheduledTime);
    const weekCompletedTasks = weekScheduledTasks.filter((task) => task.status === "completed");
    const weekRate = weekScheduledTasks.length ? Math.round((weekCompletedTasks.length / weekScheduledTasks.length) * 100) : 0;
    const activeDays = weekStrings.filter((dateString) => getTasksForDate(dateString).length > 0).length;
    const currentStreak = getCurrentStreak();
    const bufferUsage = weekScheduledTasks.filter((task) => SCHEDULING_BLOCKS.find((block) => block.start === task.scheduledTime)?.buffer).length;

    const completedByCategory = {};
    weekCompletedTasks.forEach((task) => {
        completedByCategory[task.category] = (completedByCategory[task.category] || 0) + 1;
    });

    const topCategoryEntry = Object.entries(completedByCategory).sort((a, b) => b[1] - a[1])[0];
    const categoryLabelMap = { personal: "개인", meet: "미팅", event: "이벤트", work: "업무", rest: "휴식", other: "기타" };
    const topCategoryText = topCategoryEntry ? `${categoryLabelMap[topCategoryEntry[0]] || topCategoryEntry[0]} ${topCategoryEntry[1]}개` : "아직 없음";

    const blockSummary = SCHEDULING_BLOCKS.map((block) => {
        const blockTasks = weekScheduledTasks.filter((task) => task.scheduledTime === block.start);
        const completedCount = blockTasks.filter((task) => task.status === "completed").length;
        const rate = blockTasks.length ? Math.round((completedCount / blockTasks.length) * 100) : 0;

        return { title: block.title, count: completedCount, rate };
    }).sort((a, b) => b.rate - a.rate || b.count - a.count);

    const bestBlock = blockSummary[0];
    const bestBlockText = bestBlock && (bestBlock.count > 0 || bestBlock.rate > 0)
        ? `${bestBlock.title} · 완료율 ${bestBlock.rate}%`
        : "아직 없음";

    const summaryTitle = document.getElementById("stats-summary-title");
    const summaryCopy = document.getElementById("stats-summary-copy");
    const selectedRange = document.getElementById("stats-selected-range");
    const activeDaysText = document.getElementById("stats-active-days");
    const todayCompletion = document.getElementById("stats-today-completion");
    const weekCompletionRate = document.getElementById("stats-week-completion-rate");
    const currentStreakText = document.getElementById("stats-current-streak");
    const bufferUsageText = document.getElementById("stats-buffer-usage");
    const weekBars = document.getElementById("stats-week-bars");
    const topCategory = document.getElementById("stats-top-category");
    const bestBlockElement = document.getElementById("stats-best-block");
    const insightCopy = document.getElementById("stats-insight-copy");
    const categoryBreakdown = document.getElementById("stats-category-breakdown");
    const focusCopy = document.getElementById("stats-focus-copy");
    const focusList = document.getElementById("stats-focus-list");
    const primaryAction = document.getElementById("stats-primary-action");
    const secondaryAction = document.getElementById("stats-secondary-action");
    const emptyVisual = document.getElementById("stats-empty-visual");
    const focusData = createFocusList(selectedDateString);
    const hasAnyTask = state.tasks.length > 0;

    if (summaryTitle) {
        summaryTitle.textContent = hasAnyTask
            ? `${state.user.name}님의 이번 주 실행 리듬입니다.`
            : `${state.user.name}님의 첫 계획을 시작해보세요.`;
    }

    if (summaryCopy) {
        summaryCopy.textContent = !hasAnyTask
            ? "아직 등록된 할 일이 없습니다. 먼저 오늘의 핵심이 될 후보를 2-3개 적어보면 통계가 바로 살아납니다."
            : weekScheduledTasks.length
            ? `이번 주에 ${weekCompletedTasks.length}개를 완료했고 완료율은 ${weekRate}%입니다.`
            : "이번 주에 아직 배치된 일정이 없습니다. 시간 배치 화면에서 흐름을 먼저 만들어보세요.";
    }

    if (selectedRange) {
        selectedRange.textContent = `${weekDates[0].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} - ${weekDates[6].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;
    }

    if (activeDaysText) {
        activeDaysText.textContent = `활성 ${activeDays}일`;
    }

    if (todayCompletion) {
        todayCompletion.textContent = String(todayCompletedCount);
    }

    if (weekCompletionRate) {
        weekCompletionRate.textContent = `${weekRate}%`;
    }

    if (currentStreakText) {
        currentStreakText.textContent = `${currentStreak}일`;
    }

    if (bufferUsageText) {
        bufferUsageText.textContent = `${bufferUsage}회`;
    }

    if (weekBars) {
        weekBars.innerHTML = createWeekBars(weekDates);
    }

    if (topCategory) {
        topCategory.textContent = topCategoryText;
    }

    if (bestBlockElement) {
        bestBlockElement.textContent = bestBlockText;
    }

    if (insightCopy) {
        insightCopy.textContent = !hasAnyTask
            ? "처음에는 카테고리보다 빠른 기록이 더 중요합니다. 먼저 할 일을 적고 오늘의 핵심으로 옮겨보세요."
            : weekScheduledTasks.length === 0
            ? "이번 주에는 먼저 1-2개의 핵심 블록부터 채워 리듬을 만드는 것이 좋습니다."
            : bestBlock && bestBlock.rate >= 70
                ? `${bestBlock.title}에서 완료율이 높습니다. 비슷한 성격의 일은 이 시간대에 우선 배치해보세요.`
                : "완료율이 아직 고르지 않습니다. 핵심 작업 수를 줄이고 가장 강한 시간대에 먼저 배치해보세요.";
    }

    if (categoryBreakdown) {
        categoryBreakdown.innerHTML = createCategoryBreakdown();
    }

    if (focusCopy) {
        focusCopy.textContent = focusData.copy;
    }

    if (focusList) {
        focusList.innerHTML = createFocusMarkup(focusData.items);
    }

    if (primaryAction) {
        primaryAction.textContent = hasAnyTask ? "오늘 계획 열기" : "첫 할 일 적으러 가기";
        primaryAction.dataset.page = "schedule-task-page";
    }

    if (secondaryAction) {
        secondaryAction.textContent = hasAnyTask ? "지금 일정 보기" : "내 정보 보기";
        secondaryAction.dataset.page = hasAnyTask ? "timeline-page" : "profile-page";
    }

    if (emptyVisual) {
        emptyVisual.classList.toggle("hidden", hasAnyTask);
    }
}
