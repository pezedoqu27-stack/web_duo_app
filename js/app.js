/**
 * Дуо — Main Application Controller
 * Navigation, event handling, and app initialization
 */

const App = {
    currentSection: 'search',
    currentMovie: null,
    currentMovieList: null,
    searchTimeout: null,
    matcherMovies: [],
    matcherIndex: 0,
    matcherLikes: { user1: [], user2: [] },

    /**
     * Initialize the application
     */
    init() {
        // Register service worker
        this.registerServiceWorker();

        // Initialize storage
        Storage.init();

        // Setup event listeners
        this.setupNavigation();
        this.setupSearch();
        this.setupModals();
        this.setupRating();
        this.setupRandomizer();
        this.setupMatcher();
        this.setupProfile();
        this.setupTurnTracker();
        this.setupAdvancedFilters();
        this.setupBettingSystem();
        this.setupUserSystem();
        this.setupVetoSystem();
        this.setupDateNight();
        this.setupQuoteWidget();
        this.setupVibeCalendar();
        this.setupDurationFilter();
        this.setupViewModes();

        // Apply user theme
        this.applyUserTheme();

        // Load initial data
        this.loadTrending();
        this.loadLists();
        Components.updateStats();

        // Hide splash after delay
        setTimeout(() => {
            document.getElementById('app').classList.remove('hidden');
        }, 1500);
    },

    /**
     * Register service worker for PWA
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
            } catch (err) {
                console.log('Service Worker registration failed:', err);
            }
        }
    },

    /**
     * Setup bottom navigation
     */
    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.navigateTo(section);
            });
        });
    },

    /**
     * Navigate to a section
     * @param {string} section - Section name
     */
    navigateTo(section) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Refresh data for certain sections
        if (section === 'wishlist') this.loadWishlist();
        if (section === 'watching') this.loadWatching();
        if (section === 'history') this.loadHistory();
        if (section === 'profile') Components.updateStats();
    },

    /**
     * Setup search functionality
     */
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');
        const filterBtns = document.querySelectorAll('.filter-btn');

        // Search input
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchClear.classList.toggle('hidden', query.length === 0);

            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (query.length >= 2) {
                    this.performSearch(query);
                } else {
                    document.getElementById('searchResults').innerHTML = '';
                    document.getElementById('trendingSection').classList.remove('hidden');
                }
            }, 300);
        });

        // Clear button
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('trendingSection').classList.remove('hidden');
        });

        // Filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query);
                }
            });
        });
    },

    /**
   * Perform search
   * @param {string} query - Search query
   */
    async performSearch(query) {
        const resultsContainer = document.getElementById('searchResults');
        const trendingSection = document.getElementById('trendingSection');
        const activeFilter = document.querySelector('.filter-btn.active').dataset.type;

        // Check if API key is configured
        if (!API.hasApiKey() && activeFilter !== 'anime') {
            resultsContainer.innerHTML = `
        <div class="empty-state">
          <p>API ключ не настроен</p>
          <span>Перейдите в Профиль и добавьте TMDB API ключ</span>
        </div>
      `;
            trendingSection.classList.add('hidden');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(Components.createSkeletons(6));
        trendingSection.classList.add('hidden');

        let results = [];

        try {
            // Use the unified searchAll method
            results = await API.searchAll(query, activeFilter);
            console.log('Search results:', results.length);
        } catch (error) {
            console.error('Search error:', error);
        }

        // Store results for pagination
        this.searchResults = results;
        this.searchPage = 1;
        this.itemsPerPage = 12;

        this.renderSearchPage();
    },

    // Pagination state
    searchResults: [],
    searchPage: 1,
    itemsPerPage: 12,

    /**
     * Render current page of search results
     */
    renderSearchPage() {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (this.searchResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Ничего не найдено</p>
                    <span>Попробуйте изменить запрос или проверьте API ключ</span>
                </div>
            `;
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.searchResults.length / this.itemsPerPage);
        const startIdx = (this.searchPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const pageResults = this.searchResults.slice(startIdx, endIdx);

        // Render movie cards
        pageResults.forEach(movie => {
            resultsContainer.appendChild(
                Components.createMovieCard(movie, (m) => this.openMovieDetail(m))
            );
        });

        // Add pagination controls if needed
        if (totalPages > 1) {
            const paginationHtml = `
                <div class="pagination">
                    <button class="page-btn" data-page="prev" ${this.searchPage === 1 ? 'disabled' : ''}>←</button>
                    ${this.generatePageNumbers(totalPages)}
                    <button class="page-btn" data-page="next" ${this.searchPage === totalPages ? 'disabled' : ''}>→</button>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', paginationHtml);

            // Add click handlers
            resultsContainer.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = btn.dataset.page;
                    if (page === 'prev' && this.searchPage > 1) {
                        this.searchPage--;
                    } else if (page === 'next' && this.searchPage < totalPages) {
                        this.searchPage++;
                    } else if (!isNaN(page)) {
                        this.searchPage = parseInt(page);
                    }
                    this.renderSearchPage();
                    resultsContainer.scrollIntoView({ behavior: 'smooth' });
                });
            });
        }
    },

    /**
     * Generate page number buttons
     */
    generatePageNumbers(totalPages) {
        let html = '';
        const maxVisible = 5;
        let start = Math.max(1, this.searchPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            html += `<button class="page-btn ${i === this.searchPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        return html;
    },
    /**
   * Load trending content
   */
    async loadTrending() {
        const container = document.getElementById('trendingMovies');
        container.innerHTML = '';

        // Check if API key exists
        if (!API.hasApiKey()) {
            container.innerHTML = '<p class="empty-hint">Добавьте TMDB API ключ в Профиле</p>';
            return;
        }

        container.appendChild(Components.createSkeletons(6));

        try {
            const trending = await API.getTrending('all');
            container.innerHTML = '';

            if (trending.length === 0) {
                container.innerHTML = '<p class="empty-hint">Не удалось загрузить тренды</p>';
                return;
            }

            trending.forEach(movie => {
                container.appendChild(
                    Components.createMovieCard(movie, (m) => this.openMovieDetail(m))
                );
            });
        } catch (error) {
            console.error('Trending error:', error);
            container.innerHTML = '<p class="empty-hint">Ошибка загрузки трендов</p>';
        }
    },

    /**
     * Load all lists
     */
    loadLists() {
        this.loadWishlist();
        this.loadWatching();
        this.loadHistory();
    },

    // Duration filter state
    durationMax: 180,

    /**
     * Load wishlist with optional duration filter
     */
    loadWishlist() {
        const container = document.getElementById('wishlistMovies');
        const emptyState = document.getElementById('wishlistEmpty');
        let movies = Storage.getList(Storage.KEYS.WISHLIST);

        container.innerHTML = '';

        // Apply duration filter if set
        if (this.durationMax < 180) {
            movies = movies.filter(m => !m.runtime || m.runtime <= this.durationMax);
        }

        if (movies.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        movies.forEach(movie => {
            container.appendChild(
                Components.createMovieCard(movie, (m) => this.openMovieDetail(m, Storage.KEYS.WISHLIST))
            );
        });
    },

    /**
     * Setup duration filter slider
     */
    setupDurationFilter() {
        const slider = document.getElementById('durationSlider');
        const valueDisplay = document.getElementById('durationValue');

        if (!slider) return;

        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            this.durationMax = val;

            // Update display
            if (val >= 180) {
                valueDisplay.textContent = 'Любой';
            } else if (val >= 60) {
                const hours = Math.floor(val / 60);
                const mins = val % 60;
                valueDisplay.textContent = mins > 0 ? `< ${hours}ч ${mins}м` : `< ${hours}ч`;
            } else {
                valueDisplay.textContent = `< ${val}м`;
            }

            // Re-render wishlist
            this.loadWishlist();
        });
    },

    /**
     * Load watching list
     */
    loadWatching() {
        const container = document.getElementById('watchingMovies');
        const emptyState = document.getElementById('watchingEmpty');
        const movies = Storage.getList(Storage.KEYS.WATCHING);

        container.innerHTML = '';

        if (movies.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        movies.forEach(movie => {
            container.appendChild(
                Components.createMovieListItem(movie, (m) => this.openMovieDetail(m, Storage.KEYS.WATCHING))
            );
        });

        // Render calendar for TV series
        this.renderCalendar(movies);
    },

    /**
     * Render upcoming episodes calendar
     * @param {Array} movies - Watching movies list
     */
    renderCalendar(movies) {
        const container = document.getElementById('calendarEpisodes');
        const widget = document.getElementById('calendarWidget');
        if (!container || !widget) return;

        // Get only TV series with episodes
        const tvShows = movies.filter(m => m.type === 'tv' && m.totalEpisodes > 0);

        if (tvShows.length === 0) {
            container.innerHTML = '<p class="empty-hint">Добавьте сериалы для отслеживания</p>';
            widget.style.display = 'none';
            return;
        }

        widget.style.display = 'block';

        // Simulate upcoming episodes (in real app would use TMDB TV episode data)
        const today = new Date();
        const episodes = tvShows.map((show, i) => {
            const nextEp = (show.currentEpisode || 0) + 1;
            const daysUntil = (i % 7); // Simulate different release days
            const airDate = new Date(today);
            airDate.setDate(airDate.getDate() + daysUntil);

            return {
                show,
                episode: nextEp,
                airDate,
                daysUntil
            };
        }).sort((a, b) => a.daysUntil - b.daysUntil);

        container.innerHTML = episodes.slice(0, 5).map(ep => {
            const dateStr = ep.airDate.toLocaleDateString('ru', { weekday: 'short', day: 'numeric', month: 'short' });
            let badgeClass = '';
            let badgeText = '';

            if (ep.daysUntil === 0) {
                badgeClass = 'today';
                badgeText = 'Сегодня';
            } else if (ep.daysUntil === 1) {
                badgeClass = 'soon';
                badgeText = 'Завтра';
            } else {
                badgeText = `${ep.daysUntil} дн.`;
            }

            return `
                <div class="calendar-episode" data-id="${ep.show.id}">
                    ${ep.show.backdrop ? `<img class="calendar-episode-poster" src="${ep.show.backdrop}" alt="">` : ''}
                    <div class="calendar-episode-title">${ep.show.title}</div>
                    <div class="calendar-episode-info">S${(ep.show.totalSeasons || 1)} E${ep.episode}</div>
                    <div class="calendar-episode-date">
                        <span class="calendar-badge ${badgeClass}">${badgeText}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Load history
     */
    loadHistory() {
        const container = document.getElementById('historyMovies');
        const emptyState = document.getElementById('historyEmpty');
        const movies = Storage.getList(Storage.KEYS.HISTORY);

        container.innerHTML = '';

        if (movies.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        movies.forEach(movie => {
            container.appendChild(
                Components.createMovieListItem(movie, (m) => this.openMovieDetail(m, Storage.KEYS.HISTORY))
            );
        });
    },

    /**
     * Setup modal event handlers
     */
    setupModals() {
        // Movie detail modal
        document.getElementById('closeMovieModal').addEventListener('click', () => {
            Components.toggleModal('movieModal', false);
        });

        document.querySelector('#movieModal .modal-overlay').addEventListener('click', () => {
            Components.toggleModal('movieModal', false);
        });

        // Movie actions
        document.getElementById('movieActions').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            this.handleMovieAction(action);
        });

        // Tags
        document.querySelector('.tags-container').addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-btn');
            if (!btn) return;

            btn.classList.toggle('active');
            const tag = btn.dataset.tag;

            if (this.currentMovie && this.currentMovieList) {
                Storage.toggleTag(this.currentMovieList, this.currentMovie.id, this.currentMovie.type, tag);
            }
        });

        // Custom tag
        document.getElementById('customTagInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target;
                const tag = input.value.trim().replace('#', '');

                if (tag && this.currentMovie) {
                    Storage.addCustomTag(tag);

                    // Add to movie
                    if (this.currentMovieList) {
                        Storage.toggleTag(this.currentMovieList, this.currentMovie.id, this.currentMovie.type, tag);
                    }

                    // Add button
                    const container = document.querySelector('.tags-container');
                    const btn = document.createElement('button');
                    btn.className = 'tag-btn active';
                    btn.dataset.tag = tag;
                    btn.textContent = `#${tag}`;
                    container.appendChild(btn);

                    input.value = '';
                }
            }
        });

        // Notes
        document.getElementById('movieNotes').addEventListener('blur', (e) => {
            if (this.currentMovie && this.currentMovieList) {
                Storage.setNotes(this.currentMovieList, this.currentMovie.id, this.currentMovie.type, e.target.value);
            }
        });
    },

    /**
   * Open movie detail modal
   * @param {Object} movie - Movie data
   * @param {string} listKey - Current list key (optional)
   */
    async openMovieDetail(movie, listKey = null) {
        this.currentMovie = movie;
        this.currentMovieList = listKey;

        // Check if in any list
        if (!listKey) {
            const found = Storage.findMovie(movie.id, movie.type);
            if (found) {
                this.currentMovieList = found.listKey;
                movie = { ...movie, ...found.movie };
            }
        }

        // Fetch details if we have API key and it's a TMDB movie/tv (not anime)
        if (API.hasApiKey() && movie.type !== 'anime' && !movie.id.startsWith('anime_')) {
            try {
                const details = await API.getDetails(movie.id, movie.type);
                if (details) {
                    movie = { ...movie, ...details };
                }
            } catch (e) {
                console.log('Could not fetch details:', e);
            }
        }

        this.currentMovie = movie;
        Components.renderMovieDetail(movie, this.currentMovieList);
        Components.toggleModal('movieModal', true);

        // Apply adaptive color theme from poster
        if (movie.poster && typeof ColorThief !== 'undefined') {
            ColorThief.applyToModal(movie.poster);
        }
    },
    /**
     * Handle movie action button clicks
     * @param {string} action - Action type
     */
    handleMovieAction(action) {
        const movie = this.currentMovie;
        if (!movie) return;

        switch (action) {
            case 'add-wishlist':
                Storage.addToList(Storage.KEYS.WISHLIST, { ...movie });
                this.currentMovieList = Storage.KEYS.WISHLIST;
                Components.renderMovieDetail(movie, this.currentMovieList);
                Components.showToast('Добавлено в вишлист', 'success');
                this.loadWishlist();
                break;

            case 'start-watching':
                Storage.moveToList(Storage.KEYS.WISHLIST, Storage.KEYS.WATCHING, movie.id, movie.type);
                this.currentMovieList = Storage.KEYS.WATCHING;
                Components.renderMovieDetail(movie, this.currentMovieList);
                Components.showToast('Приятного просмотра!', 'success');
                this.loadLists();
                break;

            case 'mark-watched':
                const movedMovie = Storage.moveToList(Storage.KEYS.WATCHING, Storage.KEYS.HISTORY, movie.id, movie.type);
                Components.toggleModal('movieModal', false);

                if (movedMovie) {
                    this.currentMovie = movedMovie;

                    // Award ticket for watching a movie!
                    this.awardTicket('За просмотр!');

                    Components.renderRatingModal(movedMovie);
                    Components.toggleModal('ratingModal', true);
                }
                this.loadLists();
                break;

            case 'back-to-wishlist':
                Storage.moveToList(Storage.KEYS.WATCHING, Storage.KEYS.WISHLIST, movie.id, movie.type);
                this.currentMovieList = Storage.KEYS.WISHLIST;
                Components.renderMovieDetail(movie, this.currentMovieList);
                Components.showToast('Возвращено в вишлист');
                this.loadLists();
                break;

            case 'edit-rating':
                Components.renderRatingModal(movie);
                Components.toggleModal('movieModal', false);
                Components.toggleModal('ratingModal', true);
                break;

            case 'rewatch':
                Storage.moveToList(Storage.KEYS.HISTORY, Storage.KEYS.WATCHING, movie.id, movie.type);
                this.currentMovieList = Storage.KEYS.WATCHING;
                Components.showToast('Пересматриваем!', 'success');
                Components.toggleModal('movieModal', false);
                this.loadLists();
                break;

            case 'remove':
                if (this.currentMovieList) {
                    Storage.removeFromList(this.currentMovieList, movie.id, movie.type);
                    Components.toggleModal('movieModal', false);
                    Components.showToast('Удалено');
                    this.loadLists();
                }
                break;

            case 'prev-episode':
                if (movie.currentEpisode > 0) {
                    Storage.updateProgress(movie.id, movie.type, movie.currentEpisode - 1, movie.totalEpisodes);
                    movie.currentEpisode--;
                    Components.renderMovieDetail(movie, this.currentMovieList);
                }
                break;

            case 'next-episode':
                Storage.updateProgress(movie.id, movie.type, (movie.currentEpisode || 0) + 1, movie.totalEpisodes);
                movie.currentEpisode = (movie.currentEpisode || 0) + 1;
                Components.renderMovieDetail(movie, this.currentMovieList);
                break;

            case 'open-bets':
                Components.toggleModal('movieModal', false);
                this.openBetModal();
                break;

            case 'i-cheated':
                // Mark as cheated and apply penalty
                const cheater = Storage.getActiveUser();
                const otherUser = cheater === 'male' ? 'female' : 'male';

                // Update movie with cheatedBy
                movie.cheatedBy = cheater;
                Storage.updateMovieInList(Storage.KEYS.WATCHING, movie);

                // Penalty: -1 ticket from cheater
                Storage.spendTicket(cheater);
                this.updateTicketDisplay();

                // Switch turn to the other user
                Storage.setActiveUser(otherUser);
                this.applyUserTheme();

                const userData = Storage.getUserData();
                const cheaterName = userData[cheater]?.name || (cheater === 'male' ? 'Он' : 'Она');
                Components.showToast(`💔 ${cheaterName} согрешил(а)! -1 тикет. Выбор за партнёром!`, 'warning');

                Components.renderMovieDetail(movie, this.currentMovieList);
                break;
        }
    },

    /**
     * Setup rating modal
     */
    setupRating() {
        const slider1 = document.getElementById('rating1');
        const slider2 = document.getElementById('rating2');
        const value1 = document.getElementById('ratingValue1');
        const value2 = document.getElementById('ratingValue2');
        const saveBtn = document.getElementById('saveRating');

        // Slider events
        slider1.addEventListener('input', () => {
            value1.textContent = slider1.value;
            Components.updateCombinedRating(parseInt(slider1.value), parseInt(slider2.value));
        });

        slider2.addEventListener('input', () => {
            value2.textContent = slider2.value;
            Components.updateCombinedRating(parseInt(slider1.value), parseInt(slider2.value));
        });

        // Save rating
        saveBtn.addEventListener('click', () => {
            const modal = document.getElementById('ratingModal');
            const movieId = modal.dataset.movieId;
            const movieType = modal.dataset.movieType;

            Storage.setRating(
                Storage.KEYS.HISTORY,
                movieId,
                movieType,
                parseInt(slider1.value),
                parseInt(slider2.value)
            );

            Components.toggleModal('ratingModal', false);
            Components.showToast('Оценка сохранена!', 'success');
            this.loadHistory();
            Components.updateStats();
        });

        // Close modal on overlay click
        document.querySelector('#ratingModal .modal-overlay').addEventListener('click', () => {
            Components.toggleModal('ratingModal', false);
        });
    },

    /**
     * Setup randomizer (Lucky Button)
     */
    setupRandomizer() {
        const randomizerBtn = document.getElementById('randomizerBtn');
        const closeBtn = document.getElementById('closeRandomizer');
        const spinBtn = document.getElementById('spinBtn');
        const timeButtons = document.querySelectorAll('.time-btn[data-time]');

        let selectedTime = 0;
        let selectedMood = null;

        randomizerBtn.addEventListener('click', () => {
            Components.renderRandomizerMoods();
            Components.toggleModal('randomizerModal', true);

            // Reset selections
            selectedTime = 0;
            selectedMood = null;
            timeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.time === '0'));
        });

        closeBtn.addEventListener('click', () => {
            Components.toggleModal('randomizerModal', false);
        });

        document.querySelector('#randomizerModal .modal-overlay').addEventListener('click', () => {
            Components.toggleModal('randomizerModal', false);
        });

        // Time filter
        document.querySelector('.time-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('.time-btn');
            if (!btn) return;

            timeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTime = parseInt(btn.dataset.time) || 0;
        });

        // Mood filter
        document.getElementById('randomizerMoods').addEventListener('click', (e) => {
            const btn = e.target.closest('.time-btn');
            if (!btn) return;

            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                selectedMood = null;
            } else {
                document.querySelectorAll('#randomizerMoods .time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMood = btn.dataset.mood;
            }
        });

        // Spin!
        spinBtn.addEventListener('click', async () => {
            let movies = Storage.getList(Storage.KEYS.WISHLIST);

            // If wishlist is empty, try to get from trending
            if (movies.length === 0) {
                spinBtn.classList.add('spinning');
                try {
                    movies = await API.getTrending('movie');
                } catch (e) {
                    console.log('Could not get trending');
                }
                spinBtn.classList.remove('spinning');
            }

            // Apply filters
            if (selectedTime > 0) {
                movies = Storage.filterByRuntime(movies, selectedTime);
            }

            if (selectedMood) {
                movies = movies.filter(m => (m.tags || []).includes(selectedMood));
            }

            if (movies.length === 0) {
                Components.showToast('Нет подходящих фильмов. Добавьте в вишлист!', 'error');
                return;
            }

            // Animate
            spinBtn.classList.add('spinning');
            const wheelInner = document.getElementById('wheelInner');
            wheelInner.innerHTML = '';

            // Show multiple posters spinning
            const shuffled = [...movies].sort(() => Math.random() - 0.5);
            const winner = shuffled[0];

            let index = 0;
            const spinInterval = setInterval(() => {
                index = (index + 1) % shuffled.length;
                const movie = shuffled[index];
                wheelInner.innerHTML = `
          <div class="wheel-item" style="background-image: url(${movie.poster})">
            ${movie.rating ? `<div class="wheel-rating">★ ${movie.rating}</div>` : ''}
          </div>
        `;
            }, 100);

            // Stop on winner
            setTimeout(() => {
                clearInterval(spinInterval);
                spinBtn.classList.remove('spinning');
                wheelInner.innerHTML = `
          <div class="wheel-item" style="background-image: url(${winner.poster})">
            ${winner.rating ? `<div class="wheel-rating">★ ${winner.rating}</div>` : ''}
          </div>
        `;

                Components.showToast(`Выбрано: ${winner.title}`, 'success');

                // Open movie after delay
                setTimeout(() => {
                    Components.toggleModal('randomizerModal', false);
                    this.openMovieDetail(winner);
                }, 1500);
            }, 2500);
        });
    },

    /**
     * Setup Cinema Tinder (Matcher)
     */
    setupMatcher() {
        const matcherBtn = document.getElementById('matcherBtn');
        const closeBtn = document.getElementById('closeMatcher');
        const yesBtn = document.getElementById('matcherYes');
        const noBtn = document.getElementById('matcherNo');
        const watchMatchBtn = document.getElementById('watchMatch');

        matcherBtn.addEventListener('click', () => {
            this.startMatcher();
        });

        closeBtn.addEventListener('click', () => {
            Components.toggleModal('matcherModal', false);
        });

        document.querySelector('#matcherModal .modal-overlay').addEventListener('click', () => {
            Components.toggleModal('matcherModal', false);
        });

        yesBtn.addEventListener('click', () => this.matcherSwipe('yes'));
        noBtn.addEventListener('click', () => this.matcherSwipe('no'));

        watchMatchBtn.addEventListener('click', () => {
            Components.toggleModal('matcherModal', false);
            const matchedMovie = this.matcherMovies[this.matcherIndex - 1];
            if (matchedMovie) {
                this.openMovieDetail(matchedMovie, Storage.KEYS.WISHLIST);
            }
        });
    },

    /**
     * Start matcher mode
     */
    async startMatcher() {
        // Get movies from wishlist + trending
        const wishlist = Storage.getList(Storage.KEYS.WISHLIST);
        let trending = [];

        try {
            trending = await API.getTrending();
        } catch (e) {
            console.log('Could not load trending');
        }

        this.matcherMovies = [...wishlist, ...trending].sort(() => Math.random() - 0.5);
        this.matcherIndex = 0;
        this.matcherLikes = { user1: [], user2: [] };

        if (this.matcherMovies.length < 2) {
            Components.showToast('Добавьте больше фильмов', 'error');
            return;
        }

        // Hide match celebration
        document.getElementById('matchCelebration').classList.add('hidden');
        document.querySelector('.matcher-actions').style.display = 'flex';

        // Render initial cards
        this.renderMatcherCards();
        Components.toggleModal('matcherModal', true);
    },

    /**
     * Render matcher cards
     */
    renderMatcherCards() {
        const container = document.getElementById('matcherCards');
        container.innerHTML = '';

        // Show up to 3 cards
        for (let i = 0; i < 3 && this.matcherIndex + i < this.matcherMovies.length; i++) {
            const movie = this.matcherMovies[this.matcherIndex + i];
            container.appendChild(Components.createMatcherCard(movie));
        }

        if (container.children.length === 0) {
            container.innerHTML = '<p class="empty-hint">Фильмы закончились!</p>';
            document.querySelector('.matcher-actions').style.display = 'none';
        }
    },

    /**
     * Handle matcher swipe
     * @param {string} direction - 'yes' or 'no'
     */
    matcherSwipe(direction) {
        const cards = document.querySelectorAll('.matcher-card');
        if (cards.length === 0) return;

        const card = cards[0];
        const movie = this.matcherMovies[this.matcherIndex];

        // Animate swipe
        card.classList.add(direction === 'yes' ? 'swipe-right' : 'swipe-left');

        // Simulate both users liking (for demo - in real app, this would be synced)
        if (direction === 'yes') {
            // Random chance of match for demo
            const otherUserLikes = Math.random() > 0.5;

            if (otherUserLikes) {
                // MATCH!
                setTimeout(() => {
                    document.querySelector('.matcher-actions').style.display = 'none';
                    document.getElementById('matchedMovie').style.backgroundImage = `url(${movie.poster})`;
                    document.getElementById('matchCelebration').classList.remove('hidden');
                    Components.triggerConfetti();
                }, 300);
                return;
            }
        }

        // Move to next card
        setTimeout(() => {
            this.matcherIndex++;
            this.renderMatcherCards();
        }, 300);
    },

    /**
     * Setup profile section
     */
    setupProfile() {
        const name1 = document.getElementById('name1');
        const name2 = document.getElementById('name2');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const saveApiKeyBtn = document.getElementById('saveApiKey');

        // Load saved values
        const users = Storage.getUsers();
        name1.value = users.name1 || '';
        name2.value = users.name2 || '';

        const savedKey = Storage.getApiKey();
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }

        // Save names on blur
        name1.addEventListener('blur', () => {
            Storage.setUsers(name1.value, name2.value);
        });

        name2.addEventListener('blur', () => {
            Storage.setUsers(name1.value, name2.value);
        });

        // Save API key
        saveApiKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                Storage.setApiKey(key);
                Components.showToast('API ключ сохранён', 'success');
                this.loadTrending(); // Reload with real data
            }
        });
    },

    /**
     * Setup turn tracker widget
     */
    setupTurnTracker() {
        const coin = document.getElementById('turnCoin');
        const turnName = document.getElementById('turnName');
        const switchBtn = document.getElementById('switchTurnBtn');

        // Initialize display
        this.updateTurnDisplay();

        // Switch turn on button click - now syncs with user accounts
        switchBtn?.addEventListener('click', () => {
            // Animate coin flip
            coin.classList.add('flipping');

            setTimeout(() => {
                // Switch active user (syncs with user indicator in header)
                const newUser = Storage.switchActiveUser();
                const isFemale = newUser === 'female';

                coin.classList.toggle('flipped', isFemale);
                this.updateTurnDisplay();
                this.applyUserTheme();
                coin.classList.remove('flipping');

                const userData = Storage.getUserData();
                const name = userData[newUser]?.name || (isFemale ? 'Она' : 'Он');
                Components.showToast(`Теперь выбирает ${name}!`, 'success');
            }, 300);
        });

        // Also allow clicking coin to switch
        coin?.addEventListener('click', () => {
            switchBtn?.click();
        });
    },

    /**
     * Update turn display based on current active user
     */
    updateTurnDisplay() {
        const activeUser = Storage.getActiveUser();
        const userData = Storage.getUserData();
        const turnName = document.getElementById('turnName');
        const coin = document.getElementById('turnCoin');

        const isFemale = activeUser === 'female';
        const name = userData[activeUser]?.name || (isFemale ? 'Она' : 'Он');

        if (turnName) {
            turnName.textContent = name;
        }
        if (coin) {
            coin.classList.toggle('flipped', isFemale);
        }
    },

    // Advanced filter state
    advancedFilters: {
        excludeGenres: [],
        yearFrom: null,
        yearTo: null,
        minRating: 0,
        excludeCountries: []
    },

    /**
     * Setup advanced filters modal
     */
    setupAdvancedFilters() {
        const advancedBtn = document.getElementById('advancedFilterBtn');
        const closeBtn = document.getElementById('closeFilters');
        const applyBtn = document.getElementById('applyFilters');
        const resetBtn = document.getElementById('resetFilters');

        // Open filters modal
        advancedBtn?.addEventListener('click', async () => {
            await this.loadGenresForFilter();
            Components.toggleModal('filtersModal', true);
        });

        // Close modal
        closeBtn?.addEventListener('click', () => {
            Components.toggleModal('filtersModal', false);
        });

        document.querySelector('#filtersModal .modal-overlay')?.addEventListener('click', () => {
            Components.toggleModal('filtersModal', false);
        });

        // Apply filters
        applyBtn.addEventListener('click', () => {
            this.applyAdvancedFilters();
            Components.toggleModal('filtersModal', false);
        });

        // Reset filters
        resetBtn.addEventListener('click', () => {
            this.resetAdvancedFilters();
        });
    },

    /**
     * Load genres for filter modal
     */
    async loadGenresForFilter() {
        const container = document.getElementById('excludeGenres');

        // Common genres to exclude
        const genres = [
            { id: 27, name: 'Ужасы' },
            { id: 10749, name: 'Мелодрама' },
            { id: 16, name: 'Мультфильм' },
            { id: 99, name: 'Документальный' },
            { id: 10752, name: 'Военный' },
            { id: 37, name: 'Вестерн' },
            { id: 10402, name: 'Музыка' },
            { id: 36, name: 'Исторический' },
            { id: 878, name: 'Фантастика' },
            { id: 53, name: 'Триллер' },
            { id: 80, name: 'Криминал' },
            { id: 14, name: 'Фэнтези' }
        ];

        container.innerHTML = genres.map(g => `
            <button class="genre-btn ${this.advancedFilters.excludeGenres.includes(g.id) ? 'excluded' : ''}" 
                    data-genre-id="${g.id}">
                ${g.name}
            </button>
        `).join('');

        // Genre click handler
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.genre-btn');
            if (!btn) return;

            const genreId = parseInt(btn.dataset.genreId);
            btn.classList.toggle('excluded');

            if (btn.classList.contains('excluded')) {
                if (!this.advancedFilters.excludeGenres.includes(genreId)) {
                    this.advancedFilters.excludeGenres.push(genreId);
                }
            } else {
                this.advancedFilters.excludeGenres = this.advancedFilters.excludeGenres.filter(id => id !== genreId);
            }
        });

        // Restore previous filter values
        document.getElementById('yearFrom').value = this.advancedFilters.yearFrom || '';
        document.getElementById('yearTo').value = this.advancedFilters.yearTo || '';
        document.getElementById('minRating').value = this.advancedFilters.minRating;
        document.getElementById('minRatingDisplay').textContent =
            this.advancedFilters.minRating === 0 ? 'Любой' : `${this.advancedFilters.minRating}+`;

        // Restore country checkboxes
        document.getElementById('excludeRU').checked = this.advancedFilters.excludeCountries.includes('RU');
        document.getElementById('excludeIN').checked = this.advancedFilters.excludeCountries.includes('IN');
        document.getElementById('excludeTR').checked = this.advancedFilters.excludeCountries.includes('TR');
    },

    /**
     * Apply advanced filters and search
     */
    async applyAdvancedFilters() {
        // Gather filter values
        this.advancedFilters.yearFrom = document.getElementById('yearFrom').value || null;
        this.advancedFilters.yearTo = document.getElementById('yearTo').value || null;
        this.advancedFilters.minRating = parseInt(document.getElementById('minRating').value) || 0;

        // Countries
        this.advancedFilters.excludeCountries = [];
        if (document.getElementById('excludeRU').checked) this.advancedFilters.excludeCountries.push('RU');
        if (document.getElementById('excludeIN').checked) this.advancedFilters.excludeCountries.push('IN');
        if (document.getElementById('excludeTR').checked) this.advancedFilters.excludeCountries.push('TR');

        // Update button state
        const hasFilters = this.advancedFilters.excludeGenres.length > 0 ||
            this.advancedFilters.yearFrom ||
            this.advancedFilters.yearTo ||
            this.advancedFilters.minRating > 0 ||
            this.advancedFilters.excludeCountries.length > 0;

        document.getElementById('advancedFilterBtn').classList.toggle('has-filters', hasFilters);

        // Perform discover search with filters
        if (hasFilters) {
            await this.performDiscoverSearch();
        }
    },

    /**
     * Perform discover search with current filters
     */
    async performDiscoverSearch() {
        const resultsContainer = document.getElementById('searchResults');
        const trendingSection = document.getElementById('trendingSection');

        if (!API.hasApiKey()) {
            Components.showToast('Добавьте TMDB API ключ', 'error');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(Components.createSkeletons(6));
        trendingSection.classList.add('hidden');

        try {
            const results = await API.discover({
                type: 'movie',
                excludeGenres: this.advancedFilters.excludeGenres,
                yearFrom: this.advancedFilters.yearFrom,
                yearTo: this.advancedFilters.yearTo,
                minRating: this.advancedFilters.minRating,
                excludeCountries: this.advancedFilters.excludeCountries
            });

            resultsContainer.innerHTML = '';

            if (results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>Ничего не найдено</p>
                        <span>Попробуйте изменить фильтры</span>
                    </div>
                `;
                return;
            }

            // Show filter summary
            const filterSummary = this.getFilterSummary();
            if (filterSummary) {
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'filter-summary';
                summaryDiv.innerHTML = `<p>🎯 ${filterSummary}</p>`;
                resultsContainer.appendChild(summaryDiv);
            }

            results.forEach(movie => {
                resultsContainer.appendChild(
                    Components.createMovieCard(movie, (m) => this.openMovieDetail(m))
                );
            });

            Components.showToast(`Найдено ${results.length} фильмов`, 'success');
        } catch (error) {
            console.error('Discover error:', error);
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Ошибка поиска</p>
                    <span>Проверьте API ключ</span>
                </div>
            `;
        }
    },

    /**
     * Get human-readable filter summary
     * @returns {string}
     */
    getFilterSummary() {
        const parts = [];

        if (this.advancedFilters.yearFrom || this.advancedFilters.yearTo) {
            const from = this.advancedFilters.yearFrom || '...';
            const to = this.advancedFilters.yearTo || '...';
            parts.push(`${from}–${to}`);
        }

        if (this.advancedFilters.minRating > 0) {
            parts.push(`рейтинг ${this.advancedFilters.minRating}+`);
        }

        if (this.advancedFilters.excludeGenres.length > 0) {
            parts.push(`без ${this.advancedFilters.excludeGenres.length} жанров`);
        }

        if (this.advancedFilters.excludeCountries.length > 0) {
            parts.push(`без ${this.advancedFilters.excludeCountries.join(', ')}`);
        }

        return parts.join(', ');
    },

    /**
     * Reset all advanced filters
     */
    resetAdvancedFilters() {
        this.advancedFilters = {
            excludeGenres: [],
            yearFrom: null,
            yearTo: null,
            minRating: 0,
            excludeCountries: []
        };

        // Reset UI
        document.querySelectorAll('.genre-btn').forEach(btn => btn.classList.remove('excluded'));
        document.getElementById('yearFrom').value = '';
        document.getElementById('yearTo').value = '';
        document.getElementById('minRating').value = 0;
        document.getElementById('minRatingDisplay').textContent = 'Любой';
        document.getElementById('excludeRU').checked = false;
        document.getElementById('excludeIN').checked = false;
        document.getElementById('excludeTR').checked = false;
        document.getElementById('advancedFilterBtn').classList.remove('has-filters');

        Components.showToast('Фильтры сброшены');
    },

    /**
     * Setup betting system
     */
    setupBettingSystem() {
        const closeBtn = document.getElementById('closeBetModal');
        const tabs = document.querySelectorAll('.bet-tab');
        const userBtns = document.querySelectorAll('.bet-user');
        const saveBtn = document.getElementById('saveBet');
        const revealAllBtn = document.getElementById('revealAllBets');

        // Close modal
        closeBtn.addEventListener('click', () => {
            Components.toggleModal('betModal', false);
        });

        document.querySelector('#betModal .modal-overlay').addEventListener('click', () => {
            Components.toggleModal('betModal', false);
        });

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabName = tab.dataset.tab;
                document.getElementById('betPlaceTab').classList.toggle('hidden', tabName !== 'place');
                document.getElementById('betRevealTab').classList.toggle('hidden', tabName !== 'reveal');

                if (tabName === 'reveal') {
                    this.renderBetsList();
                }
            });
        });

        // User selection
        userBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                userBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Save bet
        saveBtn.addEventListener('click', () => {
            const movie = this.currentMovie;
            if (!movie) return;

            const prediction = document.getElementById('betPrediction').value.trim();
            if (!prediction) {
                Components.showToast('Введите ваш прогноз', 'error');
                return;
            }

            const activeUser = document.querySelector('.bet-user.active');
            const userNum = parseInt(activeUser?.dataset.user || 1);
            const users = Storage.getUsers();
            const userName = userNum === 1 ? (users.name1 || 'Персона 1') : (users.name2 || 'Персона 2');

            Storage.addBet({
                movieId: movie.id,
                movieType: movie.type,
                movieTitle: movie.title,
                user: userNum,
                userName: userName,
                prediction: prediction
            });

            document.getElementById('betPrediction').value = '';
            Components.showToast('🔒 Прогноз сохранён!', 'success');
            Components.toggleModal('betModal', false);
        });

        // Reveal all bets
        revealAllBtn.addEventListener('click', () => {
            const movie = this.currentMovie;
            if (!movie) return;

            const revealed = Storage.revealAllMovieBets(movie.id, movie.type);
            if (revealed > 0) {
                this.renderBetsList();
                Components.showToast(`Раскрыто ${revealed} прогнозов!`, 'success');
            } else {
                Components.showToast('Нечего раскрывать', 'error');
            }
        });
    },

    /**
     * Open betting modal for current movie
     */
    openBetModal() {
        const movie = this.currentMovie;
        if (!movie) return;

        const users = Storage.getUsers();
        document.getElementById('betMovieTitle').textContent = movie.title;
        document.getElementById('betUser1').textContent = users.name1 || 'Персона 1';
        document.getElementById('betUser2').textContent = users.name2 || 'Персона 2';
        document.getElementById('betPrediction').value = '';

        // Reset to place tab
        document.querySelectorAll('.bet-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.bet-tab[data-tab="place"]').classList.add('active');
        document.getElementById('betPlaceTab').classList.remove('hidden');
        document.getElementById('betRevealTab').classList.add('hidden');

        this.renderBetsList();
        Components.toggleModal('betModal', true);
    },

    /**
     * Render bets list for current movie
     */
    renderBetsList() {
        const movie = this.currentMovie;
        if (!movie) return;

        const container = document.getElementById('betsList');
        const bets = Storage.getMovieBets(movie.id, movie.type);

        if (bets.length === 0) {
            container.innerHTML = '<p class="empty-hint">Пока нет ставок для этого фильма</p>';
            return;
        }

        container.innerHTML = bets.map(bet => `
            <div class="bet-card" data-bet-id="${bet.id}">
                <div class="bet-card-header">
                    <span class="bet-card-user">${bet.userName || 'Аноним'}</span>
                    <span class="bet-card-date">${new Date(bet.createdAt).toLocaleDateString('ru')}</span>
                </div>
                <div class="bet-card-prediction ${bet.revealed ? 'revealed' : 'hidden-bet'}">
                    ${bet.prediction}
                </div>
            </div>
        `).join('');

        // Click to reveal individual bets
        container.querySelectorAll('.bet-card').forEach(card => {
            card.addEventListener('click', () => {
                const betId = card.dataset.betId;
                const prediction = card.querySelector('.bet-card-prediction');

                if (prediction.classList.contains('hidden-bet')) {
                    Storage.revealBet(betId);
                    prediction.classList.remove('hidden-bet');
                    prediction.classList.add('revealed');
                }
            });
        });
    },

    /**
     * Render challenges in profile section
     */
    renderChallenges() {
        const container = document.getElementById('challengesGrid');
        if (!container) return;

        const challengesData = Storage.CHALLENGES_DATA;
        const userChallenges = Storage.getChallenges();

        container.innerHTML = Object.values(challengesData).map(challenge => {
            const isStarted = !!userChallenges[challenge.id];
            const progress = Storage.getChallengeProgress(challenge.id);
            const completed = userChallenges[challenge.id]?.completed?.length || 0;
            const total = challenge.movies.length;

            return `
                <div class="challenge-card ${isStarted ? 'active' : ''}" data-challenge-id="${challenge.id}">
                    <div class="challenge-header">
                        <span class="challenge-icon">${challenge.icon}</span>
                        <div class="challenge-info">
                            <div class="challenge-name">
                                ${challenge.name}
                                ${progress === 100 ? '<span class="challenge-badge">✓ Завершён</span>' : ''}
                            </div>
                            <div class="challenge-desc">${challenge.description}</div>
                        </div>
                    </div>
                    ${isStarted ? `
                        <div class="challenge-progress">
                            <div class="challenge-progress-bar">
                                <div class="challenge-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="challenge-progress-text">
                                <span>${completed} / ${total} фильмов</span>
                                <span>${progress}%</span>
                            </div>
                        </div>
                    ` : '<p class="empty-hint">Нажмите чтобы начать</p>'}
                </div>
            `;
        }).join('');

        // Click handlers
        container.querySelectorAll('.challenge-card').forEach(card => {
            card.addEventListener('click', () => {
                const challengeId = card.dataset.challengeId;
                const challenge = challengesData[challengeId];
                const isStarted = !!userChallenges[challengeId];

                if (!isStarted) {
                    Storage.startChallenge(challengeId);
                    Components.showToast(`Челлендж "${challenge.name}" начат!`, 'success');
                    this.renderChallenges();
                } else {
                    // Show movies to tick off
                    this.showChallengeMovies(challengeId);
                }
            });
        });
    },

    /**
     * Show challenge movies modal (simple alert for now)
     */
    showChallengeMovies(challengeId) {
        const challenge = Storage.CHALLENGES_DATA[challengeId];
        const userChallenges = Storage.getChallenges();
        const completed = userChallenges[challengeId]?.completed || [];

        const list = challenge.movies.map((m, i) => {
            const isDone = completed.includes(m.tmdbId);
            return `${isDone ? '✅' : '⬜'} ${i + 1}. ${m.title}`;
        }).join('\n');

        Components.showToast(`${challenge.name}: ${completed.length}/${challenge.movies.length} просмотрено`, 'success');
        console.log('Challenge movies:\n' + list);
    },

    // ============================================
    // USER ACCOUNT SYSTEM
    // ============================================

    /**
     * Setup user system with indicator click handler
     */
    setupUserSystem() {
        const indicator = document.getElementById('userIndicator');
        if (!indicator) return;

        indicator.addEventListener('click', () => {
            const newUser = Storage.switchActiveUser();
            this.applyUserTheme();

            const userData = Storage.getUserData();
            const userName = userData[newUser]?.name || (newUser === 'male' ? 'Он' : 'Она');
            Components.showToast(`Переключено на: ${userName}`, 'success');
        });
    },

    /**
     * Apply user theme to body and update UI elements
     */
    applyUserTheme() {
        const activeUser = Storage.getActiveUser();
        const userData = Storage.getUserData();
        const userInfo = userData[activeUser];

        // Update body class for theme
        document.body.classList.remove('user-male', 'user-female');
        document.body.classList.add(`user-${activeUser}`);

        // Update user indicator
        const userIcon = document.getElementById('userIcon');
        const userName = document.getElementById('userName');
        const ticketCount = document.getElementById('ticketCount');

        if (userIcon) {
            userIcon.textContent = activeUser === 'male' ? '👨' : '👩';
        }
        if (userName) {
            userName.textContent = userInfo?.name || (activeUser === 'male' ? 'Он' : 'Она');
        }
        if (ticketCount) {
            ticketCount.textContent = userInfo?.tickets || 0;
        }

        // Update turn tracker coin to match
        const turnName = document.getElementById('turnName');
        if (turnName) {
            turnName.textContent = activeUser === 'male' ? 'Он выбирает' : 'Она выбирает';
        }
    },

    /**
     * Update ticket display
     */
    updateTicketDisplay() {
        const ticketCount = document.getElementById('ticketCount');
        if (ticketCount) {
            ticketCount.textContent = Storage.getTickets();
        }
    },

    /**
     * Award ticket to current user (e.g., for watching partner's choice)
     */
    awardTicket(reason = '') {
        const activeUser = Storage.getActiveUser();
        const newBalance = Storage.addTicket(activeUser);
        this.updateTicketDisplay();
        Components.showToast(`🎟️ +1 тикет! (${newBalance}) ${reason}`, 'success');
    },

    /**
     * Spend ticket to force movie choice
     */
    useTicketToForce() {
        const activeUser = Storage.getActiveUser();
        if (Storage.spendTicket(activeUser)) {
            this.updateTicketDisplay();
            Components.showToast('🎟️ Тикет использован! Выбор за тобой!', 'success');
            return true;
        } else {
            Components.showToast('Недостаточно тикетов!', 'error');
            return false;
        }
    },

    // ============================================
    // VETO SYSTEM
    // ============================================
    vetoSession: null,

    /**
     * Setup veto button and modal
     */
    setupVetoSystem() {
        const vetoBtn = document.getElementById('vetoBtn');
        const cancelBtn = document.getElementById('vetoCancel');
        const confirmBtn = document.getElementById('vetoConfirm');
        const closeBtn = document.getElementById('vetoClose');

        if (vetoBtn) {
            vetoBtn.addEventListener('click', () => this.startVetoSession());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                Components.toggleModal('vetoModal', false);
                this.vetoSession = null;
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmVeto());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                Components.toggleModal('vetoModal', false);
                this.vetoSession = null;
            });
        }

        document.querySelector('#vetoModal .modal-overlay')?.addEventListener('click', () => {
            Components.toggleModal('vetoModal', false);
        });
    },

    /**
     * Start a new veto session
     */
    startVetoSession() {
        const wishlist = Storage.getList(Storage.KEYS.WISHLIST);
        if (wishlist.length < 10) {
            Components.showToast(`Нужно минимум 10 фильмов в вишлисте (сейчас ${wishlist.length})`, 'error');
            return;
        }

        // Select 10 random movies
        const shuffled = [...wishlist].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);

        this.vetoSession = {
            movies: selected,
            vetoes: { male: [], female: [] },
            currentUser: Storage.getActiveUser()
        };

        this.renderVetoGrid();
        this.updateVetoUI();

        // Hide results, show selection
        document.getElementById('vetoResults').classList.add('hidden');
        document.querySelector('.veto-grid').classList.remove('hidden');
        document.querySelector('.veto-actions').classList.remove('hidden');
        document.querySelector('.veto-hint').classList.remove('hidden');
        document.querySelector('.veto-user-indicator').classList.remove('hidden');

        Components.toggleModal('vetoModal', true);
    },

    /**
     * Render veto movie grid
     */
    renderVetoGrid() {
        const grid = document.getElementById('vetoGrid');
        if (!grid || !this.vetoSession) return;

        const { movies, vetoes, currentUser } = this.vetoSession;
        const userVetoes = vetoes[currentUser] || [];

        grid.innerHTML = movies.map((movie, idx) => {
            const isVetoed = userVetoes.includes(idx);
            return `
                <div class="veto-movie ${isVetoed ? 'vetoed' : ''}" data-idx="${idx}">
                    <img src="${movie.poster || ''}" alt="${movie.title}">
                </div>
            `;
        }).join('');

        // Click handlers
        grid.querySelectorAll('.veto-movie').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx);
                this.handleVetoClick(idx);
            });
        });
    },

    /**
     * Handle click on movie in veto grid
     */
    handleVetoClick(idx) {
        if (!this.vetoSession) return;

        const { vetoes, currentUser } = this.vetoSession;
        const userVetoes = vetoes[currentUser];

        if (userVetoes.includes(idx)) {
            // Remove veto
            vetoes[currentUser] = userVetoes.filter(i => i !== idx);
        } else if (userVetoes.length < 3) {
            // Add veto
            userVetoes.push(idx);
        } else {
            Components.showToast('Максимум 3 вето!', 'error');
            return;
        }

        this.renderVetoGrid();
        this.updateVetoUI();
    },

    /**
     * Update veto UI (count, button state)
     */
    updateVetoUI() {
        if (!this.vetoSession) return;

        const { vetoes, currentUser } = this.vetoSession;
        const count = vetoes[currentUser]?.length || 0;
        const userData = Storage.getUserData();

        document.getElementById('vetoCount').textContent = `${count} / 3`;
        document.getElementById('vetoUserIcon').textContent = currentUser === 'male' ? '👨' : '👩';
        document.getElementById('vetoUserName').textContent = userData[currentUser]?.name || (currentUser === 'male' ? 'Он' : 'Она');
        document.getElementById('vetoConfirm').disabled = count !== 3;
    },

    /**
     * Confirm veto selection for current user
     */
    confirmVeto() {
        if (!this.vetoSession) return;

        const { vetoes, currentUser } = this.vetoSession;
        const otherUser = currentUser === 'male' ? 'female' : 'male';

        if (vetoes[otherUser].length === 0) {
            // First user done, switch to second
            this.vetoSession.currentUser = otherUser;
            Storage.setActiveUser(otherUser);
            this.applyUserTheme();

            const userData = Storage.getUserData();
            Components.showToast(`Теперь очередь: ${userData[otherUser]?.name || 'Она'}`, 'success');

            this.renderVetoGrid();
            this.updateVetoUI();
        } else {
            // Both done, show results
            this.showVetoResults();
        }
    },

    /**
     * Show veto results (remaining 4 movies)
     */
    showVetoResults() {
        if (!this.vetoSession) return;

        const { movies, vetoes } = this.vetoSession;
        const allVetoed = [...new Set([...vetoes.male, ...vetoes.female])];
        const remaining = movies.filter((_, idx) => !allVetoed.includes(idx));

        // Hide selection, show results
        document.querySelector('.veto-grid').classList.add('hidden');
        document.querySelector('.veto-actions').classList.add('hidden');
        document.querySelector('.veto-hint').classList.add('hidden');
        document.querySelector('.veto-user-indicator').classList.add('hidden');

        const resultsDiv = document.getElementById('vetoResults');
        const resultsGrid = document.getElementById('vetoResultsGrid');

        resultsGrid.innerHTML = remaining.map(movie => `
            <div class="veto-result-movie">
                <img src="${movie.poster || ''}" alt="${movie.title}">
            </div>
        `).join('');

        resultsDiv.classList.remove('hidden');
        Components.showToast(`🎉 Осталось ${remaining.length} фильма(ов)!`, 'success');
    },

    // ============================================
    // DATE NIGHT GENERATOR
    // ============================================
    dateNightOptions: {
        food: ['Пицца', 'Суши', 'Бургеры', 'Попкорн', 'Мороженое', 'Фрукты', 'Доширак', 'Сыр и вино'],
        dress: ['Пижамы', 'Нарядно', 'Уютно', 'Спортивно', 'Без правил', 'В пледах'],
        atmosphere: ['Зажечь свечи', 'Выключить свет', 'Устроить форт из подушек', 'Открыть окно', 'Включить гирлянду']
    },

    /**
     * Setup Date Night Generator
     */
    setupDateNight() {
        const btn = document.getElementById('dateNightBtn');
        const closeBtn = document.getElementById('dateNightClose');
        const regenerateBtn = document.getElementById('dateNightRegenerate');

        if (btn) {
            btn.addEventListener('click', () => this.openDateNight());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                Components.toggleModal('dateNightModal', false);
            });
        }

        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => this.generateDateNight());
        }

        document.querySelector('#dateNightModal .modal-overlay')?.addEventListener('click', () => {
            Components.toggleModal('dateNightModal', false);
        });
    },

    /**
     * Open Date Night modal
     */
    openDateNight() {
        this.generateDateNight();
        Components.toggleModal('dateNightModal', true);
    },

    /**
     * Generate random date night options
     */
    generateDateNight() {
        const wishlist = Storage.getList(Storage.KEYS.WISHLIST);
        const randomMovie = wishlist.length > 0
            ? wishlist[Math.floor(Math.random() * wishlist.length)]
            : null;

        document.getElementById('dateNightMovie').textContent =
            randomMovie ? randomMovie.title : 'Выберите из вишлиста';

        const { food, dress, atmosphere } = this.dateNightOptions;
        document.getElementById('dateNightFood').textContent = food[Math.floor(Math.random() * food.length)];
        document.getElementById('dateNightDress').textContent = dress[Math.floor(Math.random() * dress.length)];
        document.getElementById('dateNightAtmosphere').textContent = atmosphere[Math.floor(Math.random() * atmosphere.length)];
    },

    // ============================================
    // QUOTE OF THE DAY WIDGET
    // ============================================

    /**
     * Setup and render Quote of the Day widget
     */
    setupQuoteWidget() {
        const quote = Storage.getRandomQuote();
        const widget = document.getElementById('quoteWidget');

        if (!widget) return;

        if (quote) {
            widget.classList.remove('hidden');
            document.getElementById('quoteText').textContent = quote.text;
            document.getElementById('quoteMovie').textContent = `— ${quote.movieTitle}`;
        } else {
            widget.classList.add('hidden');
        }
    },

    // ============================================
    // VIBE CALENDAR (Emotional Calendar)
    // ============================================
    vibeMonth: new Date(),
    genreColors: {
        'Horror': '#ff6b6b',
        'Romance': '#f8a5c2',
        'Action': '#6ea8fe',
        'Comedy': '#a8d5ba',
        'Drama': '#e8d5a8',
        'Thriller': '#c9b1ff',
        'Animation': '#ffd93d',
        'default': '#b8a5d3'
    },

    /**
     * Setup Vibe Calendar
     */
    setupVibeCalendar() {
        const viewBtns = document.querySelectorAll('.view-btn');
        const prevBtn = document.getElementById('vibePrev');
        const nextBtn = document.getElementById('vibeNext');

        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const view = btn.dataset.view;
                const calendar = document.getElementById('vibeCalendar');
                const list = document.getElementById('historyMovies');

                if (view === 'calendar') {
                    calendar?.classList.remove('hidden');
                    list?.classList.add('hidden');
                    this.renderVibeCalendar();
                } else {
                    calendar?.classList.add('hidden');
                    list?.classList.remove('hidden');
                }
            });
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.vibeMonth.setMonth(this.vibeMonth.getMonth() - 1);
                this.renderVibeCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.vibeMonth.setMonth(this.vibeMonth.getMonth() + 1);
                this.renderVibeCalendar();
            });
        }
    },

    /**
     * Render Vibe Calendar grid
     */
    renderVibeCalendar() {
        const grid = document.getElementById('vibeCalendarGrid');
        const monthLabel = document.getElementById('vibeMonth');
        if (!grid) return;

        const year = this.vibeMonth.getFullYear();
        const month = this.vibeMonth.getMonth();

        // Update month label
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthLabel.textContent = `${monthNames[month]} ${year}`;

        // Get history movies
        const history = Storage.getList(Storage.KEYS.HISTORY);
        const moviesByDay = {};

        history.forEach(movie => {
            if (movie.watchedAt) {
                const date = new Date(movie.watchedAt);
                if (date.getFullYear() === year && date.getMonth() === month) {
                    const day = date.getDate();
                    moviesByDay[day] = movie;
                }
            }
        });

        // Day headers
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        let html = dayNames.map(d => `<div class="vibe-day-header">${d}</div>`).join('');

        // Get first day of month (0=Sun, adjust for Mon start)
        const firstDay = new Date(year, month, 1).getDay();
        const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Empty cells before first day
        for (let i = 0; i < adjustedFirst; i++) {
            html += '<div class="vibe-day empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const movie = moviesByDay[day];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            let classes = 'vibe-day';
            let style = '';

            if (movie) {
                classes += ' has-movie';
                const genre = movie.genres?.[0] || 'default';
                const color = this.genreColors[genre] || this.genreColors.default;
                style = `background: ${color};`;
            }

            if (isToday) {
                classes += ' today';
            }

            html += `<div class="${classes}" style="${style}" data-day="${day}" title="${movie?.title || ''}">
                <span class="day-num">${day}</span>
                ${movie ? '<span class="day-dot"></span>' : ''}
            </div>`;
        }

        grid.innerHTML = html;

        // Add click handlers for days with movies
        grid.querySelectorAll('.vibe-day.has-movie').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const dayNum = parseInt(dayEl.dataset.day);
                const movie = moviesByDay[dayNum];
                if (movie) {
                    this.showDayMovie(movie);
                }
            });
        });
    },

    /**
     * Show movie details for a calendar day
     */
    showDayMovie(movie) {
        const rating1 = movie.rating1 ? `⭐ ${movie.rating1}` : '';
        const rating2 = movie.rating2 ? `⭐ ${movie.rating2}` : '';
        const ratings = [rating1, rating2].filter(r => r).join(' / ') || 'Без оценок';

        Components.showToast(`🎬 ${movie.title}\n${ratings}`, 'info', 4000);
    },

    // ============================================
    // VIEW MODES
    // ============================================
    currentViewMode: 'medium',

    /**
     * Setup view mode toggle for cards
     */
    setupViewModes() {
        const toggle = document.getElementById('viewModeToggle');
        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-mode-btn');
            if (!btn) return;

            const mode = btn.dataset.mode;
            this.currentViewMode = mode;

            // Update active button
            toggle.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update grid classes
            const grids = document.querySelectorAll('.movies-grid');
            grids.forEach(grid => {
                grid.classList.remove('view-small', 'view-medium', 'view-large', 'view-list');
                grid.classList.add(`view-${mode}`);
            });
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ====================================
// AVATAR UPLOAD SYSTEM
// ====================================
App.setupAvatars = function () {
    const avatar1 = document.getElementById('avatar1');
    const avatar2 = document.getElementById('avatar2');
    const input1 = document.getElementById('avatar1Input');
    const input2 = document.getElementById('avatar2Input');

    // Load saved avatars
    this.loadAvatars();

    // Click handler for avatar 1
    avatar1?.addEventListener('click', (e) => {
        if (!e.target.closest('.avatar-name')) {
            input1?.click();
        }
    });

    // Click handler for avatar 2
    avatar2?.addEventListener('click', (e) => {
        if (!e.target.closest('.avatar-name')) {
            input2?.click();
        }
    });

    // File change handlers
    input1?.addEventListener('change', (e) => this.handleAvatarUpload(e, 'avatar1'));
    input2?.addEventListener('change', (e) => this.handleAvatarUpload(e, 'avatar2'));
};

App.handleAvatarUpload = function (event, avatarId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imgData = e.target.result;
        localStorage.setItem(`duo_${avatarId}`, imgData);
        this.loadAvatars();
        Components.showToast('Аватар обновлён!', 'success');
    };
    reader.readAsDataURL(file);
};

