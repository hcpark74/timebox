export function getStartOfWeek(date) {
    const nextDate = new Date(date);
    const day = nextDate.getDay();
    const diff = nextDate.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(nextDate.setDate(diff));
}

export function isSameDate(firstDate, secondDate) {
    return firstDate.getDate() === secondDate.getDate()
        && firstDate.getMonth() === secondDate.getMonth()
        && firstDate.getFullYear() === secondDate.getFullYear();
}

export function getDateString(date) {
    return new Date(date).toISOString().split("T")[0];
}

export function formatTime12(time24) {
    if (!time24) return "";

    const [hours, minutes] = time24.split(":");
    const hourValue = parseInt(hours, 10);
    const ampm = hourValue >= 12 ? "PM" : "AM";
    const hour12 = hourValue % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}
