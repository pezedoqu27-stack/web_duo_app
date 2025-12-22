/**
 * Дуо — Components Module
 * UI components and rendering functions
 */

const Components = {
    /**
     * Create a movie card element
     * @param {Object} movie - Movie data
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement}
     */
    createMovieCard(movie, onClick) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.id;
        card.dataset.type = movie.type;

        const avgRating = movie.avgRating || movie.rating;

        card.innerHTML = `
      ${movie.poster
                ? `<img src="${movie.poster}" alt="${movie.title}" loading="lazy">`
                : `<div class="movie-card-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg></div>`
            }
      ${avgRating ? `<div class="movie-card-rating">★ ${avgRating}</div>` : ''}
      <div class="movie-card-overlay">
        <div class="movie-card-title">${movie.title}</div>
        <div class="movie-card-year">${movie.year || ''}</div>
      </div>
    `;

        card.addEventListener('click', () => onClick(movie));
        return card;
    },

    /**
     * Create a movie list item (for history/watching)
     * @param {Object} movie - Movie data
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement}
     */
    createMovieListItem(movie, onClick) {
        const item = document.createElement('div');
        item.className = 'movie-list-item';
        item.dataset.id = movie.id;
        item.dataset.type = movie.type;

        const users = Storage.getUsers();
        const name1 = users.name1 || 'Оценка 1';
        const name2 = users.name2 || 'Оценка 2';

        let progressHtml = '';
        if (movie.type !== 'movie' && movie.totalEpisodes > 0) {
            const progress = Math.round((movie.currentEpisode / movie.totalEpisodes) * 100);
            progressHtml = `
        <div class="progress-container">
          <div class="progress-label">${movie.currentEpisode} / ${movie.totalEpisodes} серий</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      `;
        }

        let ratingsHtml = '';
        if (movie.rating1 && movie.rating2) {
            ratingsHtml = `
        <div class="movie-list-ratings">
          <div class="movie-list-rating">
            <span>${name1}:</span>
            <span class="star">★</span>
            <span>${movie.rating1}</span>
          </div>
          <div class="movie-list-rating">
            <span>${name2}:</span>
            <span class="star">★</span>
            <span>${movie.rating2}</span>
          </div>
          <div class="movie-list-rating">
            <span>Общий:</span>
            <span class="star">★</span>
            <span>${movie.avgRating}</span>
          </div>
        </div>
      `;
        }

        let tagsHtml = '';
        if (movie.tags && movie.tags.length > 0) {
            tagsHtml = `
        <div class="movie-list-tags">
          ${movie.tags.map(tag => `<span class="movie-list-tag">#${tag}</span>`).join('')}
        </div>
      `;
        }

        item.innerHTML = `
      ${movie.poster
                ? `<img class="movie-list-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy">`
                : `<div class="movie-list-poster movie-card-placeholder"></div>`
            }
      <div class="movie-list-info">
        <div class="movie-list-title">${movie.title}</div>
        <div class="movie-list-meta">${movie.year || ''} ${movie.genres ? '• ' + movie.genres.slice(0, 2).join(', ') : ''}</div>
        ${ratingsHtml}
        ${progressHtml}
        ${tagsHtml}
      </div>
    `;

        item.addEventListener('click', () => onClick(movie));
        return item;
    },

    /**
     * Create skeleton loading cards
     * @param {number} count - Number of skeletons
     * @returns {DocumentFragment}
     */
    createSkeletons(count) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'movie-card skeleton';
            fragment.appendChild(skeleton);
        }
        return fragment;
    },

    /**
     * Create matcher card for Cinema Tinder
     * @param {Object} movie - Movie data
     * @returns {HTMLElement}
     */
    createMatcherCard(movie) {
        const card = document.createElement('div');
        card.className = 'matcher-card';
        card.dataset.id = movie.id;
        card.dataset.type = movie.type;
        card.style.backgroundImage = `url(${movie.poster})`;
        return card;
    },

    /**
     * Create genre bar for stats
     * @param {string} genre - Genre name
     * @param {number} count - Movie count
     * @param {number} maxCount - Maximum count for percentage
     * @returns {HTMLElement}
     */
    createGenreBar(genre, count, maxCount) {
        const bar = document.createElement('div');
        bar.className = 'genre-bar';
        const percentage = Math.round((count / maxCount) * 100);

        bar.innerHTML = `
      <div class="genre-label">${genre}</div>
      <div class="genre-fill-container">
        <div class="genre-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="genre-count">${count}</div>
    `;

        return bar;
    },

    /**
     * Update combined rating display
     * @param {number} rating1 - First rating
     * @param {number} rating2 - Second rating
     */
    updateCombinedRating(rating1, rating2) {
        const combined = ((rating1 + rating2) / 2).toFixed(1);
        const combinedEl = document.getElementById('combinedRating');
        if (combinedEl) {
            combinedEl.textContent = combined;
        }
    },

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - 'success', 'error', or default
     * @param {number} duration - Duration in ms
     */
    showToast(message, type = '', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show';
        if (type) toast.classList.add(type);

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    /**
     * Toggle modal visibility
     * @param {string} modalId - Modal element ID
     * @param {boolean} show - Show or hide
     */
    toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (show) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Render movie detail modal content
     * @param {Object} movie - Movie data
     * @param {string} currentList - Current list the movie is in (or null)
     */
    renderMovieDetail(movie, currentList) {
        const backdrop = document.getElementById('movieBackdrop');
        const poster = document.getElementById('moviePoster');
        const title = document.getElementById('movieTitle');
        const year = document.getElementById('movieYear');
        const genres = document.getElementById('movieGenres');
        const overview = document.getElementById('movieOverview');
        const runtime = document.getElementById('movieRuntime');
        const actions = document.getElementById('movieActions');
        const tagsContainer = document.querySelector('.tags-container');
        const notesInput = document.getElementById('movieNotes');

        // Set content
        backdrop.style.backgroundImage = movie.backdrop ? `url(${movie.backdrop})` : '';
        poster.src = movie.poster || '';
        poster.alt = movie.title;
        title.textContent = movie.title;
        year.textContent = `${movie.year || ''} ${movie.type === 'movie' ? '• Фильм' : movie.type === 'anime' ? '• Аниме' : '• Сериал'}`;

        // Genres
        genres.innerHTML = (movie.genres || [])
            .map(g => `<span class="movie-genre">${g}</span>`)
            .join('');

        overview.textContent = movie.overview || 'Описание отсутствует';

        // Runtime
        if (movie.runtime) {
            const hours = Math.floor(movie.runtime / 60);
            const mins = movie.runtime % 60;
            runtime.textContent = hours > 0 ? `${hours}ч ${mins}мин` : `${mins}мин`;
        } else {
            runtime.textContent = '';
        }

        // Tags
        const movieTags = movie.tags || [];
        tagsContainer.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.toggle('active', movieTags.includes(btn.dataset.tag));
        });

        // Notes
        notesInput.value = movie.notes || '';

        // Actions based on current list
        let actionsHtml = '';

        if (!currentList) {
            // Not in any list - show "Add to wishlist"
            actionsHtml = `
        <button class="btn-primary" data-action="add-wishlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Буду смотреть
        </button>
      `;
        } else if (currentList === Storage.KEYS.WISHLIST) {
            actionsHtml = `
        <button class="btn-primary" data-action="start-watching">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Начать смотреть
        </button>
        <button class="btn-secondary" data-action="remove">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Удалить
        </button>
      `;
        } else if (currentList === Storage.KEYS.WATCHING) {
            actionsHtml = `
        <button class="btn-primary" data-action="mark-watched">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Посмотрели
        </button>
        ${movie.type !== 'movie' ? `
          <div class="episode-controls">
            <button class="btn-secondary" data-action="prev-episode">−</button>
            <span>Серия ${movie.currentEpisode || 0}/${movie.totalEpisodes || '?'}</span>
            <button class="btn-secondary" data-action="next-episode">+</button>
          </div>
        ` : ''}
        <button class="btn-secondary" data-action="back-to-wishlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Вернуть в вишлист
        </button>
      `;
        } else if (currentList === Storage.KEYS.HISTORY) {
            actionsHtml = `
        <button class="btn-primary" data-action="edit-rating">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Изменить оценку
        </button>
        <button class="btn-secondary" data-action="rewatch">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Пересмотреть
        </button>
      `;
        }

        actions.innerHTML = actionsHtml;
    },

    /**
     * Render rating modal for a movie
     * @param {Object} movie - Movie data
     */
    renderRatingModal(movie) {
        const poster = document.getElementById('ratingPoster');
        const title = document.getElementById('ratingMovieTitle');
        const label1 = document.getElementById('ratingLabel1');
        const label2 = document.getElementById('ratingLabel2');
        const slider1 = document.getElementById('rating1');
        const slider2 = document.getElementById('rating2');
        const value1 = document.getElementById('ratingValue1');
        const value2 = document.getElementById('ratingValue2');

        const users = Storage.getUsers();

        poster.style.backgroundImage = `url(${movie.poster})`;
        title.textContent = movie.title;
        label1.textContent = users.name1 || 'Оценка 1';
        label2.textContent = users.name2 || 'Оценка 2';

        // Set existing ratings if available
        slider1.value = movie.rating1 || 7;
        slider2.value = movie.rating2 || 7;
        value1.textContent = slider1.value;
        value2.textContent = slider2.value;

        this.updateCombinedRating(parseInt(slider1.value), parseInt(slider2.value));

        // Store movie reference
        document.getElementById('ratingModal').dataset.movieId = movie.id;
        document.getElementById('ratingModal').dataset.movieType = movie.type;
    },

    /**
     * Render randomizer mood buttons
     */
    renderRandomizerMoods() {
        const container = document.getElementById('randomizerMoods');
        if (!container) return;

        const defaultTags = ['ПодВинишко', 'Поплакать', 'ФономДляУжина', 'Мозговынос', 'Романтика', 'Напряжение'];
        const customTags = Storage.getCustomTags();
        const allTags = [...new Set([...defaultTags, ...customTags])];

        container.innerHTML = allTags.map(tag => `
      <button class="time-btn" data-mood="${tag}">#${tag}</button>
    `).join('');
    },

    /**
     * Update statistics display
     */
    updateStats() {
        const stats = Storage.getStats();

        // Basic stats
        document.getElementById('totalWatched').textContent = stats.totalWatched;
        document.getElementById('totalHours').textContent = `${stats.totalHours}ч`;
        document.getElementById('avgRating').textContent = stats.avgRating;

        // User names
        const users = stats.users;
        document.getElementById('name1').value = users.name1 || '';
        document.getElementById('name2').value = users.name2 || '';

        // Kindness bar
        const kindnessBar = document.getElementById('kindnessBar');
        const kindnessLabel1 = document.getElementById('kindnessLabel1');
        const kindnessLabel2 = document.getElementById('kindnessLabel2');

        if (stats.avgRating1 > 0 || stats.avgRating2 > 0) {
            const total = stats.avgRating1 + stats.avgRating2;
            const percentage = (stats.avgRating1 / total) * 100;
            kindnessBar.style.width = `${percentage}%`;
            kindnessLabel1.textContent = `${users.name1 || 'Первый'}: ${stats.avgRating1.toFixed(1)}`;
            kindnessLabel2.textContent = `${users.name2 || 'Второй'}: ${stats.avgRating2.toFixed(1)}`;
        }

        // Genre chart
        const genresChart = document.getElementById('genresChart');
        genresChart.innerHTML = '';

        if (stats.topGenres.length > 0) {
            const maxCount = stats.topGenres[0][1];
            stats.topGenres.forEach(([genre, count]) => {
                genresChart.appendChild(this.createGenreBar(genre, count, maxCount));
            });
        } else {
            genresChart.innerHTML = '<p class="empty-hint">Посмотрите больше фильмов</p>';
        }

        // Movie of the year
        const movieOfYear = document.getElementById('movieOfYear');
        if (stats.movieOfYear) {
            movieOfYear.innerHTML = `
        <div class="movie-of-year-card">
          <img class="movie-of-year-poster" src="${stats.movieOfYear.poster}" alt="${stats.movieOfYear.title}">
          <div class="movie-of-year-title">${stats.movieOfYear.title}</div>
          <div class="movie-of-year-rating">★ ${stats.movieOfYear.avgRating}</div>
        </div>
      `;
        }
    },

    /**
     * Animate confetti for match celebration
     */
    triggerConfetti() {
        const confetti = document.querySelector('.confetti');
        if (confetti) {
            confetti.style.display = 'block';
            setTimeout(() => {
                confetti.style.display = 'none';
            }, 3000);
        }
    }
};
