/**
 * Дуо — Color Thief Module
 * Extract dominant color from movie posters using Canvas
 */

const ColorThief = {
    /**
     * Extract dominant color from an image URL
     * @param {string} imageUrl - URL of the image
     * @returns {Promise<{r: number, g: number, b: number}>}
     */
    async getDominantColor(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
                try {
                    const color = this.extractColor(img);
                    resolve(color);
                } catch (e) {
                    console.error('Color extraction error:', e);
                    resolve({ r: 184, g: 165, b: 211 }); // Default accent color
                }
            };

            img.onerror = () => {
                console.log('Image load failed for color extraction');
                resolve({ r: 184, g: 165, b: 211 }); // Default accent color
            };

            // Timeout for slow images
            setTimeout(() => {
                resolve({ r: 184, g: 165, b: 211 });
            }, 3000);

            img.src = imageUrl;
        });
    },

    /**
     * Extract color from loaded image using canvas
     * @param {HTMLImageElement} img - Loaded image element
     * @returns {{r: number, g: number, b: number}}
     */
    extractColor(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use small size for performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;

        // Draw scaled image
        ctx.drawImage(img, 0, 0, size, size);

        // Get image data
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Count color frequencies
        const colorCounts = {};

        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            // Skip very dark or very light pixels (often background)
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 225) continue;

            // Quantize to reduce unique colors
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;

            const key = `${qr},${qg},${qb}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // Find most common color
        let maxCount = 0;
        let dominantColor = { r: 184, g: 165, b: 211 };

        for (const [key, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
                maxCount = count;
                const [r, g, b] = key.split(',').map(Number);
                dominantColor = { r, g, b };
            }
        }

        return dominantColor;
    },

    /**
     * Convert RGB to HSL
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {{h: number, s: number, l: number}}
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    },

    /**
     * Generate a CSS color string
     * @param {{r: number, g: number, b: number}} color
     * @param {number} alpha - Optional alpha (0-1)
     * @returns {string}
     */
    toRgba(color, alpha = 1) {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    },

    /**
     * Darken a color
     * @param {{r: number, g: number, b: number}} color
     * @param {number} amount - Amount to darken (0-1)
     * @returns {{r: number, g: number, b: number}}
     */
    darken(color, amount = 0.3) {
        return {
            r: Math.max(0, Math.floor(color.r * (1 - amount))),
            g: Math.max(0, Math.floor(color.g * (1 - amount))),
            b: Math.max(0, Math.floor(color.b * (1 - amount)))
        };
    },

    /**
     * Lighten a color
     * @param {{r: number, g: number, b: number}} color
     * @param {number} amount - Amount to lighten (0-1)
     * @returns {{r: number, g: number, b: number}}
     */
    lighten(color, amount = 0.3) {
        return {
            r: Math.min(255, Math.floor(color.r + (255 - color.r) * amount)),
            g: Math.min(255, Math.floor(color.g + (255 - color.g) * amount)),
            b: Math.min(255, Math.floor(color.b + (255 - color.b) * amount))
        };
    },

    /**
     * Apply adaptive theme to movie modal
     * @param {string} posterUrl - URL of the poster image
     */
    async applyToModal(posterUrl) {
        if (!posterUrl) return;

        try {
            const color = await this.getDominantColor(posterUrl);
            const darkColor = this.darken(color, 0.5);
            const glowColor = this.toRgba(color, 0.3);

            // Apply to CSS variables on the modal
            const modal = document.querySelector('#movieModal .modal-content');
            if (modal) {
                modal.style.setProperty('--adaptive-bg', this.toRgba(darkColor, 0.95));
                modal.style.setProperty('--adaptive-accent', this.toRgba(color, 1));
                modal.style.setProperty('--adaptive-glow', glowColor);
                modal.classList.add('adaptive-theme');
            }

            // Also apply to backdrop
            const backdrop = document.getElementById('movieBackdrop');
            if (backdrop) {
                backdrop.style.background = `linear-gradient(to bottom, ${this.toRgba(color, 0.3)}, ${this.toRgba(darkColor, 0.9)})`;
            }

        } catch (e) {
            console.log('Could not apply adaptive theme:', e);
        }
    },

    /**
     * Reset adaptive theme
     */
    resetTheme() {
        const modal = document.querySelector('#movieModal .modal-content');
        if (modal) {
            modal.style.removeProperty('--adaptive-bg');
            modal.style.removeProperty('--adaptive-accent');
            modal.style.removeProperty('--adaptive-glow');
            modal.classList.remove('adaptive-theme');
        }

        const backdrop = document.getElementById('movieBackdrop');
        if (backdrop) {
            backdrop.style.background = '';
        }
    }
};
