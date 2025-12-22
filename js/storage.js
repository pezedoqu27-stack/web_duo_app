/**
 * Дуо — Storage Module
 * LocalStorage management for movies, lists, and user data
 */

const Storage = {
    // Storage keys
    KEYS: {
        WISHLIST: 'duo_wishlist',
        WATCHING: 'duo_watching',
        HISTORY: 'duo_history',
        SETTINGS: 'duo_settings',
        API_KEY: 'duo_api_key',
        PERPLEXITY_KEY: 'duo_perplexity_key',
        TURN_DATA: 'duo_turn_data',
        BETS: 'duo_bets',
        CHALLENGES: 'duo_challenges',
        USERS: 'duo_users',
        CUSTOM_TAGS: 'duo_custom_tags',
        ACTIVE_USER: 'duo_active_user',
        USER_DATA: 'duo_user_data',
        MATCHER_LIKES: 'duo_matcher_likes',
        VETO_SESSION: 'duo_veto_session',
        QUOTES: 'duo_quotes'
    },

    /**
     * Initialize storage with default values
     */
    init() {
        if (!this.get(this.KEYS.WISHLIST)) {
            this.set(this.KEYS.WISHLIST, []);
        }
        if (!this.get(this.KEYS.WATCHING)) {
            this.set(this.KEYS.WATCHING, []);
        }
        if (!this.get(this.KEYS.HISTORY)) {
            this.set(this.KEYS.HISTORY, []);
        }
        if (!this.get(this.KEYS.USERS)) {
            this.set(this.KEYS.USERS, { name1: '', name2: '' });
        }
        if (!this.get(this.KEYS.CUSTOM_TAGS)) {
            this.set(this.KEYS.CUSTOM_TAGS, []);
        }
    },

    /**
     * Get data from localStorage
     * @param {string} key - Storage key
     * @returns {any} Parsed data or null
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    /**
     * Set data in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Data to store
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage set error:', e);
        }
    },

    /**
     * Get API key
     * @returns {string|null}
     */
    getApiKey() {
        return this.get(this.KEYS.API_KEY);
    },

    /**
     * Set API key
     * @param {string} key
     */
    setApiKey(key) {
        this.set(this.KEYS.API_KEY, key);
    },

    /**
     * Get Perplexity API key
     * @returns {string|null}
     */
    getPerplexityKey() {
        return this.get(this.KEYS.PERPLEXITY_KEY);
    },

    /**
     * Set Perplexity API key
     * @param {string} key
     */
    setPerplexityKey(key) {
        this.set(this.KEYS.PERPLEXITY_KEY, key);
    },

    /**
     * Get user names
     * @returns {Object} { name1, name2 }
     */
    getUsers() {
        return this.get(this.KEYS.USERS) || { name1: '', name2: '' };
    },

    /**
     * Set user names
     * @param {string} name1
     * @param {string} name2
     */
    setUsers(name1, name2) {
        this.set(this.KEYS.USERS, { name1, name2 });
    },

    /**
     * Get current turn data
     * @returns {Object} { currentTurn: 1|2, lastChanged: Date }
     */
    getTurn() {
        return this.get(this.KEYS.TURN_DATA) || { currentTurn: 1, lastChanged: null };
    },

    /**
     * Switch turn to other user
     * @returns {Object} New turn data
     */
    switchTurn() {
        const current = this.getTurn();
        const newTurn = {
            currentTurn: current.currentTurn === 1 ? 2 : 1,
            lastChanged: Date.now()
        };
        this.set(this.KEYS.TURN_DATA, newTurn);
        return newTurn;
    },

    /**
     * Reset turn (e.g., after watching a movie)
     */
    resetTurn() {
        this.set(this.KEYS.TURN_DATA, { currentTurn: 1, lastChanged: null });
    },

    // ============================================
    // USER ACCOUNTS & CINEMA CURRENCY
    // ============================================

    /**
     * Get active user ('male' or 'female')
     * @returns {string}
     */
    getActiveUser() {
        return this.get(this.KEYS.ACTIVE_USER) || 'male';
    },

    /**
     * Switch active user between male/female
     * @returns {string} new active user
     */
    switchActiveUser() {
        const current = this.getActiveUser();
        const newUser = current === 'male' ? 'female' : 'male';
        this.set(this.KEYS.ACTIVE_USER, newUser);
        return newUser;
    },

    /**
     * Set active user directly
     * @param {string} user - 'male' or 'female'
     */
    setActiveUser(user) {
        if (user === 'male' || user === 'female') {
            this.set(this.KEYS.ACTIVE_USER, user);
        }
    },

    /**
     * Get user data (tickets, name, color)
     * @returns {Object}
     */
    getUserData() {
        return this.get(this.KEYS.USER_DATA) || {
            male: { tickets: 0, name: 'Он', color: '#6ea8fe' },
            female: { tickets: 0, name: 'Она', color: '#f8a5c2' }
        };
    },

    /**
     * Get tickets for active user
     * @param {string} user - optional, defaults to active user
     * @returns {number}
     */
    getTickets(user = null) {
        const userData = this.getUserData();
        const targetUser = user || this.getActiveUser();
        return userData[targetUser]?.tickets || 0;
    },

    /**
     * Add ticket to user
     * @param {string} user - 'male' or 'female'
     * @param {number} amount - tickets to add
     */
    addTicket(user, amount = 1) {
        const userData = this.getUserData();
        if (userData[user]) {
            userData[user].tickets = (userData[user].tickets || 0) + amount;
            this.set(this.KEYS.USER_DATA, userData);
        }
        return userData[user]?.tickets || 0;
    },

    /**
     * Spend ticket from user
     * @param {string} user - 'male' or 'female'
     * @param {number} amount - tickets to spend
     * @returns {boolean} true if successful
     */
    spendTicket(user, amount = 1) {
        const userData = this.getUserData();
        if (userData[user] && userData[user].tickets >= amount) {
            userData[user].tickets -= amount;
            this.set(this.KEYS.USER_DATA, userData);
            return true;
        }
        return false;
    },

    /**
     * Update user profile (name, color)
     * @param {string} user - 'male' or 'female'
     * @param {Object} updates - { name?, color? }
     */
    updateUserProfile(user, updates) {
        const userData = this.getUserData();
        if (userData[user]) {
            userData[user] = { ...userData[user], ...updates };
            this.set(this.KEYS.USER_DATA, userData);
        }
    },

    /**
     * Get user color
     * @param {string} user - optional
     * @returns {string} hex color
     */
    getUserColor(user = null) {
        const userData = this.getUserData();
        const targetUser = user || this.getActiveUser();
        return userData[targetUser]?.color || (targetUser === 'male' ? '#6ea8fe' : '#f8a5c2');
    },

    /**
     * Get all bets
     * @returns {Array}
     */
    getBets() {
        return this.get(this.KEYS.BETS) || [];
    },

    /**
     * Add a new bet/prediction
     * @param {Object} bet - { movieId, movieType, movieTitle, user (1|2), prediction, revealed }
     */
    addBet(bet) {
        const bets = this.getBets();
        bet.id = `bet_${Date.now()}`;
        bet.createdAt = Date.now();
        bet.revealed = false;
        bets.push(bet);
        this.set(this.KEYS.BETS, bets);
        return bet;
    },

    /**
     * Get bets for a specific movie
     * @param {string} movieId
     * @param {string} movieType
     * @returns {Array}
     */
    getMovieBets(movieId, movieType) {
        const bets = this.getBets();
        return bets.filter(b => b.movieId === movieId && b.movieType === movieType);
    },

    /**
     * Reveal a bet
     * @param {string} betId
     */
    revealBet(betId) {
        const bets = this.getBets();
        const bet = bets.find(b => b.id === betId);
        if (bet) {
            bet.revealed = true;
            bet.revealedAt = Date.now();
            this.set(this.KEYS.BETS, bets);
        }
        return bet;
    },

    /**
     * Reveal all bets for a movie
     * @param {string} movieId
     * @param {string} movieType
     */
    revealAllMovieBets(movieId, movieType) {
        const bets = this.getBets();
        let revealed = 0;
        bets.forEach(b => {
            if (b.movieId === movieId && b.movieType === movieType && !b.revealed) {
                b.revealed = true;
                b.revealedAt = Date.now();
                revealed++;
            }
        });
        this.set(this.KEYS.BETS, bets);
        return revealed;
    },

    // Predefined challenges
    CHALLENGES_DATA: {
        'marvel-mcu': {
            id: 'marvel-mcu',
            name: 'Marvel MCU',
            icon: '🦸',
            description: 'Все фильмы киновселенной Marvel',
            movies: [
                { tmdbId: '1726', title: 'Iron Man' },
                { tmdbId: '10138', title: 'Iron Man 2' },
                { tmdbId: '10195', title: 'Thor' },
                { tmdbId: '1771', title: 'Captain America' },
                { tmdbId: '24428', title: 'Avengers' },
                { tmdbId: '68721', title: 'Iron Man 3' },
                { tmdbId: '76338', title: 'Thor: Dark World' },
                { tmdbId: '100402', title: 'Captain America: Winter Soldier' },
                { tmdbId: '118340', title: 'Guardians of the Galaxy' },
                { tmdbId: '99861', title: 'Avengers: Age of Ultron' }
            ]
        },
        'miyazaki': {
            id: 'miyazaki',
            name: 'Хаяо Миядзаки',
            icon: '🎨',
            description: 'Шедевры Studio Ghibli',
            movies: [
                { tmdbId: '129', title: 'Spirited Away' },
                { tmdbId: '128', title: 'Princess Mononoke' },
                { tmdbId: '4935', title: 'Howl\'s Moving Castle' },
                { tmdbId: '12477', title: 'Grave of the Fireflies' },
                { tmdbId: '81', title: 'Nausicaä' },
                { tmdbId: '8392', title: 'My Neighbor Totoro' },
                { tmdbId: '16859', title: 'Ponyo' },
                { tmdbId: '149870', title: 'The Wind Rises' }
            ]
        },
        'top-imdb': {
            id: 'top-imdb',
            name: 'Top-20 IMDb',
            icon: '🏆',
            description: 'Лучшие фильмы всех времён',
            movies: [
                { tmdbId: '278', title: 'The Shawshank Redemption' },
                { tmdbId: '238', title: 'The Godfather' },
                { tmdbId: '155', title: 'The Dark Knight' },
                { tmdbId: '240', title: 'The Godfather Part II' },
                { tmdbId: '424', title: '12 Angry Men' },
                { tmdbId: '389', title: '12 Years a Slave' },
                { tmdbId: '19404', title: 'Dilwale Dulhania' },
                { tmdbId: '497', title: 'The Green Mile' },
                { tmdbId: '13', title: 'Forrest Gump' },
                { tmdbId: '680', title: 'Pulp Fiction' }
            ]
        }
    },

    /**
     * Get user's challenge progress
     * @returns {Object} Challenge progress by id
     */
    getChallenges() {
        return this.get(this.KEYS.CHALLENGES) || {};
    },

    /**
     * Start/join a challenge
     * @param {string} challengeId
     */
    startChallenge(challengeId) {
        const challenges = this.getChallenges();
        if (!challenges[challengeId]) {
            challenges[challengeId] = {
                startedAt: Date.now(),
                completed: []
            };
            this.set(this.KEYS.CHALLENGES, challenges);
        }
        return challenges[challengeId];
    },

    /**
     * Mark a movie as completed in a challenge
     * @param {string} challengeId
     * @param {string} tmdbId
     */
    markChallengeMovie(challengeId, tmdbId) {
        const challenges = this.getChallenges();
        if (challenges[challengeId] && !challenges[challengeId].completed.includes(tmdbId)) {
            challenges[challengeId].completed.push(tmdbId);
            this.set(this.KEYS.CHALLENGES, challenges);
        }
    },

    /**
     * Get challenge progress percentage
     * @param {string} challengeId
     * @returns {number}
     */
    getChallengeProgress(challengeId) {
        const challenges = this.getChallenges();
        const challengeData = this.CHALLENGES_DATA[challengeId];
        if (!challenges[challengeId] || !challengeData) return 0;

        const total = challengeData.movies.length;
        const completed = challenges[challengeId].completed.length;
        return Math.round((completed / total) * 100);
    },

    /**
     * Get all movies from a list
     * @param {string} listKey - List key (WISHLIST, WATCHING, HISTORY)
     * @returns {Array} Movies array
     */
    getList(listKey) {
        return this.get(listKey) || [];
    },

    /**
     * Add movie to a list
     * @param {string} listKey - List key
     * @param {Object} movie - Movie object
     */
    addToList(listKey, movie) {
        const list = this.getList(listKey);

        // Check if already exists
        if (list.some(m => m.id === movie.id && m.type === movie.type)) {
            return false;
        }

        // Add timestamp and default values
        movie.addedAt = Date.now();
        movie.tags = movie.tags || [];
        movie.notes = movie.notes || '';
        movie.rating1 = movie.rating1 || null;
        movie.rating2 = movie.rating2 || null;
        movie.currentEpisode = movie.currentEpisode || 0;
        movie.totalEpisodes = movie.totalEpisodes || 0;

        // Track who added (for Wishlist Sync)
        const activeUser = this.getActiveUser();
        if (!movie.addedBy) {
            movie.addedBy = activeUser;
        } else if (movie.addedBy !== activeUser && movie.addedBy !== 'both') {
            // Second user also wants this movie = MATCH!
            movie.addedBy = 'both';
        }

        list.unshift(movie);
        this.set(listKey, list);
        return true;
    },

    /**
     * Mark movie as wanted by current user (for Wishlist Sync MATCH)
     * @param {string} movieId
     * @param {string} movieType
     */
    markWanted(movieId, movieType) {
        const list = this.getList(this.KEYS.WISHLIST);
        const idx = list.findIndex(m => m.id === movieId && m.type === movieType);

        if (idx !== -1) {
            const movie = list[idx];
            const activeUser = this.getActiveUser();

            if (movie.addedBy !== activeUser && movie.addedBy !== 'both') {
                movie.addedBy = 'both';
                // Move to top of list
                list.splice(idx, 1);
                list.unshift(movie);
                this.set(this.KEYS.WISHLIST, list);
                return true;
            }
        }
        return false;
    },

    /**
     * Remove movie from a list
     * @param {string} listKey - List key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type (movie, tv, anime)
     */
    removeFromList(listKey, movieId, type) {
        const list = this.getList(listKey);
        const filtered = list.filter(m => !(m.id === movieId && m.type === type));
        this.set(listKey, filtered);
    },

    /**
     * Update movie in list (e.g., add cheatedBy marker)
     * @param {string} listKey
     * @param {Object} updatedMovie
     */
    updateMovieInList(listKey, updatedMovie) {
        const list = this.getList(listKey);
        const idx = list.findIndex(m => m.id === updatedMovie.id && m.type === updatedMovie.type);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedMovie };
            this.set(listKey, list);
        }
    },

    // ============================================
    // QUOTES SYSTEM
    // ============================================

    /**
     * Get all quotes
     * @returns {Array}
     */
    getQuotes() {
        return this.get(this.KEYS.QUOTES) || [];
    },

    /**
     * Add quote for a movie
     * @param {string} movieId
     * @param {string} movieType
     * @param {string} movieTitle
     * @param {string} text
     */
    addQuote(movieId, movieType, movieTitle, text) {
        const quotes = this.getQuotes();
        quotes.push({
            id: `quote_${Date.now()}`,
            movieId,
            movieType,
            movieTitle,
            text,
            createdAt: Date.now()
        });
        this.set(this.KEYS.QUOTES, quotes);
    },

    /**
     * Get quotes for a specific movie
     * @param {string} movieId
     * @param {string} movieType
     * @returns {Array}
     */
    getMovieQuotes(movieId, movieType) {
        return this.getQuotes().filter(q => q.movieId === movieId && q.movieType === movieType);
    },

    /**
     * Get random quote for "Quote of the day"
     * @returns {Object|null}
     */
    getRandomQuote() {
        const quotes = this.getQuotes();
        if (quotes.length === 0) return null;
        return quotes[Math.floor(Math.random() * quotes.length)];
    },

    /**
     * Move movie between lists
     * @param {string} fromList - Source list key
     * @param {string} toList - Destination list key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     */
    moveToList(fromList, toList, movieId, type) {
        const source = this.getList(fromList);
        const movie = source.find(m => m.id === movieId && m.type === type);

        if (movie) {
            this.removeFromList(fromList, movieId, type);
            movie.movedAt = Date.now();
            this.addToList(toList, movie);
            return movie;
        }
        return null;
    },

    /**
     * Update movie data
     * @param {string} listKey - List key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @param {Object} updates - Data to update
     */
    updateMovie(listKey, movieId, type, updates) {
        const list = this.getList(listKey);
        const index = list.findIndex(m => m.id === movieId && m.type === type);

        if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            this.set(listKey, list);
            return list[index];
        }
        return null;
    },

    /**
     * Find movie in any list
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @returns {Object|null} { movie, listKey }
     */
    findMovie(movieId, type) {
        const lists = [this.KEYS.WISHLIST, this.KEYS.WATCHING, this.KEYS.HISTORY];

        for (const listKey of lists) {
            const list = this.getList(listKey);
            const movie = list.find(m => m.id === movieId && m.type === type);
            if (movie) {
                return { movie, listKey };
            }
        }
        return null;
    },

    /**
     * Set rating for a movie
     * @param {string} listKey - List key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @param {number} rating1 - First user rating
     * @param {number} rating2 - Second user rating
     */
    setRating(listKey, movieId, type, rating1, rating2) {
        return this.updateMovie(listKey, movieId, type, {
            rating1,
            rating2,
            avgRating: ((rating1 + rating2) / 2).toFixed(1),
            ratedAt: Date.now()
        });
    },

    /**
     * Update progress for series
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @param {number} currentEpisode - Current episode
     * @param {number} totalEpisodes - Total episodes
     */
    updateProgress(movieId, type, currentEpisode, totalEpisodes) {
        return this.updateMovie(this.KEYS.WATCHING, movieId, type, {
            currentEpisode,
            totalEpisodes
        });
    },

    /**
     * Add/remove tag from movie
     * @param {string} listKey - List key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @param {string} tag - Tag to toggle
     */
    toggleTag(listKey, movieId, type, tag) {
        const found = this.findMovie(movieId, type);
        if (!found) return null;

        const { movie } = found;
        const tags = movie.tags || [];
        const index = tags.indexOf(tag);

        if (index === -1) {
            tags.push(tag);
        } else {
            tags.splice(index, 1);
        }

        return this.updateMovie(found.listKey, movieId, type, { tags });
    },

    /**
     * Set notes for a movie
     * @param {string} listKey - List key
     * @param {string} movieId - Movie ID
     * @param {string} type - Movie type
     * @param {string} notes - Notes text
     */
    setNotes(listKey, movieId, type, notes) {
        return this.updateMovie(listKey, movieId, type, { notes });
    },

    /**
     * Add custom tag
     * @param {string} tag - Tag to add
     */
    addCustomTag(tag) {
        const tags = this.get(this.KEYS.CUSTOM_TAGS) || [];
        if (!tags.includes(tag)) {
            tags.push(tag);
            this.set(this.KEYS.CUSTOM_TAGS, tags);
        }
    },

    /**
     * Get all custom tags
     * @returns {Array}
     */
    getCustomTags() {
        return this.get(this.KEYS.CUSTOM_TAGS) || [];
    },

    /**
     * Get statistics
     * @returns {Object} Stats data
     */
    getStats() {
        const history = this.getList(this.KEYS.HISTORY);
        const users = this.getUsers();

        // Total watched
        const totalWatched = history.length;

        // Total hours (rough estimation)
        const totalMinutes = history.reduce((sum, movie) => {
            return sum + (movie.runtime || 120);
        }, 0);
        const totalHours = Math.round(totalMinutes / 60);

        // Average rating
        const ratedMovies = history.filter(m => m.avgRating);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((sum, m) => sum + parseFloat(m.avgRating), 0) / ratedMovies.length).toFixed(1)
            : '—';

        // Who is kinder (gives higher ratings)
        const avgRating1 = ratedMovies.length > 0
            ? ratedMovies.reduce((sum, m) => sum + (m.rating1 || 0), 0) / ratedMovies.length
            : 0;
        const avgRating2 = ratedMovies.length > 0
            ? ratedMovies.reduce((sum, m) => sum + (m.rating2 || 0), 0) / ratedMovies.length
            : 0;

        // Genre stats
        const genreCounts = {};
        history.forEach(movie => {
            (movie.genres || []).forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Movie of the year (highest combined rating)
        const movieOfYear = ratedMovies
            .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))[0] || null;

        return {
            totalWatched,
            totalHours,
            avgRating,
            avgRating1,
            avgRating2,
            topGenres,
            movieOfYear,
            users
        };
    },

    /**
     * Get movies by tag
     * @param {string} tag - Tag to filter by
     * @returns {Array}
     */
    getByTag(tag) {
        const all = [
            ...this.getList(this.KEYS.WISHLIST),
            ...this.getList(this.KEYS.WATCHING),
            ...this.getList(this.KEYS.HISTORY)
        ];
        return all.filter(m => (m.tags || []).includes(tag));
    },

    /**
     * Get movies by runtime filter
     * @param {number} maxMinutes - Maximum runtime in minutes
     * @returns {Array}
     */
    filterByRuntime(movies, maxMinutes) {
        if (!maxMinutes || maxMinutes === 0) return movies;
        return movies.filter(m => (m.runtime || 120) <= maxMinutes);
    },

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.init();
    }
};

// Initialize storage on load
Storage.init();
