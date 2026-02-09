function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    // Show the selected page
    document.getElementById(pageId).classList.remove('hidden');

    // Update FAB style based on page
    const fab = document.querySelectorAll('.fab');
    fab.forEach(f => {
        if (pageId === 'profile-page' || pageId === 'timeline-page') {
            f.classList.add('dark');
        } else {
            f.classList.remove('dark');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
}

function setActiveTab(clickedTab) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.remove('active-calendar');
    });

    // Add active class to clicked tab
    // Logic: If it has home/calendar icon etc.
    // The provided code specific logic: "active-calendar" style for specific tab
    if (clickedTab.innerHTML.includes('fa-calendar-alt')) {
        clickedTab.classList.add('active-calendar');
    } else {
        clickedTab.classList.add('active');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showPage('calendar-page');
});
