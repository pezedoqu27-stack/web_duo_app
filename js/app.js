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

        // Render results
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
        <div class="empty-state">
          <p>Ничего не найдено</p>
          <span>Попробуйте изменить запрос или проверьте API ключ</span>
        </div>
      `;
            return;
        }

        results.forEach(movie => {
            resultsContainer.appendChild(
                Components.createMovieCard(movie, (m) => this.openMovieDetail(m))
            );
        });
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

    /**
     * Load wishlist
     */
    loadWishlist() {
        const container = document.getElementById('wishlistMovies');
        const emptyState = document.getElementById('wishlistEmpty');
        const movies = Storage.getList(Storage.KEYS.WISHLIST);

        container.innerHTML = '';

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
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
