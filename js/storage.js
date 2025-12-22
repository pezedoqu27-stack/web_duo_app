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
        USERS: 'duo_users',
        CUSTOM_TAGS: 'duo_custom_tags'
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

        list.unshift(movie);
        this.set(listKey, list);
        return true;
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
