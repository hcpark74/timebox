import { SCHEDULING_BLOCKS, state } from "../state/store.js";
import { getDateString, getStartOfWeek } from "../lib/date.js";

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "좋은 아침이에요. 오늘의 핵심을 가볍게 정리해볼까요?";
    }

    if (hour < 18) {
        return "지금 흐름을 점검하고 남은 일을 정리해보세요.";
    }

    return "하루를 마무리하면서 완료한 일과 남은 일을 확인해보세요.";
}

function createListMarkup(items, emptyText, type) {
    if (!items.length) {
        return `<p class="profile-empty-state">${emptyText}</p>`;
    }

    return items.map((item) => `
        <div class="profile-list-item ${type === "completed" ? "is-completed" : ""}">
            <span>${item.title}</span>
            <span class="profile-list-badge">${type === "scheduled" ? item.blockTitle : type === "completed" ? "완료" : "미배정"}</span>
        </div>
    `).join("");
}

function getWeekDates(baseDate) {
    const startOfWeek = getStartOfWeek(baseDate);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + index);
        return date;
    });
}

function createWeeklyBarsMarkup(weekDates) {
    return weekDates.map((date) => {
        const dateString = getDateString(date);
        const scheduledCount = state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime).length;
        const completedCount = state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime && task.status === "completed").length;
        const rate = scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0;

        return `
            <div class="profile-weekly-bar-item">
                <div class="profile-weekly-bar-label-row">
                    <span class="profile-weekly-day-label">${date.toLocaleDateString("ko-KR", { weekday: "short" })}</span>
                    <span class="profile-weekly-day-count">${completedCount}/${scheduledCount || 0}</span>
                </div>
                <div class="profile-weekly-bar-track" aria-hidden="true">
                    <div class="profile-weekly-bar-fill" style="width: ${rate}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function getWeeklyInsight(weekDates) {
    const daySummaries = weekDates.map((date) => {
        const dateString = getDateString(date);
        const scheduledCount = state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime).length;
        const completedCount = state.tasks.filter((task) => task.scheduledDate === dateString && task.scheduledTime && task.status === "completed").length;

        return {
            date,
            scheduledCount,
            completedCount,
            rate: scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0
        };
    });

    const bestDay = daySummaries.reduce((best, current) => {
        if (!best) {
            return current;
        }

        if (current.completedCount > best.completedCount) {
            return current;
        }

        if (current.completedCount === best.completedCount && current.rate > best.rate) {
            return current;
        }

        return best;
    }, null);

    const weakestDay = daySummaries
        .filter((day) => day.scheduledCount > 0)
        .reduce((worst, current) => {
            if (!worst) {
                return current;
            }

            if (current.rate < worst.rate) {
                return current;
            }

            if (current.rate === worst.rate && current.completedCount < worst.completedCount) {
                return current;
            }

            return worst;
        }, null);

    const perfectDays = daySummaries.filter((day) => day.scheduledCount > 0 && day.completedCount === day.scheduledCount);

    if (!bestDay || daySummaries.every((day) => day.scheduledCount === 0)) {
        return {
            best: "아직 배치된 일정이 없어요.",
            weak: "비교할 요일 데이터가 없습니다.",
            action: "이번 주 계획을 만들려면 먼저 시간 블록에 핵심 작업을 넣어보세요.",
            ctaLabel: "시간 배치하러 가기"
        };
    }

    if (perfectDays.length > 0) {
        const latestPerfectDay = perfectDays[perfectDays.length - 1];
        return {
            best: `${latestPerfectDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}에 배치한 일을 모두 마쳤어요.`,
            weak: weakestDay ? `${weakestDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}은 완료율이 ${weakestDay.rate}%로 가장 낮았어요.` : "아직 아쉬운 요일은 보이지 않아요.",
            action: weakestDay ? `${weakestDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}에는 배치 수를 조금 줄이고 가장 중요한 1개부터 끝내보세요.` : "완료 리듬이 좋아요. 지금 패턴을 그대로 이어가면 됩니다.",
            ctaLabel: weakestDay ? "시간 배치 다시 보기" : "오늘 일정 보러 가기",
            ctaPage: weakestDay ? "schedule-your-task-page" : "timeline-page"
        };
    }

    return {
        best: `${bestDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}에 ${bestDay.completedCount}개를 완료해서 가장 강한 흐름을 만들었어요.`,
        weak: weakestDay ? `${weakestDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}은 ${weakestDay.completedCount}/${weakestDay.scheduledCount} 완료로 가장 아쉬웠어요.` : "아직 아쉬운 요일은 보이지 않아요.",
        action: weakestDay
            ? `${weakestDay.date.toLocaleDateString("ko-KR", { weekday: "long" })}에는 일정 수를 줄이거나 버퍼 블록을 먼저 확보해보세요.`
            : "완료 흐름이 안정적이에요. 비슷한 밀도로 이번 주를 이어가면 됩니다.",
        ctaLabel: weakestDay ? "시간 배치 조정하기" : "오늘 일정 보러 가기",
        ctaPage: weakestDay ? "schedule-your-task-page" : "timeline-page"
    };
}

export function renderProfile() {
    const selectedDate = getDateString(state.selectedDate);
    const weekDates = getWeekDates(state.selectedDate);
    const weekDateStrings = weekDates.map((date) => getDateString(date));
    const totalTasks = state.tasks.length;
    const priorityTasks = state.tasks.filter((task) => task.priority === "high");
    const scheduledTasks = state.tasks.filter((task) => task.scheduledDate === selectedDate && task.scheduledTime);
    const completedTasks = scheduledTasks.filter((task) => task.status === "completed");
    const unassignedPriorityTasks = priorityTasks.filter((task) => !(task.scheduledDate === selectedDate && task.scheduledTime));
    const completionRate = scheduledTasks.length ? Math.round((completedTasks.length / scheduledTasks.length) * 100) : 0;
    const weeklyScheduledTasks = state.tasks.filter((task) => weekDateStrings.includes(task.scheduledDate) && task.scheduledTime);
    const weeklyCompletedTasks = weeklyScheduledTasks.filter((task) => task.status === "completed");
    const weeklyCompletionRate = weeklyScheduledTasks.length ? Math.round((weeklyCompletedTasks.length / weeklyScheduledTasks.length) * 100) : 0;

    const nameHeading = document.getElementById("profile-name-heading");
    const greetingText = document.getElementById("profile-greeting-text");
    const selectedDateText = document.getElementById("profile-selected-date");
    const syncStatusText = document.getElementById("profile-sync-status");
    const progressCopy = document.getElementById("profile-progress-copy");
    const progressPercent = document.getElementById("profile-progress-percent");
    const progressFill = document.getElementById("profile-progress-fill");
    const progressMetaLeft = document.getElementById("profile-progress-meta-left");
    const progressMetaRight = document.getElementById("profile-progress-meta-right");
    const weekRange = document.getElementById("profile-week-range");
    const weekCompleted = document.getElementById("profile-week-completed");
    const weekScheduled = document.getElementById("profile-week-scheduled");
    const weekRate = document.getElementById("profile-week-rate");
    const weekInsightBest = document.getElementById("profile-week-insight-best");
    const weekInsightWeak = document.getElementById("profile-week-insight-weak");
    const weekInsightAction = document.getElementById("profile-week-insight-action");
    const weekInsightCta = document.getElementById("profile-week-insight-cta");
    const weeklyBars = document.getElementById("profile-weekly-bars");
    const scheduledList = document.getElementById("profile-scheduled-list");
    const unassignedList = document.getElementById("profile-unassigned-list");

    if (nameHeading) {
        nameHeading.textContent = `안녕하세요, ${state.user.name}`;
    }

    if (greetingText) {
        greetingText.textContent = getGreeting();
    }

    if (selectedDateText) {
        selectedDateText.textContent = state.selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
    }

    if (syncStatusText) {
        syncStatusText.textContent = navigator.onLine ? "동기화 가능한 상태" : "오프라인 모드 사용 중";
    }

    const statMap = {
        "profile-total-count": totalTasks,
        "profile-priority-count": priorityTasks.length,
        "profile-scheduled-count": scheduledTasks.length,
        "profile-completed-count": completedTasks.length
    };

    Object.entries(statMap).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    });

    if (progressCopy) {
        progressCopy.textContent = scheduledTasks.length
            ? `오늘 배치한 ${scheduledTasks.length}개 중 ${completedTasks.length}개를 완료했습니다.`
            : "오늘 배치된 일정이 아직 없습니다.";
    }

    if (progressPercent) {
        progressPercent.textContent = `${completionRate}%`;
    }

    if (progressFill) {
        progressFill.style.width = `${completionRate}%`;
    }

    if (progressMetaLeft) {
        progressMetaLeft.textContent = `오늘 완료율 ${completionRate}%`;
    }

    if (progressMetaRight) {
        progressMetaRight.textContent = `완료 ${completedTasks.length} / 배치 ${scheduledTasks.length}`;
    }

    if (weekRange) {
        weekRange.textContent = `${weekDates[0].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} - ${weekDates[6].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 기준`;
    }

    if (weekCompleted) {
        weekCompleted.textContent = String(weeklyCompletedTasks.length);
    }

    if (weekScheduled) {
        weekScheduled.textContent = String(weeklyScheduledTasks.length);
    }

    if (weekRate) {
        weekRate.textContent = `${weeklyCompletionRate}%`;
    }

    const weeklyInsight = getWeeklyInsight(weekDates);

    if (weekInsightBest) {
        weekInsightBest.textContent = weeklyInsight.best;
    }

    if (weekInsightWeak) {
        weekInsightWeak.textContent = weeklyInsight.weak;
    }

    if (weekInsightAction) {
        weekInsightAction.textContent = weeklyInsight.action;
    }

    if (weekInsightCta) {
        weekInsightCta.textContent = weeklyInsight.ctaLabel || "시간 배치하러 가기";
        weekInsightCta.dataset.page = weeklyInsight.ctaPage || "schedule-your-task-page";
        weekInsightCta.dataset.scrollTarget = weeklyInsight.ctaPage === "timeline-page" ? "timeline-view" : "planner-focus";
    }

    if (weeklyBars) {
        weeklyBars.innerHTML = createWeeklyBarsMarkup(weekDates);
    }

    if (scheduledList) {
        const scheduledWithBlock = scheduledTasks
            .map((task) => ({
                title: task.title,
                blockTitle: SCHEDULING_BLOCKS.find((block) => block.start === task.scheduledTime)?.title || task.scheduledTime
            }))
            .sort((a, b) => a.blockTitle.localeCompare(b.blockTitle));

        scheduledList.innerHTML = createListMarkup(scheduledWithBlock, "오늘 배치한 일정이 없습니다.", "scheduled");
    }

    if (unassignedList) {
        unassignedList.innerHTML = createListMarkup(unassignedPriorityTasks, "모든 핵심 작업이 배치되었습니다.", "unassigned");
    }
}