App.loadAvatars = function () {
    const avatar1Img = document.getElementById('avatar1Img');
    const avatar2Img = document.getElementById('avatar2Img');
    const saved1 = localStorage.getItem('duo_avatar1');
    const saved2 = localStorage.getItem('duo_avatar2');

    if (saved1 && avatar1Img) {
        avatar1Img.innerHTML = `<img src="${saved1}" alt="Avatar">`;
    }
    if (saved2 && avatar2Img) {
        avatar2Img.innerHTML = `<img src="${saved2}" alt="Avatar">`;
    }
};

// ====================================
// DETAILED STATS MODAL
// ====================================
App.setupDetailedStats = function () {
    const openBtn = document.getElementById('openDetailedStats');
    const closeBtn = document.getElementById('closeStatsModal');
    const overlay = document.querySelector('#statsModal .modal-overlay');

    openBtn?.addEventListener('click', () => this.openDetailedStats());
    closeBtn?.addEventListener('click', () => Components.toggleModal('statsModal', false));
    overlay?.addEventListener('click', () => Components.toggleModal('statsModal', false));
};

App.openDetailedStats = function () {
    const history = Storage.getList(Storage.KEYS.HISTORY);

    // By type
    const byType = { movie: 0, tv: 0, anime: 0 };
    history.forEach(m => byType[m.type] = (byType[m.type] || 0) + 1);

    document.getElementById('statsByType').innerHTML = `
        <div class="stats-row"><span class="stats-row-label">Фильмы</span><span class="stats-row-value">${byType.movie || 0}</span></div>
        <div class="stats-row"><span class="stats-row-label">Сериалы</span><span class="stats-row-value">${byType.tv || 0}</span></div>
        <div class="stats-row"><span class="stats-row-label">Аниме</span><span class="stats-row-value">${byType.anime || 0}</span></div>
    `;

    // By genre
    const genres = {};
    history.forEach(m => {
        (m.genres || []).forEach(g => genres[g] = (genres[g] || 0) + 1);
    });
    const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('statsByGenre').innerHTML = sortedGenres.map(([name, count]) =>
        `<div class="stats-row"><span class="stats-row-label">${name}</span><span class="stats-row-value">${count}</span></div>`
    ).join('') || '<p class="empty-hint">Нет данных</p>';

    // Time stats
    const totalMinutes = history.reduce((sum, m) => sum + (m.runtime || 90), 0);
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);

    document.getElementById('statsByTime').innerHTML = `
        <div class="stats-row"><span class="stats-row-label">Всего минут</span><span class="stats-row-value">${totalMinutes}</span></div>
        <div class="stats-row"><span class="stats-row-label">Всего часов</span><span class="stats-row-value">${hours}</span></div>
        <div class="stats-row"><span class="stats-row-label">Всего дней</span><span class="stats-row-value">${days}</span></div>
    `;

    Components.toggleModal('statsModal', true);
};

