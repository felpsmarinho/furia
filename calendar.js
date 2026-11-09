/**
 * ============================================================================
 * FÚRIA VOLEIBOL - CALENDÁRIO VISUAL INTERATIVO (MÊS / SEMANA / DIA + DRAG&DROP)
 * ============================================================================
 */

(function () {
    const MONTHS_PT = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const MONTHS_SHORT_PT = [
        'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
        'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];
    const WEEKDAYS_SHORT_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const WEEKDAYS_FULL_PT = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];

    let allGames = [];
    let currentSession = null;
    let viewDate = new Date();
    let calendarViewMode = 'month'; // 'month' | 'week' | 'day'
    let selectedDateStr = null;     // YYYY-MM-DD ou null
    let filterMode = 'month';       // 'month' | 'week' | 'upcoming' | 'day'
    let selectedCategory = 'all';   // 'all' | 'Misto' | 'Masculino' | 'Feminino'
    let gameToDelete = null;
    let selectedWeekdays = new Set(); // Para recorrência semanal (0..6)

    // Elementos do DOM - Calendário
    const calendarLayoutEl = document.getElementById('calendar-layout');
    const calendarWidgetCardEl = document.getElementById('calendar-widget-card');
    const calMonthYearEl = document.getElementById('cal-month-year');
    const calPeriodSummaryEl = document.getElementById('cal-period-summary');
    const calMonthViewContainer = document.getElementById('cal-month-view-container');
    const calDaysGridEl = document.getElementById('cal-days-grid');
    const calWeekViewContainer = document.getElementById('cal-week-view-container');
    const calDayViewContainer = document.getElementById('cal-day-detail-view') || document.getElementById('cal-day-view-container');

    const calPrevBtn = document.getElementById('cal-prev-month');
    const calNextBtn = document.getElementById('cal-next-month');
    const calTodayBtn = document.getElementById('cal-today-btn');
    const calViewBtns = document.querySelectorAll('.cal-view-btn');

    // Elementos do DOM - Painel Direito
    const gamesListEl = document.getElementById('games-list');
    const gamesListTitleEl = document.getElementById('games-list-title');
    const gamesCountBadgeEl = document.getElementById('games-count-badge');
    const filterMonthBtn = document.getElementById('filter-month-btn');
    const filterWeekBtn = document.getElementById('filter-week-btn');
    const filterUpcomingBtn = document.getElementById('filter-upcoming-btn');
    const clearDayFilterBtn = document.getElementById('clear-day-filter-btn');
    const categoryPills = document.querySelectorAll('#category-filter-bar .cat-pill');

    // Elementos Admin
    const adminToolbarEl = document.getElementById('admin-calendar-toolbar');
    const adminUserEmailEl = document.getElementById('admin-user-email');
    const openNewGameModalBtn = document.getElementById('open-new-game-modal-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const navAdminLink = document.getElementById('nav-admin-link');

    // Modal de Jogo / Série Recorrente
    const gameModalOverlay = document.getElementById('game-modal-overlay');
    const gameModalTitle = document.getElementById('game-modal-title');
    const gameForm = document.getElementById('game-form');
    const closeGameModalBtn = document.getElementById('close-game-modal-btn');
    const cancelGameModalBtn = document.getElementById('cancel-game-modal-btn');
    const recentLocationsChipsEl = document.getElementById('recent-locations-chips');
    const gameFormFeedback = document.getElementById('game-form-feedback');

    // Campos de Recorrência no Modal
    const recurrenceBuilderBox = document.getElementById('recurrence-builder-box');
    const recurrenceSelect = document.getElementById('game-recurrence-input');
    const recurrenceCountGroup = document.getElementById('recurrence-count-group');
    const recurrenceCountInput = document.getElementById('game-recurrence-count');
    const recurrenceUnitLabel = document.getElementById('recurrence-unit-label');
    const recurrenceSummaryBadge = document.getElementById('recurrence-summary-badge');
    const weekdaysSelectorGroup = document.getElementById('weekdays-selector-group');
    const weekdayPillBtns = document.querySelectorAll('#weekdays-selector-group .weekday-pill');
    const allDayCheckbox = document.getElementById('game-allday-input');
    const seriesEditOptionBox = document.getElementById('series-edit-option-box');
    const applyToSeriesCheckbox = document.getElementById('apply-to-series-checkbox');

    // Modal de Exclusão
    const deleteModalOverlay = document.getElementById('delete-modal-overlay');
    const deleteSeriesOptionBox = document.getElementById('delete-series-option-box');
    const deleteEntireSeriesCheckbox = document.getElementById('delete-entire-series-checkbox');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // --- UTILITÁRIOS DE DATA ---
    function toDateString(dateObj) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function fromDateString(dateStr) {
        const [y, m, d] = (dateStr || toDateString(new Date())).split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }

    function parseDateParts(dateStr) {
        const dateObj = fromDateString(dateStr);
        const yyyy = dateObj.getFullYear();
        const mm = dateObj.getMonth() + 1;
        const dd = dateObj.getDate();
        return {
            year: yyyy,
            monthIndex: mm - 1,
            day: String(dd).padStart(2, '0'),
            monthShort: MONTHS_SHORT_PT[mm - 1] || '',
            monthFull: MONTHS_PT[mm - 1] || '',
            weekdayShort: WEEKDAYS_SHORT_PT[dateObj.getDay()] || '',
            weekdayFull: WEEKDAYS_FULL_PT[dateObj.getDay()] || '',
            formattedBR: `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`
        };
    }

    function getStartOfWeek(dateObj) {
        const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d;
    }

    function formatTimeShort(timeStr) {
        if (!timeStr) return '';
        return String(timeStr).slice(0, 5);
    }

    function getGenderCategory(game) {
        return game.gender_category || 'Misto';
    }

    function getCategoryClass(genderCategory) {
        const normalized = (genderCategory || 'Misto').toLowerCase();
        if (normalized.includes('masc')) return 'cat-masculino';
        if (normalized.includes('fem')) return 'cat-feminino';
        return 'cat-misto';
    }

    function getStatusClass(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('inscri')) return 'status-open';
        if (s.includes('adiado')) return 'status-postponed';
        if (s.includes('cancelado')) return 'status-cancelled';
        if (s.includes('conclu')) return 'status-completed';
        return 'status-confirmed';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function generateUuidV4() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function isAdminLogged() {
        return Boolean(currentSession && currentSession.user);
    }

    // --- INICIALIZAÇÃO ---
    async function initCalendar() {
        if (!calDaysGridEl || !window.FuriaDataService) return;

        await checkAdminState();
        window.FuriaDataService.startInactivityGuard(async () => {
            await checkAdminState();
            renderAll();
        });

        await loadAndRenderGames();
        bindEvents();
    }

    async function checkAdminState() {
        currentSession = await window.FuriaDataService.getCurrentSession();
        const isLogged = isAdminLogged();

        if (adminToolbarEl) {
            adminToolbarEl.style.display = isLogged ? 'flex' : 'none';
        }

        if (calendarWidgetCardEl) {
            calendarWidgetCardEl.style.display = isLogged ? 'block' : 'none';
        }

        if (calendarLayoutEl) {
            calendarLayoutEl.classList.toggle('visitor-only-cards', !isLogged);
        }

        if (isLogged) {
            if (adminUserEmailEl) {
                adminUserEmailEl.textContent = currentSession.user.email;
            }
            if (navAdminLink) {
                navAdminLink.innerHTML = '<i class="fa-solid fa-user-shield"></i> Admin Ativo';
                navAdminLink.href = '#calendar';
                navAdminLink.classList.add('admin-logged');
            }
        } else {
            if (filterMode === 'day') {
                selectedDateStr = null;
                filterMode = 'month';
            }
            if (navAdminLink) {
                navAdminLink.innerHTML = '<i class="fa-solid fa-lock"></i> Área Admin';
                navAdminLink.href = 'login.html';
                navAdminLink.classList.remove('admin-logged');
            }
        }
    }

    async function loadAndRenderGames() {
        try {
            allGames = await window.FuriaDataService.fetchGames();
        } catch (err) {
            console.error(err);
            allGames = [];
        }
        renderAll();
    }

    function renderAll() {
        updateViewContainersVisibility();
        if (calendarViewMode === 'month') {
            renderMonthView();
        } else if (calendarViewMode === 'week') {
            renderWeekView();
        } else {
            renderDayView();
        }
        renderGamesList();
    }

    function updateViewContainersVisibility() {
        if (calMonthViewContainer) calMonthViewContainer.style.display = calendarViewMode === 'month' ? 'block' : 'none';
        if (calWeekViewContainer) calWeekViewContainer.style.display = calendarViewMode === 'week' ? 'flex' : 'none';
        if (calDayViewContainer) calDayViewContainer.style.display = calendarViewMode === 'day' ? 'block' : 'none';

        calViewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-cal-view') === calendarViewMode);
        });
    }

    function getGamesByDateMap() {
        const map = {};
        allGames.forEach(g => {
            const gCat = getGenderCategory(g);
            if (selectedCategory !== 'all' && gCat !== selectedCategory) return;
            if (!map[g.game_date]) map[g.game_date] = [];
            map[g.game_date].push(g);
        });
        return map;
    }

    // --- 1. VISTA MENSAL ---
    function renderMonthView() {
        if (!calDaysGridEl || !calMonthYearEl) return;

        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const isAdmin = isAdminLogged();

        calMonthYearEl.textContent = `${MONTHS_PT[month]} ${year}`;
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthTotal = allGames.filter(g => (g.game_date || '').startsWith(monthPrefix)).length;
        if (calPeriodSummaryEl) {
            calPeriodSummaryEl.textContent = monthTotal === 1 ? '1 evento neste mês' : `${monthTotal} eventos neste mês`;
        }

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = toDateString(new Date());
        const gamesByDate = getGamesByDateMap();

        calDaysGridEl.innerHTML = '';

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day empty';
            calDaysGridEl.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayGames = gamesByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;

            const dayCell = document.createElement('div');
            dayCell.className = 'cal-day';
            dayCell.setAttribute('data-date', dateStr);
            if (isToday) dayCell.classList.add('today');
            if (isSelected) dayCell.classList.add('selected');
            if (dayGames.length > 0) dayCell.classList.add('has-games');

            const topRow = document.createElement('div');
            topRow.className = 'cal-day-top';

            const dayNumSpan = document.createElement('span');
            dayNumSpan.className = 'cal-day-number';
            dayNumSpan.textContent = day;
            topRow.appendChild(dayNumSpan);

            if (isAdmin) {
                const quickAddBtn = document.createElement('button');
                quickAddBtn.type = 'button';
                quickAddBtn.className = 'cal-quick-add-btn';
                quickAddBtn.title = `Adicionar jogo em ${day}/${month + 1}`;
                quickAddBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
                quickAddBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openGameModal(null, dateStr);
                });
                topRow.appendChild(quickAddBtn);
            }

            dayCell.appendChild(topRow);

            if (dayGames.length > 0) {
                const chipsWrap = document.createElement('div');
                chipsWrap.className = 'cal-day-chips';

                dayGames.slice(0, 2).forEach(g => {
                    const chip = document.createElement('div');
                    const catClass = getCategoryClass(getGenderCategory(g));
                    chip.className = `cal-event-chip ${catClass}`;
                    chip.title = `${formatTimeShort(g.start_time)} • ${g.title} (${getGenderCategory(g)} - ${g.game_level || 'Intermediário'})`;
                    chip.textContent = `${g.all_day ? 'Dia Int.' : formatTimeShort(g.start_time)} ${g.title}`;

                    if (isAdmin) {
                        chip.draggable = true;
                        chip.classList.add('admin-draggable');
                        chip.addEventListener('dragstart', (e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData('text/plain', String(g.id));
                            chip.classList.add('dragging');
                        });
                        chip.addEventListener('dragend', () => {
                            chip.classList.remove('dragging');
                        });
                        chip.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openGameModal(g);
                        });
                    }

                    chipsWrap.appendChild(chip);
                });

                if (dayGames.length > 2) {
                    const moreSpan = document.createElement('span');
                    moreSpan.className = 'cal-more-count';
                    moreSpan.textContent = `+${dayGames.length - 2}`;
                    chipsWrap.appendChild(moreSpan);
                }

                dayCell.appendChild(chipsWrap);
            }

            if (isAdmin) {
                dayCell.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dayCell.classList.add('drag-over');
                });
                dayCell.addEventListener('dragleave', () => {
                    dayCell.classList.remove('drag-over');
                });
                dayCell.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    dayCell.classList.remove('drag-over');
                    const draggedGameId = e.dataTransfer.getData('text/plain');
                    if (!draggedGameId) return;
                    const found = allGames.find(g => String(g.id) === String(draggedGameId));
                    if (found && found.game_date !== dateStr) {
                        try {
                            await window.FuriaDataService.moveGameDate(draggedGameId, dateStr);
                            await loadAndRenderGames();
                        } catch (err) {
                            alert(err.message || 'Erro ao mover data do jogo.');
                        }
                    }
                });
            }

            dayCell.addEventListener('click', () => {
                if (selectedDateStr === dateStr && filterMode === 'day') {
                    selectedDateStr = null;
                    filterMode = 'month';
                } else {
                    selectedDateStr = dateStr;
                    filterMode = 'day';
                }
                updateFilterButtonsUI();
                renderAll();
            });

            calDaysGridEl.appendChild(dayCell);
        }
    }

    // --- 2. VISTA SEMANAL ---
    function renderWeekView() {
        if (!calWeekViewContainer || !calMonthYearEl) return;

        const baseDate = selectedDateStr ? fromDateString(selectedDateStr) : viewDate;
        const weekStart = getStartOfWeek(baseDate);
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
        const todayStr = toDateString(new Date());
        const isAdmin = isAdminLogged();
        const gamesByDate = getGamesByDateMap();

        const startParts = parseDateParts(toDateString(weekStart));
        const endParts = parseDateParts(toDateString(weekEnd));
        calMonthYearEl.textContent = `Semana: ${startParts.day} ${startParts.monthShort} — ${endParts.day} ${endParts.monthShort} ${endParts.year}`;

        calWeekViewContainer.innerHTML = '';
        let weekTotal = 0;

        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
            const dateStr = toDateString(d);
            const parts = parseDateParts(dateStr);
            const dayGames = gamesByDate[dateStr] || [];
            weekTotal += dayGames.length;

            const dayCol = document.createElement('div');
            dayCol.className = 'week-day-row';
            if (dateStr === todayStr) dayCol.classList.add('today');
            if (dateStr === selectedDateStr) dayCol.classList.add('selected');

            const headerHtml = `
                <div class="week-day-header">
                    <div class="week-day-badge">
                        <span class="week-day-name">${parts.weekdayShort}</span>
                        <span class="week-day-num">${parts.day}/${String(parts.monthIndex + 1).padStart(2, '0')}</span>
                    </div>
                    ${isAdmin ? `<button type="button" class="week-add-btn" data-date="${dateStr}" title="Agendar neste dia"><i class="fa-solid fa-plus"></i> Agendar</button>` : ''}
                </div>
            `;

            const eventsHtml = dayGames.length === 0
                ? `<div class="week-day-empty">Sem jogos agendados</div>`
                : dayGames.map(g => {
                    const gCat = getGenderCategory(g);
                    const catClass = getCategoryClass(gCat);
                    return `
                    <div class="week-event-card ${catClass} ${isAdmin ? 'admin-clickable' : ''}"
                         data-game-id="${escapeHtml(g.id)}"
                         ${isAdmin ? 'draggable="true"' : ''}>
                        <div class="week-event-time">
                            <i class="fa-regular fa-clock"></i> ${g.all_day ? 'Dia Inteiro' : escapeHtml(formatTimeShort(g.start_time))}
                            <span class="rec-mini-tag">${escapeHtml(gCat)} • ${escapeHtml(g.game_level || 'Intermediário')}</span>
                        </div>
                        <div class="week-event-title">${escapeHtml(g.title)}</div>
                        <div class="week-event-loc">
                            <i class="fa-solid fa-location-dot text-accent"></i> ${escapeHtml(g.location_name)}
                        </div>
                    </div>
                `;
                }).join('');

            dayCol.innerHTML = `${headerHtml}<div class="week-day-events">${eventsHtml}</div>`;

            dayCol.addEventListener('click', () => {
                selectedDateStr = dateStr;
                filterMode = 'day';
                updateFilterButtonsUI();
                renderGamesList();
            });

            if (isAdmin) {
                const addBtn = dayCol.querySelector('.week-add-btn');
                if (addBtn) {
                    addBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openGameModal(null, dateStr);
                    });
                }

                dayCol.querySelectorAll('.week-event-card').forEach(cardEl => {
                    const gId = cardEl.getAttribute('data-game-id');
                    const found = allGames.find(item => String(item.id) === String(gId));
                    if (!found) return;

                    cardEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openGameModal(found);
                    });

                    cardEl.addEventListener('dragstart', (e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('text/plain', String(found.id));
                    });
                });

                dayCol.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dayCol.classList.add('drag-over');
                });
                dayCol.addEventListener('dragleave', () => {
                    dayCol.classList.remove('drag-over');
                });
                dayCol.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    dayCol.classList.remove('drag-over');
                    const draggedGameId = e.dataTransfer.getData('text/plain');
                    if (!draggedGameId) return;
                    const found = allGames.find(g => String(g.id) === String(draggedGameId));
                    if (found && found.game_date !== dateStr) {
                        await window.FuriaDataService.moveGameDate(draggedGameId, dateStr);
                        await loadAndRenderGames();
                    }
                });
            }

            calWeekViewContainer.appendChild(dayCol);
        }

        if (calPeriodSummaryEl) {
            calPeriodSummaryEl.textContent = weekTotal === 1 ? '1 evento nesta semana' : `${weekTotal} eventos nesta semana`;
        }
    }

    // --- 3. VISTA DIÁRIA ---
    function renderDayView() {
        if (!calDayViewContainer || !calMonthYearEl) return;

        const targetDateStr = selectedDateStr || toDateString(viewDate);
        const parts = parseDateParts(targetDateStr);
        const isAdmin = isAdminLogged();
        const gamesByDate = getGamesByDateMap();
        const dayGames = gamesByDate[targetDateStr] || [];

        calMonthYearEl.textContent = `${parts.weekdayFull}, ${parts.day} de ${parts.monthFull}`;
        if (calPeriodSummaryEl) {
            calPeriodSummaryEl.textContent = dayGames.length === 1 ? '1 evento agendado' : `${dayGames.length} eventos agendados`;
        }

        calDayViewContainer.innerHTML = `
            <div class="day-view-banner">
                <div>
                    <span class="day-view-date-pill">${parts.formattedBR}</span>
                    <h4>Programação Diária da Fúria</h4>
                </div>
                ${isAdmin ? `
                    <button type="button" class="btn primary-btn btn-sm" id="day-view-add-btn">
                        <i class="fa-solid fa-plus"></i> Adicionar Horário neste Dia
                    </button>
                ` : ''}
            </div>
            <div class="day-view-timeline">
                ${dayGames.length === 0 ? `
                    <div class="week-day-empty">Nenhum jogo ou treino cadastrado para ${parts.formattedBR}.</div>
                ` : dayGames.map(g => {
                    const gCat = getGenderCategory(g);
                    return `
                    <div class="day-timeline-item ${getCategoryClass(gCat)}" data-id="${escapeHtml(g.id)}">
                        <div class="timeline-hour">${g.all_day ? 'DIA INTEIRO' : escapeHtml(formatTimeShort(g.start_time))}</div>
                        <div class="timeline-body">
                            <strong>${escapeHtml(g.title)} <small>(${escapeHtml(gCat)} • ${escapeHtml(g.game_level || 'Intermediário')})</small></strong>
                            <span><i class="fa-solid fa-location-dot text-accent"></i> ${escapeHtml(g.location_name)}</span>
                        </div>
                        ${isAdmin ? `<button type="button" class="timeline-edit-btn" data-id="${escapeHtml(g.id)}"><i class="fa-solid fa-pen"></i></button>` : ''}
                    </div>
                `;
                }).join('')}
            </div>
        `;

        const addBtn = document.getElementById('day-view-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openGameModal(null, targetDateStr));
        }

        calDayViewContainer.querySelectorAll('.timeline-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const found = allGames.find(g => String(g.id) === String(btn.getAttribute('data-id')));
                if (found) openGameModal(found);
            });
        });
    }

    // --- PAINEL DIREITO: LISTA DE JOGOS DETALHADOS ---
    function renderGamesList() {
        if (!gamesListEl) return;

        const year = viewDate.getFullYear();
        const monthPrefix = `${year}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
        const todayStr = toDateString(new Date());
        const isAdmin = isAdminLogged();

        let filtered = allGames.slice();

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(g => getGenderCategory(g) === selectedCategory);
        }

        if (filterMode === 'day' && selectedDateStr) {
            const parts = parseDateParts(selectedDateStr);
            if (gamesListTitleEl) {
                gamesListTitleEl.innerHTML = `<i class="fa-regular fa-calendar-check text-accent"></i> Jogos em ${parts.formattedBR}`;
            }
            if (clearDayFilterBtn) clearDayFilterBtn.style.display = 'inline-flex';
            filtered = filtered.filter(g => g.game_date === selectedDateStr);
        } else if (filterMode === 'week') {
            const baseDate = selectedDateStr ? fromDateString(selectedDateStr) : viewDate;
            const wStart = toDateString(getStartOfWeek(baseDate));
            const wEndObj = getStartOfWeek(baseDate);
            wEndObj.setDate(wEndObj.getDate() + 6);
            const wEnd = toDateString(wEndObj);

            if (gamesListTitleEl) {
                gamesListTitleEl.innerHTML = `<i class="fa-solid fa-calendar-week text-accent"></i> Jogos da Semana`;
            }
            if (clearDayFilterBtn) clearDayFilterBtn.style.display = 'none';
            filtered = filtered.filter(g => g.game_date >= wStart && g.game_date <= wEnd);
        } else if (filterMode === 'upcoming') {
            if (gamesListTitleEl) {
                gamesListTitleEl.innerHTML = `<i class="fa-solid fa-fire text-accent"></i> Próximos Jogos da Fúria`;
            }
            if (clearDayFilterBtn) clearDayFilterBtn.style.display = 'none';
            filtered = filtered.filter(g => g.game_date >= todayStr);
        } else {
            if (gamesListTitleEl) {
                gamesListTitleEl.innerHTML = `<i class="fa-solid fa-volleyball text-accent"></i> Jogos de ${MONTHS_PT[viewDate.getMonth()]}`;
            }
            if (clearDayFilterBtn) clearDayFilterBtn.style.display = 'none';
            filtered = filtered.filter(g => (g.game_date || '').startsWith(monthPrefix));
        }

        if (gamesCountBadgeEl) {
            gamesCountBadgeEl.textContent = filtered.length === 1 ? '1 Jogo' : `${filtered.length} Jogos`;
        }

        if (filtered.length === 0) {
            const emptyHint = isAdmin
                ? `<button type="button" class="btn primary-btn btn-sm" id="empty-add-game-btn">
                       <i class="fa-solid fa-calendar-plus"></i> Criar Jogo ${selectedDateStr ? 'nesta Data' : 'Agora'}
                   </button>`
                : '';

            gamesListEl.innerHTML = `
                <div class="games-empty-state">
                    <i class="fa-solid fa-volleyball empty-icon"></i>
                    <h4>Nenhum evento encontrado para este filtro</h4>
                    <p>${selectedDateStr
                        ? 'Não há jogos cadastrados para o dia selecionado.'
                        : 'Fique atento! Novas datas da Fúria Voleibol serão publicadas aqui.'}</p>
                    ${emptyHint}
                </div>
            `;

            const emptyAddBtn = document.getElementById('empty-add-game-btn');
            if (emptyAddBtn) {
                emptyAddBtn.addEventListener('click', () => {
                    openGameModal(null, selectedDateStr);
                });
            }
            return;
        }

        gamesListEl.innerHTML = filtered.map(game => {
            const parts = parseDateParts(game.game_date);
            const startTime = formatTimeShort(game.start_time);
            const endTime = formatTimeShort(game.end_time);
            const timeLabel = game.all_day
                ? 'Dia Inteiro'
                : (endTime ? `${startTime} às ${endTime}` : startTime);

            const genderCat = getGenderCategory(game);
            const catClass = getCategoryClass(genderCat);
            const statusClass = getStatusClass(game.status);

            const recurrenceBadge = game.recurrence_type && game.recurrence_type !== 'unico'
                ? `<span class="game-recurrence-pill"><i class="fa-solid fa-repeat"></i> ${escapeHtml(game.recurrence_label || game.recurrence_type)}</span>`
                : '';

            const levelBadge = `<span class="game-level-pill"><i class="fa-solid fa-signal"></i> Nível: ${escapeHtml(game.game_level || 'Intermediário')}</span>`;

            const statusBadge = game.status
                ? `<span class="game-status-pill ${statusClass}">${escapeHtml(game.status)}</span>`
                : '';

            const mapsBtnHtml = game.maps_url
                ? `<a href="${escapeHtml(game.maps_url)}" target="_blank" rel="noopener noreferrer" class="game-maps-btn">
                       <i class="fa-solid fa-map-location-dot"></i> Abrir no Maps
                   </a>`
                : '';

            const registrationBtnHtml = game.registration_url
                ? `<a href="${escapeHtml(game.registration_url)}" target="_blank" rel="noopener noreferrer" class="game-register-btn">
                       <i class="fa-solid fa-bolt"></i> Inscrever-se no Jogo
                   </a>`
                : '';

            const adminActionsHtml = isAdmin ? `
                <div class="game-admin-actions">
                    <button type="button" class="admin-action-btn edit-game-btn" data-id="${escapeHtml(game.id)}" title="Editar Jogo">
                        <i class="fa-solid fa-pen-to-square"></i> Editar
                    </button>
                    <button type="button" class="admin-action-btn duplicate-game-btn" data-id="${escapeHtml(game.id)}" title="Duplicar Jogo para outra data">
                        <i class="fa-regular fa-copy"></i> Duplicar
                    </button>
                    <button type="button" class="admin-action-btn delete-game-btn" data-id="${escapeHtml(game.id)}" title="Excluir Jogo">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            ` : '';

            return `
                <article class="game-card ${catClass}-border">
                    <div class="game-date-badge">
                        <span class="game-weekday">${parts.weekdayShort}</span>
                        <span class="game-day">${parts.day}</span>
                        <span class="game-month">${parts.monthShort}</span>
                    </div>

                    <div class="game-details">
                        <div class="game-header-row">
                            <div class="game-tags-wrap">
                                <span class="game-category-tag ${catClass}">${escapeHtml(genderCat)}</span>
                                ${levelBadge}
                                ${recurrenceBadge}
                                ${statusBadge}
                            </div>
                            <span class="game-time"><i class="fa-regular fa-clock"></i> ${escapeHtml(timeLabel)}</span>
                        </div>

                        <h3 class="game-title">${escapeHtml(game.title)}</h3>
                        ${game.opponent ? `<p class="game-opponent"><i class="fa-solid fa-shield-halved text-accent"></i> Adversário: <strong>${escapeHtml(game.opponent)}</strong></p>` : ''}

                        <div class="game-location-row">
                            <div class="game-location-name">
                                <i class="fa-solid fa-location-dot text-accent"></i>
                                <span>${escapeHtml(game.location_name)}</span>
                            </div>
                            <div class="game-cta-links">
                                ${mapsBtnHtml}
                                ${registrationBtnHtml}
                            </div>
                        </div>

                        ${game.notes ? `<p class="game-notes"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(game.notes)}</p>` : ''}
                        ${adminActionsHtml}
                    </div>
                </article>
            `;
        }).join('');

        if (isAdmin) {
            gamesListEl.querySelectorAll('.edit-game-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const found = allGames.find(g => String(g.id) === String(id));
                    if (found) openGameModal(found);
                });
            });

            gamesListEl.querySelectorAll('.duplicate-game-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const found = allGames.find(g => String(g.id) === String(id));
                    if (found) openDuplicateGameModal(found);
                });
            });

            gamesListEl.querySelectorAll('.delete-game-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const found = allGames.find(g => String(g.id) === String(id));
                    if (found) openDeleteModal(found);
                });
            });
        }
    }

    function updateFilterButtonsUI() {
        if (filterMonthBtn) filterMonthBtn.classList.toggle('active', filterMode === 'month');
        if (filterWeekBtn) filterWeekBtn.classList.toggle('active', filterMode === 'week');
        if (filterUpcomingBtn) filterUpcomingBtn.classList.toggle('active', filterMode === 'upcoming');
    }

    // --- CONSTRUTOR DE RECORRÊNCIA ---
    function updateRecurrenceUI() {
        if (!recurrenceSelect) return;
        const type = recurrenceSelect.value;
        const count = Math.max(1, Math.min(52, parseInt(recurrenceCountInput.value, 10) || 1));

        if (type === 'unico') {
            if (recurrenceCountGroup) recurrenceCountGroup.style.display = 'none';
            if (weekdaysSelectorGroup) weekdaysSelectorGroup.style.display = 'none';
            if (recurrenceSummaryBadge) recurrenceSummaryBadge.textContent = '1 data será agendada';
            return;
        }

        if (recurrenceCountGroup) recurrenceCountGroup.style.display = 'block';

        if (type === 'diario') {
            if (recurrenceUnitLabel) recurrenceUnitLabel.textContent = 'dias seguidos';
            if (weekdaysSelectorGroup) weekdaysSelectorGroup.style.display = 'none';
            if (recurrenceSummaryBadge) recurrenceSummaryBadge.textContent = `${count} dias seguidos serão agendados`;
        } else if (type === 'semanal') {
            if (recurrenceUnitLabel) recurrenceUnitLabel.textContent = 'semanas';
            if (weekdaysSelectorGroup) weekdaysSelectorGroup.style.display = 'block';
            const daysCount = Math.max(1, selectedWeekdays.size);
            const totalEvents = count * daysCount;
            if (recurrenceSummaryBadge) {
                recurrenceSummaryBadge.textContent = `${totalEvents} jogos (${daysCount}x por semana durante ${count} semanas)`;
            }
        } else if (type === 'quinzenal') {
            if (recurrenceUnitLabel) recurrenceUnitLabel.textContent = 'quinzenas';
            if (weekdaysSelectorGroup) weekdaysSelectorGroup.style.display = 'none';
            if (recurrenceSummaryBadge) recurrenceSummaryBadge.textContent = `${count} jogos quinzenais serão agendados`;
        } else if (type === 'mensal') {
            if (recurrenceUnitLabel) recurrenceUnitLabel.textContent = 'meses';
            if (weekdaysSelectorGroup) weekdaysSelectorGroup.style.display = 'none';
            if (recurrenceSummaryBadge) recurrenceSummaryBadge.textContent = `${count} jogos mensais serão agendados`;
        }
    }

    function syncWeekdayPillsUI() {
        weekdayPillBtns.forEach(btn => {
            const d = Number(btn.getAttribute('data-day'));
            btn.classList.toggle('active', selectedWeekdays.has(d));
        });
    }

    function buildRecurrenceDates(baseDateStr, recurrenceType, count, weekdaySet) {
        const startObj = fromDateString(baseDateStr);
        const totalRepeats = Math.max(1, Math.min(52, Number(count) || 1));

        if (recurrenceType === 'unico') {
            return { dates: [baseDateStr], label: 'Jogo Único', seriesId: null };
        }

        const seriesId = generateUuidV4();
        const dates = [];

        if (recurrenceType === 'diario') {
            for (let i = 0; i < totalRepeats; i++) {
                const d = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate() + i);
                dates.push(toDateString(d));
            }
            return { dates, label: `Diário (${totalRepeats} dias)`, seriesId };
        }

        if (recurrenceType === 'semanal') {
            const daysArray = Array.from(weekdaySet).sort((a, b) => a - b);
            if (daysArray.length === 0) {
                daysArray.push(startObj.getDay());
            }
            const weekStart = getStartOfWeek(startObj);
            for (let w = 0; w < totalRepeats; w++) {
                daysArray.forEach(weekday => {
                    const candidate = new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() + (w * 7) + weekday
                    );
                    if (toDateString(candidate) >= baseDateStr) {
                        dates.push(toDateString(candidate));
                    }
                });
            }
            if (dates.length === 0) dates.push(baseDateStr);
            const dayNames = daysArray.map(d => WEEKDAYS_SHORT_PT[d]).join(', ');
            return { dates, label: `Semanal (${dayNames})`, seriesId };
        }

        if (recurrenceType === 'quinzenal') {
            for (let i = 0; i < totalRepeats; i++) {
                const d = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate() + (i * 14));
                dates.push(toDateString(d));
            }
            return { dates, label: 'Quinzenal', seriesId };
        }

        if (recurrenceType === 'mensal') {
            for (let i = 0; i < totalRepeats; i++) {
                const d = new Date(startObj.getFullYear(), startObj.getMonth() + i, startObj.getDate());
                dates.push(toDateString(d));
            }
            return { dates, label: 'Mensal', seriesId };
        }

        return { dates: [baseDateStr], label: 'Jogo Único', seriesId: null };
    }

    function renderRecentLocationsChips() {
        if (!recentLocationsChipsEl) return;
        const uniqueMap = new Map();

        allGames.forEach(g => {
            if (g.location_name && !uniqueMap.has(g.location_name)) {
                uniqueMap.set(g.location_name, g.maps_url || '');
            }
        });

        const entries = Array.from(uniqueMap.entries()).slice(0, 4);
        if (entries.length === 0) {
            recentLocationsChipsEl.innerHTML = '';
            return;
        }

        recentLocationsChipsEl.innerHTML = `<span class="recent-loc-label">Locais salvos:</span>` +
            entries.map(([name, url]) => `
                <button type="button" class="recent-loc-chip" data-name="${escapeHtml(name)}" data-url="${escapeHtml(url)}">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(name)}
                </button>
            `).join('');

        recentLocationsChipsEl.querySelectorAll('.recent-loc-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.getElementById('game-location-input').value = chip.getAttribute('data-name');
                document.getElementById('game-maps-input').value = chip.getAttribute('data-url') || '';
            });
        });
    }

    // --- MODAL DE CRIAR / EDITAR / DUPLICAR ---
    function openGameModal(game = null, prefillDate = null) {
        if (!gameModalOverlay || !gameForm) return;

        gameForm.reset();
        if (gameFormFeedback) {
            gameFormFeedback.style.display = 'none';
            gameFormFeedback.textContent = '';
        }

        renderRecentLocationsChips();

        const idInput = document.getElementById('game-id-input');
        const seriesIdInput = document.getElementById('game-series-id-input');
        const titleInput = document.getElementById('game-title-input');
        const genderCategoryInput = document.getElementById('game-gender-category-input');
        const level3Input = document.getElementById('game-level-3-input');
        const statusInput = document.getElementById('game-status-input');
        const opponentInput = document.getElementById('game-opponent-input');
        const dateInput = document.getElementById('game-date-input');
        const startInput = document.getElementById('game-start-input');
        const endInput = document.getElementById('game-end-input');
        const locationInput = document.getElementById('game-location-input');
        const mapsInput = document.getElementById('game-maps-input');
        const registrationInput = document.getElementById('game-registration-input');
        const notesInput = document.getElementById('game-notes-input');

        if (game) {
            gameModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-accent"></i> Editar Jogo / Evento';
            idInput.value = game.id;
            seriesIdInput.value = game.series_id || '';
            titleInput.value = game.title || '';
            genderCategoryInput.value = getGenderCategory(game);
            level3Input.value = game.game_level || 'Intermediário';
            statusInput.value = game.status || '';
            opponentInput.value = game.opponent || '';
            dateInput.value = game.game_date || '';
            startInput.value = formatTimeShort(game.start_time) || '20:00';
            endInput.value = formatTimeShort(game.end_time) || '';
            if (allDayCheckbox) {
                allDayCheckbox.checked = Boolean(game.all_day);
                startInput.disabled = Boolean(game.all_day);
                endInput.disabled = Boolean(game.all_day);
            }
            locationInput.value = game.location_name || '';
            mapsInput.value = game.maps_url || '';
            registrationInput.value = game.registration_url || '';
            notesInput.value = game.notes || '';

            if (recurrenceBuilderBox) recurrenceBuilderBox.style.display = 'none';
            if (seriesEditOptionBox) {
                seriesEditOptionBox.style.display = game.series_id ? 'block' : 'none';
                if (applyToSeriesCheckbox) applyToSeriesCheckbox.checked = false;
            }
        } else {
            gameModalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus text-accent"></i> Agendar Novo Jogo / Série';
            idInput.value = '';
            seriesIdInput.value = '';
            const initialDate = prefillDate || selectedDateStr || toDateString(new Date());
            genderCategoryInput.value = 'Misto';
            level3Input.value = 'Intermediário';
            statusInput.value = '';
            dateInput.value = initialDate;
            startInput.value = '20:00';
            endInput.value = '22:00';
            if (allDayCheckbox) {
                allDayCheckbox.checked = false;
                startInput.disabled = false;
                endInput.disabled = false;
            }
            if (recurrenceBuilderBox) recurrenceBuilderBox.style.display = 'block';
            if (seriesEditOptionBox) seriesEditOptionBox.style.display = 'none';

            selectedWeekdays.clear();
            selectedWeekdays.add(fromDateString(initialDate).getDay());
            syncWeekdayPillsUI();
            if (recurrenceSelect) recurrenceSelect.value = 'unico';
            if (recurrenceCountInput) recurrenceCountInput.value = '4';
            updateRecurrenceUI();
        }

        gameModalOverlay.classList.add('active');
    }

    function openDuplicateGameModal(game) {
        openGameModal(null, game.game_date);
        gameModalTitle.innerHTML = '<i class="fa-regular fa-copy text-accent"></i> Duplicar Jogo / Criar Série';
        document.getElementById('game-title-input').value = game.title || '';
        document.getElementById('game-gender-category-input').value = getGenderCategory(game);
        document.getElementById('game-level-3-input').value = game.game_level || 'Intermediário';
        document.getElementById('game-status-input').value = game.status || '';
        document.getElementById('game-opponent-input').value = game.opponent || '';
        document.getElementById('game-start-input').value = formatTimeShort(game.start_time) || '20:00';
        document.getElementById('game-end-input').value = formatTimeShort(game.end_time) || '';
        document.getElementById('game-location-input').value = game.location_name || '';
        document.getElementById('game-maps-input').value = game.maps_url || '';
        document.getElementById('game-registration-input').value = game.registration_url || '';
        document.getElementById('game-notes-input').value = game.notes || '';
    }

    function closeGameModal() {
        if (gameModalOverlay) gameModalOverlay.classList.remove('active');
    }

    function openDeleteModal(game) {
        gameToDelete = game;
        if (deleteSeriesOptionBox) {
            deleteSeriesOptionBox.style.display = game.series_id ? 'block' : 'none';
            if (deleteEntireSeriesCheckbox) deleteEntireSeriesCheckbox.checked = false;
        }
        if (deleteModalOverlay) deleteModalOverlay.classList.add('active');
    }

    function closeDeleteModal() {
        gameToDelete = null;
        if (deleteModalOverlay) deleteModalOverlay.classList.remove('active');
    }

    // --- EVENT LISTENERS ---
    function bindEvents() {
        calViewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                calendarViewMode = btn.getAttribute('data-cal-view') || 'month';
                if (calendarViewMode === 'week') {
                    filterMode = 'week';
                } else if (calendarViewMode === 'day') {
                    if (!selectedDateStr) selectedDateStr = toDateString(viewDate);
                    filterMode = 'day';
                } else {
                    filterMode = 'month';
                }
                updateFilterButtonsUI();
                renderAll();
            });
        });

        if (calPrevBtn) {
            calPrevBtn.addEventListener('click', () => {
                if (calendarViewMode === 'week') {
                    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 7);
                    selectedDateStr = toDateString(viewDate);
                } else if (calendarViewMode === 'day') {
                    const base = selectedDateStr ? fromDateString(selectedDateStr) : viewDate;
                    base.setDate(base.getDate() - 1);
                    viewDate = base;
                    selectedDateStr = toDateString(base);
                } else {
                    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
                    selectedDateStr = null;
                    if (filterMode === 'day') filterMode = 'month';
                }
                updateFilterButtonsUI();
                renderAll();
            });
        }

        if (calNextBtn) {
            calNextBtn.addEventListener('click', () => {
                if (calendarViewMode === 'week') {
                    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 7);
                    selectedDateStr = toDateString(viewDate);
                } else if (calendarViewMode === 'day') {
                    const base = selectedDateStr ? fromDateString(selectedDateStr) : viewDate;
                    base.setDate(base.getDate() + 1);
                    viewDate = base;
                    selectedDateStr = toDateString(base);
                } else {
                    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                    selectedDateStr = null;
                    if (filterMode === 'day') filterMode = 'month';
                }
                updateFilterButtonsUI();
                renderAll();
            });
        }

        if (calTodayBtn) {
            calTodayBtn.addEventListener('click', () => {
                viewDate = new Date();
                selectedDateStr = calendarViewMode === 'day' ? toDateString(viewDate) : null;
                filterMode = calendarViewMode === 'week' ? 'week' : (calendarViewMode === 'day' ? 'day' : 'month');
                updateFilterButtonsUI();
                renderAll();
            });
        }

        if (filterMonthBtn) {
            filterMonthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedDateStr = null;
                filterMode = 'month';
                updateFilterButtonsUI();
                renderAll();
            });
        }

        if (filterWeekBtn) {
            filterWeekBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                filterMode = 'week';
                updateFilterButtonsUI();
                renderGamesList();
            });
        }

        if (filterUpcomingBtn) {
            filterUpcomingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedDateStr = null;
                filterMode = 'upcoming';
                updateFilterButtonsUI();
                renderAll();
            });
        }

        if (clearDayFilterBtn) {
            clearDayFilterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedDateStr = null;
                filterMode = 'month';
                updateFilterButtonsUI();
                renderAll();
            });
        }

        categoryPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                categoryPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedCategory = pill.getAttribute('data-cat') || 'all';
                renderAll();
            });
        });

        if (recurrenceSelect) {
            recurrenceSelect.addEventListener('change', updateRecurrenceUI);
        }
        if (recurrenceCountInput) {
            recurrenceCountInput.addEventListener('input', updateRecurrenceUI);
        }

        weekdayPillBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const dayNum = Number(btn.getAttribute('data-day'));
                if (selectedWeekdays.has(dayNum)) {
                    if (selectedWeekdays.size > 1) selectedWeekdays.delete(dayNum);
                } else {
                    selectedWeekdays.add(dayNum);
                }
                syncWeekdayPillsUI();
                updateRecurrenceUI();
            });
        });

        const dateInputEl = document.getElementById('game-date-input');
        if (dateInputEl) {
            dateInputEl.addEventListener('change', () => {
                if (selectedWeekdays.size <= 1 && dateInputEl.value) {
                    selectedWeekdays.clear();
                    selectedWeekdays.add(fromDateString(dateInputEl.value).getDay());
                    syncWeekdayPillsUI();
                    updateRecurrenceUI();
                }
            });
        }

        if (allDayCheckbox) {
            allDayCheckbox.addEventListener('change', () => {
                const startInput = document.getElementById('game-start-input');
                const endInput = document.getElementById('game-end-input');
                startInput.disabled = allDayCheckbox.checked;
                endInput.disabled = allDayCheckbox.checked;
            });
        }

        if (openNewGameModalBtn) {
            openNewGameModalBtn.addEventListener('click', () => {
                openGameModal(null, selectedDateStr);
            });
        }

        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener('click', async () => {
                await window.FuriaDataService.signOut();
                await checkAdminState();
                renderAll();
            });
        }

        if (closeGameModalBtn) closeGameModalBtn.addEventListener('click', closeGameModal);
        if (cancelGameModalBtn) cancelGameModalBtn.addEventListener('click', closeGameModal);

        if (gameModalOverlay) {
            gameModalOverlay.addEventListener('click', (e) => {
                if (e.target === gameModalOverlay) closeGameModal();
            });
        }

        if (gameForm) {
            gameForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('save-game-btn');
                const id = document.getElementById('game-id-input').value;
                const existingSeriesId = document.getElementById('game-series-id-input').value;

                const basePayload = {
                    title: document.getElementById('game-title-input').value,
                    gender_category: document.getElementById('game-gender-category-input').value,
                    game_level: document.getElementById('game-level-3-input').value,
                    status: document.getElementById('game-status-input').value,
                    opponent: document.getElementById('game-opponent-input').value,
                    game_date: document.getElementById('game-date-input').value,
                    start_time: document.getElementById('game-start-input').value || '20:00',
                    end_time: document.getElementById('game-end-input').value || null,
                    all_day: allDayCheckbox ? allDayCheckbox.checked : false,
                    location_name: document.getElementById('game-location-input').value,
                    maps_url: document.getElementById('game-maps-input').value,
                    registration_url: document.getElementById('game-registration-input').value,
                    notes: document.getElementById('game-notes-input').value
                };

                try {
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando no Supabase...';
                    }

                    if (id) {
                        const applySeries = Boolean(applyToSeriesCheckbox && applyToSeriesCheckbox.checked && existingSeriesId);
                        await window.FuriaDataService.updateGame(id, basePayload, applySeries, existingSeriesId);
                    } else {
                        const recType = recurrenceSelect ? recurrenceSelect.value : 'unico';
                        const recCount = recurrenceCountInput ? recurrenceCountInput.value : 1;
                        const { dates, label, seriesId } = buildRecurrenceDates(
                            basePayload.game_date,
                            recType,
                            recCount,
                            selectedWeekdays
                        );

                        const batch = dates.map(dStr => ({
                            ...basePayload,
                            game_date: dStr,
                            series_id: seriesId,
                            recurrence_type: recType,
                            recurrence_label: label
                        }));

                        await window.FuriaDataService.createGamesBatch(batch);
                    }

                    if (basePayload.game_date) {
                        viewDate = fromDateString(basePayload.game_date);
                    }

                    closeGameModal();
                    await loadAndRenderGames();
                } catch (err) {
                    if (gameFormFeedback) {
                        gameFormFeedback.style.display = 'block';
                        gameFormFeedback.textContent = err.message || 'Erro ao salvar o jogo.';
                    }
                } finally {
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar no Calendário';
                    }
                }
            });
        }

        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
        if (deleteModalOverlay) {
            deleteModalOverlay.addEventListener('click', (e) => {
                if (e.target === deleteModalOverlay) closeDeleteModal();
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (!gameToDelete) return;
                try {
                    confirmDeleteBtn.disabled = true;
                    confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';
                    const delSeries = Boolean(
                        deleteEntireSeriesCheckbox &&
                        deleteEntireSeriesCheckbox.checked &&
                        gameToDelete.series_id
                    );
                    await window.FuriaDataService.deleteGame(
                        gameToDelete.id,
                        delSeries,
                        gameToDelete.series_id
                    );
                    closeDeleteModal();
                    await loadAndRenderGames();
                } catch (err) {
                    alert(err.message || 'Erro ao excluir jogo.');
                } finally {
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Confirmar Exclusão';
                }
            });
        }

        window.addEventListener('hashchange', async () => {
            await checkAdminState();
            renderAll();
        });

        window.addEventListener('focus', async () => {
            const prevLogged = isAdminLogged();
            await checkAdminState();
            if (prevLogged !== isAdminLogged()) {
                renderAll();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCalendar);
    } else {
        initCalendar();
    }
})();
