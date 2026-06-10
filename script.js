/**
 * KU Planner - Core Application Script
 * Developer: Antigravity
 * Version: 1.0.0
 * Pure Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // === STATE MANAGEMENT ===
  let tasks = [];
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0 - 11
  let selectedDate = null; // 'YYYY-MM-DD'
  let currentFilter = 'all'; // 'all' | 'assignment' | 'exam'
  let currentSort = 'deadline'; // 'deadline' | 'importance'

  // Modal State Tracking
  let isEditMode = false;

  // === DOM ELEMENTS ===
  // Header
  const todayDateDisplay = document.getElementById('today-date-display');
  
  // Stats
  const countAllEl = document.getElementById('count-all');
  const countAssignmentsEl = document.getElementById('count-assignments');
  const countExamsEl = document.getElementById('count-exams');
  const countUrgentEl = document.getElementById('count-urgent');

  // Calendar
  const calendarDaysContainer = document.getElementById('calendar-days');
  const calendarTitleEl = document.getElementById('calendar-title');
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const selectedDateBox = document.getElementById('selected-date-box');
  const selectedDateStrEl = document.getElementById('selected-date-str');
  const selectedDateTasksPreview = document.getElementById('selected-date-tasks-preview');
  const clearDateFilterBtn = document.getElementById('clear-date-filter');

  // Controls & Task List
  const tabAll = document.getElementById('tab-all');
  const tabAssignment = document.getElementById('tab-assignment');
  const tabExam = document.getElementById('tab-exam');
  const sortSelect = document.getElementById('sort-select');
  const openAddModalBtn = document.getElementById('open-add-modal-btn');
  const emptyStateAddBtn = document.getElementById('empty-state-add-btn');
  const taskListContainer = document.getElementById('task-list-container');

  // Modal Elements
  const scheduleModal = document.getElementById('schedule-modal');
  const modalTitle = document.getElementById('modal-title');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const scheduleForm = document.getElementById('schedule-form');
  const modalTypeTabs = document.getElementById('modal-type-tabs');
  const modalTabAssignment = document.getElementById('modal-tab-assignment');
  const modalTabExam = document.getElementById('modal-tab-exam');
  
  // Form Fields
  const editIdInput = document.getElementById('edit-id');
  const scheduleTypeInput = document.getElementById('schedule-type');
  const subjectInput = document.getElementById('input-subject');
  const titleInput = document.getElementById('input-title');
  const labelTitle = document.getElementById('label-title');
  
  const assignmentFields = document.getElementById('assignment-fields-section');
  const descriptionInput = document.getElementById('input-description');
  const deadlineInput = document.getElementById('input-deadline');
  const importanceInput = document.getElementById('input-importance');

  const examFields = document.getElementById('exam-fields-section');
  const examDateInput = document.getElementById('input-exam-date');
  const examTimeInput = document.getElementById('input-exam-time');
  const classroomInput = document.getElementById('input-classroom');

  const toastContainer = document.getElementById('toast-container');


  // === INITIALIZATION ===
  function init() {
    setTodayHeader();
    loadTasks();
    setupEventListeners();
    renderAll();
    
    // Set default dates in form to today's date
    const todayISO = new Date().toISOString().split('T')[0];
    deadlineInput.value = todayISO;
    examDateInput.value = todayISO;
  }

  // Set today's date in header (Korean Format)
  function setTodayHeader() {
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const formatted = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${daysOfWeek[today.getDay()]})`;
    todayDateDisplay.textContent = formatted;
  }

  // === LOCAL STORAGE & STATE UPDATE ===
  function loadTasks() {
    try {
      const stored = localStorage.getItem('ku_planner_tasks');
      tasks = stored ? JSON.parse(stored) : [];
      // Data sanity check & sorting initial
    } catch (e) {
      console.error('Failed to load tasks from localStorage:', e);
      tasks = [];
      showToast('데이터를 가져오는 중 오류가 발생했습니다.', 'error');
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem('ku_planner_tasks', JSON.stringify(tasks));
      updateStats();
    } catch (e) {
      console.error('Failed to save tasks to localStorage:', e);
      showToast('데이터 저장에 실패했습니다. 저장 공간을 확인하세요.', 'error');
    }
  }

  // === STATS & D-DAY UTILITIES ===
  function getDDay(dateStr) {
    if (!dateStr) return { days: null, text: 'D-Day 미정', class: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { days: 0, text: 'D-Day', class: 'today' };
    } else if (diffDays > 0) {
      return { days: diffDays, text: `D-${diffDays}`, class: diffDays <= 7 ? 'urgent' : 'normal' };
    } else {
      return { days: diffDays, text: `종료 (D+${Math.abs(diffDays)})`, class: 'past' };
    }
  }

  function isUrgent(dateStr) {
    const dday = getDDay(dateStr);
    return dday.days !== null && dday.days >= 0 && dday.days <= 7;
  }

  function updateStats() {
    const totalCount = tasks.length;
    const assignmentsCount = tasks.filter(t => t.type === 'assignment').length;
    const examsCount = tasks.filter(t => t.type === 'exam').length;
    const urgentCount = tasks.filter(t => isUrgent(t.date)).length;

    countAllEl.textContent = totalCount;
    countAssignmentsEl.textContent = assignmentsCount;
    countExamsEl.textContent = examsCount;
    countUrgentEl.textContent = urgentCount;

    // Pulse stats if urgent item added
    const statUrgentCard = document.getElementById('stat-urgent');
    if (urgentCount > 0) {
      statUrgentCard.classList.add('pulse-alert');
    } else {
      statUrgentCard.classList.remove('pulse-alert');
    }
  }

  // Helper to format Date object to YYYY-MM-DD
  function formatDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD to MM월 DD일 (요일)
  function formatKoreanDate(dateStr, showYear = false) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const yearPart = showYear ? `${date.getFullYear()}년 ` : '';
    return `${yearPart}${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  }


  // === RENDERING ENGINE ===

  function renderAll() {
    updateStats();
    renderCalendar();
    renderTaskList();
    renderSelectedDatePreview();
  }

  // 1. Calendar Rendering
  function renderCalendar() {
    calendarDaysContainer.innerHTML = '';
    
    // Month label: 2026.06
    calendarTitleEl.textContent = `${currentYear}.${String(currentMonth + 1).padStart(2, '0')}`;
    
    // Calculate calendar days details
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Weekday of the 1st
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate(); // Last day of month
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate(); // Last day of previous month
    
    const today = new Date();
    const todayFormatted = formatDate(today);

    // Grid rendering (42 slots to cover typical month layouts)
    
    // Previous Month Days (Grayed out)
    for (let i = firstDayIndex; i > 0; i--) {
      const dayNum = prevLastDay - i + 1;
      // Handle year wrap-around for dates
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      const dayCell = createDayCell(dayNum, dateStr, true, prevYear, prevMonth);
      calendarDaysContainer.appendChild(dayCell);
    }
    
    // Current Month Days
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const isToday = (dateStr === todayFormatted);
      const dayCell = createDayCell(i, dateStr, false, currentYear, currentMonth, isToday);
      calendarDaysContainer.appendChild(dayCell);
    }
    
    // Next Month Days (Grayed out to complete 42 cells)
    const totalCellsFilled = firstDayIndex + lastDay;
    const paddingCellsNeeded = 42 - totalCellsFilled;
    
    for (let i = 1; i <= paddingCellsNeeded; i++) {
      let nextYear = currentYear;
      let nextMonth = currentMonth + 1;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const dayCell = createDayCell(i, dateStr, true, nextYear, nextMonth);
      calendarDaysContainer.appendChild(dayCell);
    }
  }

  // Create Day Cell Component
  function createDayCell(dayNum, dateStr, isPrevNext, year, month, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if (isPrevNext) cell.classList.add('prev-next-month');
    if (isToday) cell.classList.add('today');
    if (selectedDate === dateStr) cell.classList.add('selected');

    // Add Saturday/Sunday styles
    const cellDate = new Date(year, month, dayNum);
    const dayOfWeek = cellDate.getDay();
    if (dayOfWeek === 0) cell.classList.add('sunday');
    if (dayOfWeek === 6) cell.classList.add('saturday');

    cell.innerHTML = `<span class="day-number">${dayNum}</span>`;

    // Retrieve events for this day
    const dayTasks = tasks.filter(t => t.date === dateStr);
    
    if (dayTasks.length > 0) {
      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'day-schedules';
      
      // Show up to 2 badges, collapse rest
      dayTasks.slice(0, 2).forEach(task => {
        const badge = document.createElement('div');
        badge.className = `calendar-badge ${task.type}`;
        badge.textContent = `${task.type === 'assignment' ? '📝' : '✍️'} ${task.subject}`;
        badge.title = `${task.type === 'assignment' ? '[과제]' : '[시험]'} ${task.subject} - ${task.title}`;
        badgeContainer.appendChild(badge);
      });

      if (dayTasks.length > 2) {
        const moreBadge = document.createElement('div');
        moreBadge.className = 'calendar-badge-more';
        moreBadge.textContent = `+${dayTasks.length - 2}개 더`;
        moreBadge.style.fontSize = '0.65rem';
        moreBadge.style.textAlign = 'right';
        moreBadge.style.paddingRight = '4px';
        moreBadge.style.color = 'var(--ku-crimson)';
        moreBadge.style.fontWeight = '700';
        badgeContainer.appendChild(moreBadge);
      }

      cell.appendChild(badgeContainer);
    }

    // Click behavior
    cell.addEventListener('click', () => {
      if (selectedDate === dateStr) {
        // Toggle off if clicking selected date again
        selectedDate = null;
      } else {
        selectedDate = dateStr;
      }
      renderAll();
    });

    return cell;
  }

  // 2. Selected Date Panel Preview (Bottom of Calendar)
  function renderSelectedDatePreview() {
    if (!selectedDate) {
      selectedDateBox.style.display = 'none';
      return;
    }

    selectedDateBox.style.display = 'block';
    selectedDateStrEl.textContent = formatKoreanDate(selectedDate);

    const dayTasks = tasks.filter(t => t.date === selectedDate);
    selectedDateTasksPreview.innerHTML = '';

    if (dayTasks.length === 0) {
      selectedDateTasksPreview.innerHTML = `<p class="preview-sub">이 날짜에는 등록된 일정이 없습니다.</p>`;
      return;
    }

    dayTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `date-preview-item ${task.type}`;
      
      const badgeText = task.type === 'assignment' ? '과제' : '시험';
      const badgeClass = task.type === 'assignment' ? 'badge-assignment' : 'badge-exam';
      
      let extraText = '';
      if (task.type === 'exam') {
        extraText = ` | 🕒 ${task.time} | 📍 ${task.classroom}`;
      } else {
        const dday = getDDay(task.date);
        extraText = ` | 🔔 ${dday.text}`;
      }

      item.innerHTML = `
        <div class="preview-title-area">
          <span class="preview-badge ${badgeClass}">${badgeText}</span>
          <span class="preview-text">[${task.subject}] ${task.title}</span>
        </div>
        <span class="preview-sub">${extraText}</span>
      `;
      selectedDateTasksPreview.appendChild(item);
    });
  }

  // 3. Task Cards List Rendering (Main Planner Area)
  function renderTaskList() {
    taskListContainer.innerHTML = '';

    // Apply filtering
    let filteredTasks = tasks;
    
    // Type Filter (All / Assignments / Exams)
    if (currentFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.type === currentFilter);
    }

    // Calendar Date Filter
    if (selectedDate) {
      filteredTasks = filteredTasks.filter(t => t.date === selectedDate);
    }

    // Empty State Check
    if (filteredTasks.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      
      let title = "등록된 일정이 없습니다.";
      let desc = "새로운 과제나 시험 일정을 등록해 체계적으로 학업을 관리해 보세요!";
      
      if (selectedDate) {
        title = "해당 날짜에 일정이 없습니다.";
        desc = `${formatKoreanDate(selectedDate)}의 새로운 일정을 추가하거나 달력에서 다른 날을 선택해 보세요.`;
      } else if (currentFilter === 'assignment') {
        title = "등록된 과제가 없습니다.";
        desc = "과제 일정을 추가하여 기한 내 완성할 수 있도록 관리해 보세요.";
      } else if (currentFilter === 'exam') {
        title = "등록된 시험이 없습니다.";
        desc = "시험 날짜와 시간, 강의실을 등록해 깜빡하지 않도록 체크해 보세요.";
      }

      emptyState.innerHTML = `
        <div class="empty-icon">🛡️</div>
        <p class="empty-title">${title}</p>
        <p class="empty-desc">${desc}</p>
        <button class="btn btn-primary" id="empty-state-btn-action">일정 추가하기</button>
      `;
      taskListContainer.appendChild(emptyState);
      
      // Bind click event for empty state action button
      document.getElementById('empty-state-btn-action').addEventListener('click', openAddModal);
      return;
    }

    // Apply Sorting
    // Importance value mapper
    const importanceWeight = { 'high': 3, 'medium': 2, 'low': 1 };

    filteredTasks.sort((a, b) => {
      if (currentSort === 'deadline') {
        // Sort by date (D-Day ascending, past dates go to the bottom)
        const ddayA = getDDay(a.date).days;
        const ddayB = getDDay(b.date).days;
        
        // Handle undefined dates
        if (ddayA === null) return 1;
        if (ddayB === null) return -1;

        // If one is in the past (< 0) and the other is in the future/today (>= 0), future/today comes first
        if (ddayA < 0 && ddayB >= 0) return 1;
        if (ddayB < 0 && ddayA >= 0) return -1;
        
        // If both are past, sort descending (most recent past first)
        if (ddayA < 0 && ddayB < 0) return ddayB - ddayA;
        
        // If both are future, sort ascending (soonest deadline first)
        if (ddayA !== ddayB) return ddayA - ddayB;
        
        // Tie breaker: type (exam first, then assignments)
        if (a.type !== b.type) return a.type === 'exam' ? -1 : 1;
        return a.title.localeCompare(b.title);
      } 
      
      else if (currentSort === 'importance') {
        // Sort by priority (High -> Medium -> Low). Exams are treated as High (3) importance.
        const impA = a.type === 'exam' ? 3 : importanceWeight[a.importance || 'medium'];
        const impB = b.type === 'exam' ? 3 : importanceWeight[b.importance || 'medium'];
        
        if (impA !== impB) {
          return impB - impA; // Descending
        }
        
        // Tie breaker: soonest deadline first
        const ddayA = getDDay(a.date).days;
        const ddayB = getDDay(b.date).days;
        if (ddayA === null) return 1;
        if (ddayB === null) return -1;
        
        return ddayA - ddayB;
      }
      return 0;
    });

    // Render cards
    filteredTasks.forEach(task => {
      const card = createTaskCard(task);
      taskListContainer.appendChild(card);
    });
  }

  // Create Individual Card DOM element
  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card card-${task.type}`;
    
    const ddayInfo = getDDay(task.date);
    
    // Highlight urgent card (due in 7 days and not past)
    const isUrgentTask = ddayInfo.days !== null && ddayInfo.days >= 0 && ddayInfo.days <= 7;
    if (isUrgentTask) {
      card.classList.add('highlight-urgent');
    }

    // Determine D-Day styling badge
    let ddayBadgeClass = 'normal';
    if (ddayInfo.days !== null) {
      if (ddayInfo.days < 0) ddayBadgeClass = 'past';
      else if (ddayInfo.days === 0) ddayBadgeClass = 'today';
      else if (ddayInfo.days <= 7) ddayBadgeClass = 'urgent';
    }

    // Type-specific content builder
    let metaItemsHTML = '';
    let bodyHTML = '';

    if (task.type === 'assignment') {
      const impLabels = { 'high': '🔥 상 (중요)', 'medium': '⚡ 중 (보통)', 'low': '🌱 하 (낮음)' };
      const impLabel = impLabels[task.importance || 'medium'];
      
      bodyHTML = `
        <h4 class="card-title">${task.title}</h4>
        ${task.description ? `<p class="card-description">${task.description}</p>` : ''}
      `;

      metaItemsHTML = `
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>마감: ${formatKoreanDate(task.date, true)}</span>
        </div>
        <div class="meta-item">
          <span class="importance-indicator importance-${task.importance || 'medium'}">${impLabel}</span>
        </div>
      `;
    } else if (task.type === 'exam') {
      bodyHTML = `
        <h4 class="card-title">${task.title}</h4>
      `;

      metaItemsHTML = `
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>날짜: ${formatKoreanDate(task.date, true)}</span>
        </div>
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>시간: ${task.time || '시간 미지정'}</span>
        </div>
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>강의실: ${task.classroom || '미정'}</span>
        </div>
      `;
    }

    // Actions block: Assignments allow edit/delete, Exams allow delete
    // Requirements say: 2. 과제 수정 및 삭제, 3. 시험 일정 추가 및 삭제
    // I will enable editing for Assignments and deletion for both.
    const editBtnHTML = task.type === 'assignment' ? `
      <button class="action-btn edit-btn" title="과제 수정" data-id="${task.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
    ` : '';

    card.innerHTML = `
      <div class="card-row-top">
        <span class="subject-badge">${task.subject}</span>
        <span class="dday-badge ${ddayBadgeClass}">${ddayInfo.text}</span>
      </div>
      ${bodyHTML}
      <div class="card-meta-row">
        ${metaItemsHTML}
      </div>
      <div class="card-actions">
        ${editBtnHTML}
        <button class="action-btn delete-btn" title="일정 삭제" data-id="${task.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // Attach actions event listeners manually to prevent unsafe inline handlers
    if (task.type === 'assignment') {
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(task.id);
      });
    }

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteTask(task.id);
    });

    return card;
  }


  // === EVENT EVENTHANDLERS & LOGIC ===

  // Setup main click, input and submit actions
  function setupEventListeners() {
    // 1. Calendar Navigations
    prevMonthBtn.addEventListener('click', () => {
      currentMonth -= 1;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
      }
      renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
      currentMonth += 1;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
      }
      renderCalendar();
    });

    clearDateFilterBtn.addEventListener('click', () => {
      selectedDate = null;
      renderAll();
    });

    // 2. Filter Tabs Clicking
    tabAll.addEventListener('click', () => switchMainFilter('all', tabAll));
    tabAssignment.addEventListener('click', () => switchMainFilter('assignment', tabAssignment));
    tabExam.addEventListener('click', () => switchMainFilter('exam', tabExam));

    // 3. Sort selection change
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderTaskList();
    });

    // 4. Modal Switch / Forms triggers
    openAddModalBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    
    // Clicking outside modal content to close it
    scheduleModal.addEventListener('click', (e) => {
      if (e.target === scheduleModal) closeModal();
    });

    // Modal Type switching (Assignment vs Exam tabs)
    modalTabAssignment.addEventListener('click', (e) => {
      e.preventDefault();
      switchModalType('assignment');
    });

    modalTabExam.addEventListener('click', (e) => {
      e.preventDefault();
      switchModalType('exam');
    });

    // Form submission
    scheduleForm.addEventListener('submit', handleFormSubmit);
  }

  // Handle Main Filters Switches
  function switchMainFilter(type, activeTabEl) {
    currentFilter = type;
    
    // Remove active from all tabs
    [tabAll, tabAssignment, tabExam].forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    activeTabEl.classList.add('active');
    activeTabEl.setAttribute('aria-selected', 'true');
    renderTaskList();
  }

  // Switch between Assignment/Exam inside the modal form
  function switchModalType(type) {
    if (isEditMode) return; // Prevent type switching when editing existing tasks
    
    scheduleTypeInput.value = type;

    if (type === 'assignment') {
      modalTabAssignment.classList.add('active');
      modalTabExam.classList.remove('active');
      
      assignmentFields.classList.remove('hidden');
      examFields.classList.add('hidden');
      
      labelTitle.innerHTML = '과제명 <span class="required">*</span>';
      titleInput.placeholder = '예: 컴퓨터구조 실습과제 1';
      
      // Set requirements
      titleInput.required = true;
      subjectInput.required = true;
      deadlineInput.required = true;
      importanceInput.required = true;

      // Disable exam fields requirement to prevent form block
      examDateInput.required = false;
      examTimeInput.required = false;
      classroomInput.required = false;
    } else {
      modalTabAssignment.classList.remove('active');
      modalTabExam.classList.add('active');
      
      assignmentFields.classList.add('hidden');
      examFields.classList.remove('hidden');
      
      labelTitle.innerHTML = '시험명 <span class="required">*</span>';
      titleInput.placeholder = '예: 2026학년도 1학기 중간고사';

      // Set requirements
      titleInput.required = true;
      subjectInput.required = true;
      examDateInput.required = true;
      examTimeInput.required = true;
      classroomInput.required = true;

      // Disable assignment fields requirement to prevent form block
      deadlineInput.required = false;
      importanceInput.required = false;
    }
  }

  // Opening Add Modal dialog
  function openAddModal() {
    isEditMode = false;
    modalTitle.textContent = '새로운 일정 추가';
    modalTypeTabs.classList.remove('hidden'); // Show type selector for new schedules
    
    // Reset form values
    scheduleForm.reset();
    editIdInput.value = '';
    
    // Reset defaults
    const todayISO = new Date().toISOString().split('T')[0];
    deadlineInput.value = todayISO;
    examDateInput.value = todayISO;
    
    // If a calendar date was selected, pre-populate that date
    if (selectedDate) {
      deadlineInput.value = selectedDate;
      examDateInput.value = selectedDate;
    }

    switchModalType('assignment');

    // Display modal
    scheduleModal.classList.add('active');
    scheduleModal.setAttribute('aria-hidden', 'false');
    subjectInput.focus();
  }

  // Opening Edit Modal dialog (Assignments only)
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    isEditMode = true;
    modalTitle.textContent = '과제 일정 수정';
    modalTypeTabs.classList.add('hidden'); // Hide tab switches in edit mode

    editIdInput.value = task.id;
    scheduleTypeInput.value = task.type;
    subjectInput.value = task.subject;
    titleInput.value = task.title;

    switchModalType('assignment'); // Force assignment mode inputs structure

    // Load assignment specific fields
    descriptionInput.value = task.description || '';
    deadlineInput.value = task.date;
    importanceInput.value = task.importance || 'medium';

    // Display modal
    scheduleModal.classList.add('active');
    scheduleModal.setAttribute('aria-hidden', 'false');
    subjectInput.focus();
  }

  function closeModal() {
    scheduleModal.classList.remove('active');
    scheduleModal.setAttribute('aria-hidden', 'true');
    scheduleForm.reset();
  }

  // Handle schedule creation and modification
  function handleFormSubmit(e) {
    e.preventDefault();

    const id = editIdInput.value;
    const type = scheduleTypeInput.value;
    const subject = subjectInput.value.trim();
    const title = titleInput.value.trim();

    if (!subject || !title) {
      showToast('필수 필드를 채워주세요.', 'error');
      return;
    }

    let date = '';
    let extraData = {};

    if (type === 'assignment') {
      date = deadlineInput.value;
      if (!date) {
        showToast('마감일을 입력하세요.', 'error');
        return;
      }
      extraData = {
        description: descriptionInput.value.trim(),
        importance: importanceInput.value
      };
    } else if (type === 'exam') {
      date = examDateInput.value;
      const time = examTimeInput.value;
      const classroom = classroomInput.value.trim();

      if (!date || !time || !classroom) {
        showToast('시험 시간과 강의실을 모두 정확히 기입해 주세요.', 'error');
        return;
      }

      extraData = {
        time: time,
        classroom: classroom
      };
    }

    if (isEditMode && id) {
      // Modify existing
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          subject,
          title,
          date,
          ...extraData
        };
        showToast('일정이 정상적으로 수정되었습니다.', 'success');
      }
    } else {
      // Create new task
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type,
        subject,
        title,
        date,
        ...extraData
      };
      
      tasks.push(newTask);
      showToast('새 일정이 등록되었습니다!', 'success');
    }

    saveTasks();
    closeModal();
    renderAll();
  }

  // Handle task deletion
  function handleDeleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const confirmMsg = `[${task.subject}] "${task.title}" 일정을 정말 삭제하시겠습니까?`;
    if (confirm(confirmMsg)) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      showToast('일정이 성공적으로 삭제되었습니다.', 'info');
      renderAll();
    }
  }


  // === FEEDBACK TOAST SYSTEM ===
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '🛡️';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✗';
    else if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Remove toast after animation ends (3s duration set in CSS)
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Run the application
  init();
});