// ====================================
// CHALLENGE EDITOR
// ====================================
App.setupChallengeEditor = function () {
    const addBtn = document.getElementById('addChallengeBtn');
    const saveBtn = document.getElementById('saveChallenge');
    const cancelBtn = document.getElementById('cancelChallenge');
    const overlay = document.querySelector('#challengeModal .modal-overlay');
    const moviesInput = document.getElementById('challengeMovies');

    addBtn?.addEventListener('click', () => this.openChallengeEditor());
    saveBtn?.addEventListener('click', () => this.saveChallenge());
    cancelBtn?.addEventListener('click', () => Components.toggleModal('challengeModal', false));
    overlay?.addEventListener('click', () => Components.toggleModal('challengeModal', false));

    // Assignee button handlers
    document.querySelectorAll('.assignee-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.assignee-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.updateTicketReward();
        });
    });

    // Update reward when movies change
    moviesInput?.addEventListener('input', () => this.updateTicketReward());
};

App.updateTicketReward = function () {
    const moviesStr = document.getElementById('challengeMovies')?.value?.trim() || '';
    const movieIds = moviesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const movieCount = movieIds.length;
    const tickets = movieCount * 20;

    const rewardEl = document.getElementById('challengeReward');
    if (rewardEl) {
        rewardEl.textContent = `${tickets} 🎟️ тикетов`;
    }
};

