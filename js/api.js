/**
 * Дуо — API Module
 * TMDB and Jikan API integration (production version)
 */

const API = {
    // API endpoints
    TMDB_BASE: 'https://api.themoviedb.org/3',
    TMDB_IMAGE: 'https://image.tmdb.org/t/p',
    JIKAN_BASE: 'https://api.jikan.moe/v4',

    // Genre mappings for TMDB
    GENRES: {
        28: 'Экшн',
        12: 'Приключения',
        16: 'Мультфильм',
        35: 'Комедия',
        80: 'Криминал',
        99: 'Документальный',
        18: 'Драма',
        10751: 'Семейный',
        14: 'Фэнтези',
        36: 'Исторический',
        27: 'Ужасы',
        10402: 'Музыка',
        9648: 'Детектив',
        10749: 'Мелодрама',
        878: 'Фантастика',
        10770: 'ТВ-фильм',
        53: 'Триллер',
        10752: 'Военный',
        37: 'Вестерн',
        10759: 'Боевик',
        10762: 'Детский',
        10763: 'Новости',
        10764: 'Реалити',
        10765: 'Sci-Fi',
        10766: 'Мыльная опера',
        10767: 'Ток-шоу',
        10768: 'Война'
    },

    /**
   * Get API key from storage
   * @returns {string|null}
   */
    getApiKey() {
        return Storage.getApiKey();
    },

    /**
     * Check if API key is configured
     * @returns {boolean}
     */
    hasApiKey() {
        const key = this.getApiKey();
        return key && key.trim().length > 0;
    },

    /**
     * Check if the key is a v4 Bearer token (JWT format, starts with "ey")
     * @returns {boolean}
     */
    isV4Token() {
        const key = this.getApiKey();
        return key && (key.startsWith('ey') || key.length > 50);
    },

    /**
     * Make a TMDB API request with proper authentication
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} params - Query parameters
     * @returns {Promise<Response>}
     */
    async tmdbFetch(endpoint, params = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key not configured');
        }

        const url = new URL(`${this.TMDB_BASE}${endpoint}`);

        // Add language parameter
        url.searchParams.set('language', 'ru-RU');

        // Add other params
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, value);
            }
        });

        let response;

        if (this.isV4Token()) {
            // Use Bearer token authentication (v4)
            console.log('Using TMDB v4 Bearer auth');
            response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            // Use api_key parameter (v3)
            console.log('Using TMDB v3 api_key auth');
            url.searchParams.set('api_key', apiKey);
            response = await fetch(url.toString());
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('TMDB API error:', response.status, errorText);
            throw new Error(`TMDB API error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Search for movies, TV shows, or multi
     * @param {string} query - Search query
     * @param {string} type - 'movie', 'tv', 'multi'
     * @returns {Promise<Array>}
     */
    async search(query, type = 'multi') {
        if (!this.hasApiKey()) {
            console.warn('TMDB API key not configured');
            return [];
        }

        try {
            const data = await this.tmdbFetch(`/search/${type}`, {
                query: query,
                include_adult: false
            });

            console.log('TMDB Results count:', data.results?.length || 0);
            return this.formatTMDBResults(data.results || [], type);
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    },

    /**
     * Search anime via Jikan API
     * @param {string} query - Search query
     * @returns {Promise<Array>}
     */
    async searchAnime(query) {
        try {
            const url = `${this.JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true`;
            console.log('Jikan Search URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                console.error('Jikan API error:', response.status);
                throw new Error('Jikan API error');
            }

            const data = await response.json();
            console.log('Jikan Results count:', data.data?.length || 0);

            return this.formatJikanResults(data.data || []);
        } catch (error) {
            console.error('Anime search error:', error);
            return [];
        }
    },

    /**
     * Get trending content
     * @param {string} mediaType - 'movie', 'tv', or 'all'
     * @returns {Promise<Array>}
     */
    async getTrending(mediaType = 'all') {
        if (!this.hasApiKey()) {
            console.warn('TMDB API key not configured');
            return [];
        }

        try {
            const data = await this.tmdbFetch(`/trending/${mediaType}/week`);
            console.log('Trending Results count:', data.results?.length || 0);
            return this.formatTMDBResults(data.results?.slice(0, 20) || [], 'multi');
        } catch (error) {
            console.error('Trending error:', error);
            return [];
        }
    },

    /**
     * Get popular movies
     * @returns {Promise<Array>}
     */
    async getPopular() {
        if (!this.hasApiKey()) {
            return [];
        }

        try {
            const data = await this.tmdbFetch('/movie/popular');
            return this.formatTMDBResults(data.results?.slice(0, 12) || [], 'movie');
        } catch (error) {
            console.error('Popular error:', error);
            return [];
        }
    },

    /**
     * Get movie/TV details
     * @param {string} id - TMDB ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<Object>}
     */
    async getDetails(id, type) {
        if (!this.hasApiKey()) {
            return null;
        }

        // Skip for anime IDs
        if (id.toString().startsWith('anime_')) {
            return null;
        }

        try {
            const data = await this.tmdbFetch(`/${type}/${id}`);
            return this.formatTMDBDetail(data, type);
        } catch (error) {
            console.error('Details error:', error);
            return null;
        }
    },

    /**
     * Format TMDB search results
     * @param {Array} results - Raw TMDB results
     * @param {string} type - Content type
     * @returns {Array}
     */
    formatTMDBResults(results, type) {
        if (!results || !Array.isArray(results)) {
            return [];
        }

        return results
            .filter(item => item.poster_path) // Only items with posters
            .map(item => {
                // For multi search, use the media_type from response
                // For specific type search, use the type parameter
                let mediaType;
                if (type === 'multi') {
                    mediaType = item.media_type;
                } else {
                    mediaType = type;
                }

                // Skip 'person' results from multi search
                if (mediaType === 'person') {
                    return null;
                }

                return {
                    id: item.id.toString(),
                    type: mediaType === 'movie' ? 'movie' : 'tv',
                    title: item.title || item.name || 'Без названия',
                    originalTitle: item.original_title || item.original_name || '',
                    year: (item.release_date || item.first_air_date || '').slice(0, 4),
                    poster: `${this.TMDB_IMAGE}/w342${item.poster_path}`,
                    backdrop: item.backdrop_path ? `${this.TMDB_IMAGE}/w1280${item.backdrop_path}` : null,
                    overview: item.overview || 'Описание отсутствует',
                    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
                    genres: (item.genre_ids || []).map(id => this.GENRES[id]).filter(Boolean),
                    runtime: null, // Will be fetched in details
                    voteCount: item.vote_count || 0
                };
            })
            .filter(Boolean); // Remove null items (persons)
    },

    /**
     * Format TMDB detail result
     * @param {Object} item - Raw TMDB detail
     * @param {string} type - Content type
     * @returns {Object}
     */
    formatTMDBDetail(item, type) {
        return {
            id: item.id.toString(),
            type: type,
            title: item.title || item.name,
            originalTitle: item.original_title || item.original_name,
            year: (item.release_date || item.first_air_date || '').slice(0, 4),
            poster: item.poster_path ? `${this.TMDB_IMAGE}/w500${item.poster_path}` : null,
            backdrop: item.backdrop_path ? `${this.TMDB_IMAGE}/w1280${item.backdrop_path}` : null,
            overview: item.overview || 'Описание отсутствует',
            rating: item.vote_average ? item.vote_average.toFixed(1) : null,
            genres: (item.genres || []).map(g => g.name),
            runtime: type === 'movie' ? item.runtime : (item.episode_run_time?.[0] || 45),
            totalEpisodes: type === 'tv' ? item.number_of_episodes : 0,
            totalSeasons: type === 'tv' ? item.number_of_seasons : 0,
            voteCount: item.vote_count || 0
        };
    },

    /**
     * Format Jikan anime results
     * @param {Array} results - Raw Jikan results
     * @returns {Array}
     */
    formatJikanResults(results) {
        if (!results || !Array.isArray(results)) {
            return [];
        }

        return results
            .filter(item => item.images?.jpg?.image_url)
            .map(item => ({
                id: `anime_${item.mal_id}`,
                type: 'anime',
                title: item.title_russian || item.title || 'Без названия',
                originalTitle: item.title || '',
                year: item.year?.toString() || (item.aired?.from ? new Date(item.aired.from).getFullYear().toString() : ''),
                poster: item.images.jpg.large_image_url || item.images.jpg.image_url,
                backdrop: null,
                overview: item.synopsis || 'Описание отсутствует',
                rating: item.score ? item.score.toFixed(1) : null,
                genres: (item.genres || []).map(g => g.name),
                runtime: item.duration ? parseInt(item.duration) || 24 : 24,
                totalEpisodes: item.episodes || 0,
                voteCount: item.scored_by || 0
            }));
    },

    /**
     * Get poster URL helper
     * @param {string} path - Poster path
     * @param {string} size - Size (w342, w500, original)
     * @returns {string}
     */
    getPosterUrl(path, size = 'w342') {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${this.TMDB_IMAGE}/${size}${path}`;
    },

    /**
     * Search across all sources (TMDB + Jikan)
     * @param {string} query - Search query
     * @param {string} filter - 'all', 'movie', 'tv', 'anime'
     * @returns {Promise<Array>}
     */
    async searchAll(query, filter = 'all') {
        if (!query || query.length < 2) {
            return [];
        }

        let results = [];

        try {
            if (filter === 'anime') {
                // Only anime search
                results = await this.searchAnime(query);
            } else if (filter === 'movie') {
                // Only movies
                results = await this.search(query, 'movie');
            } else if (filter === 'tv') {
                // Only TV shows
                results = await this.search(query, 'tv');
            } else {
                // All: movies, TV, and anime
                const [tmdbResults, animeResults] = await Promise.all([
                    this.search(query, 'multi'),
                    this.searchAnime(query)
                ]);

                // Merge and interleave results
                results = [...tmdbResults];

                // Add some anime at the end
                if (animeResults.length > 0) {
                    results.push(...animeResults.slice(0, 6));
                }
            }
        } catch (error) {
            console.error('SearchAll error:', error);
        }

        return results;
    },

    /**
     * Get random movie suggestion from trending
     * @returns {Promise<Object|null>}
     */
    async getRandomSuggestion() {
        try {
            const trending = await this.getTrending('movie');
            if (trending.length === 0) return null;

            const randomIndex = Math.floor(Math.random() * trending.length);
            return trending[randomIndex];
        } catch (error) {
            console.error('Random suggestion error:', error);
            return null;
        }
    },

    /**
     * Discover movies/TV with advanced filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>}
     */
    async discover(filters = {}) {
        if (!this.hasApiKey()) {
            console.warn('TMDB API key not configured');
            return [];
        }

        const {
            type = 'movie',
            excludeGenres = [],
            yearFrom = null,
            yearTo = null,
            minRating = 0,
            excludeCountries = [],
            page = 1
        } = filters;

        try {
            const params = {
                page: page,
                sort_by: 'popularity.desc',
                include_adult: false
            };

            // Exclude genres
            if (excludeGenres.length > 0) {
                params.without_genres = excludeGenres.join(',');
            }

            // Year range
            if (type === 'movie') {
                if (yearFrom) params['primary_release_date.gte'] = `${yearFrom}-01-01`;
                if (yearTo) params['primary_release_date.lte'] = `${yearTo}-12-31`;
            } else {
                if (yearFrom) params['first_air_date.gte'] = `${yearFrom}-01-01`;
                if (yearTo) params['first_air_date.lte'] = `${yearTo}-12-31`;
            }

            // Minimum rating
            if (minRating > 0) {
                params['vote_average.gte'] = minRating;
                params['vote_count.gte'] = 50; // Ensure enough votes
            }

            // Exclude countries
            if (excludeCountries.length > 0) {
                params.without_origin_country = excludeCountries.join('|');
            }

            const data = await this.tmdbFetch(`/discover/${type}`, params);
            console.log('Discover Results count:', data.results?.length || 0);
            return this.formatTMDBResults(data.results || [], type);
        } catch (error) {
            console.error('Discover error:', error);
            return [];
        }
    },

    /**
     * Get list of all TMDB genres
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<Array>}
     */
    async getGenres(type = 'movie') {
        if (!this.hasApiKey()) {
            // Return hardcoded genres if no API key
            return Object.entries(this.GENRES).map(([id, name]) => ({ id: parseInt(id), name }));
        }

        try {
            const data = await this.tmdbFetch(`/genre/${type}/list`);
            return data.genres || [];
        } catch (error) {
            console.error('Genres error:', error);
            return Object.entries(this.GENRES).map(([id, name]) => ({ id: parseInt(id), name }));
        }
    }
};