App.editingChallengeId = null;

App.openChallengeEditor = function (challenge = null) {
    this.editingChallengeId = challenge?.id || null;

    const title = document.getElementById('challengeModalTitle');
    const nameInput = document.getElementById('challengeName');
    const emojiInput = document.getElementById('challengeEmoji');
    const moviesInput = document.getElementById('challengeMovies');

    if (challenge) {
        title.textContent = '✏️ Редактировать челлендж';
        nameInput.value = challenge.name || '';
        emojiInput.value = challenge.icon || '🎬';
        moviesInput.value = (challenge.movieIds || []).join(', ');

        // Set assignee button
        const assignee = challenge.assignee || 'both';
        document.querySelectorAll('.assignee-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.assignee === assignee);
        });
    } else {
        title.textContent = '🎯 Новый челлендж';
        nameInput.value = '';
        emojiInput.value = '🎬';
        moviesInput.value = '';

        // Reset to default (both)
        document.querySelectorAll('.assignee-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.assignee === 'both');
        });
    }

    // Update ticket reward display
    this.updateTicketReward();

    Components.toggleModal('challengeModal', true);
};

App.saveChallenge = function () {
    const name = document.getElementById('challengeName').value.trim();
    const emoji = document.getElementById('challengeEmoji').value.trim() || '🎬';
    const moviesStr = document.getElementById('challengeMovies').value.trim();

    // Get selected assignee
    const activeAssignee = document.querySelector('.assignee-btn.active');
    const assignee = activeAssignee?.dataset.assignee || 'both';

    if (!name) {
        Components.showToast('Введите название', 'error');
        return;
    }

    const movieIds = moviesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const ticketReward = movieIds.length * 20;

    const challenge = {
        id: this.editingChallengeId || `custom_${Date.now()}`,
        name: name,
        icon: emoji,
        movieIds: movieIds,
        assignee: assignee,
        ticketReward: ticketReward,
        progress: 0,
        isCustom: true
    };

    // Save to storage
    let challenges = JSON.parse(localStorage.getItem('duo_custom_challenges') || '[]');
    const existingIdx = challenges.findIndex(c => c.id === challenge.id);

    if (existingIdx >= 0) {
        challenges[existingIdx] = challenge;
    } else {
        challenges.push(challenge);
    }

    localStorage.setItem('duo_custom_challenges', JSON.stringify(challenges));

    Components.showToast('✅ Челлендж сохранён!', 'success');
    Components.toggleModal('challengeModal', false);

    // Refresh challenges display
    if (typeof this.renderChallenges === 'function') {
        this.renderChallenges();
    }
};

// Init challenge editor
document.addEventListener('DOMContentLoaded', () => {
    App.setupAvatars();
    App.setupDetailedStats();
    App.setupChallengeEditor();
});
