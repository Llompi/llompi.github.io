/**
 * Website Performance Optimization Script
 * Implements modern web performance best practices
 */

class PerformanceOptimizer {
    constructor() {
        this.isVisible = new Map();
        this.observer = null;
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.implementLazyLoading();
        this.optimizeAnimations();
        this.preloadCriticalResources();
        this.setupServiceWorker();
        this.initWebVitalsTracking();
    }

    /**
     * Intersection Observer for efficient scroll-based animations
     */
    setupIntersectionObserver() {
        const options = {
            threshold: [0.1, 0.5],
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const { target, isIntersecting, intersectionRatio } = entry;
                
                if (isIntersecting && !this.isVisible.get(target)) {
                    this.isVisible.set(target, true);
                    this.animateElement(target, intersectionRatio);
                }
            });
        }, options);

        // Observe all animatable elements
        document.querySelectorAll('.animate-on-scroll, .project-card, .skill-item')
            .forEach(el => this.observer.observe(el));
    }

    /**
     * Implement progressive image loading
     */
    implementLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    }

    /**
     * Optimize animations with requestAnimationFrame
     */
    optimizeAnimations() {
        let ticking = false;
        
        const updateAnimations = () => {
            // Batch DOM updates
            this.updateFloatingElements();
            this.updateScrollProgress();
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateAnimations);
                ticking = true;
            }
        };

        // Throttled scroll event
        window.addEventListener('scroll', requestTick, { passive: true });
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        const criticalResources = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            '/docs/assets/img/Project photos/IMG_8352.jpeg'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.includes('.css') ? 'style' : 'image';
            document.head.appendChild(link);
        });
    }

    /**
     * Setup Service Worker for caching
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }

    /**
     * Track Core Web Vitals
     */
    initWebVitalsTracking() {
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
            });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    console.log('CLS:', entry.value);
                }
            });
        }).observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * Animate elements based on intersection ratio
     */
    animateElement(element, ratio) {
        const animationType = element.dataset.animation || 'fadeInUp';
        const delay = element.dataset.delay || 0;
        
        setTimeout(() => {
            element.classList.add(`animate-${animationType}`);
            element.style.animationDelay = `${delay}ms`;
        }, delay);
    }

    /**
     * Update floating elements efficiently
     */
    updateFloatingElements() {
        const time = Date.now() * 0.001;
        const floatingElements = document.querySelectorAll('.floating');
        
        floatingElements.forEach((element, index) => {
            const offset = Math.sin(time + index * 0.5) * 10;
            element.style.transform = `translateY(${offset}px)`;
        });
    }

    /**
     * Update scroll progress indicator
     */
    updateScrollProgress() {
        const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        const progressBar = document.querySelector('.scroll-progress');
        
        if (progressBar) {
            progressBar.style.width = `${scrollProgress * 100}%`;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.isVisible.clear();
    }
}

/**
 * Accessibility Enhancement Manager
 */
class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderOptimizations();
        this.setupColorContrastToggle();
    }

    setupKeyboardNavigation() {
        // Enable keyboard navigation for project cards
        document.querySelectorAll('.project-card').forEach(card => {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
    }

    setupFocusManagement() {
        // Manage focus for modal dialogs
        document.addEventListener('focusin', (e) => {
            const modal = e.target.closest('.modal');
            if (modal && modal.style.display === 'block') {
                // Keep focus within modal
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                if (focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.target === modal) {
                    firstElement.focus();
                }
            }
        });
    }

    setupScreenReaderOptimizations() {
        // Add screen reader announcements for dynamic content
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
        
        window.announceToScreenReader = (message) => {
            announcer.textContent = message;
            setTimeout(() => announcer.textContent = '', 1000);
        };
    }

    setupColorContrastToggle() {
        // High contrast mode toggle
        const contrastToggle = document.getElementById('contrast-toggle');
        if (contrastToggle) {
            contrastToggle.addEventListener('click', () => {
                document.body.classList.toggle('high-contrast');
                localStorage.setItem('high-contrast', 
                    document.body.classList.contains('high-contrast'));
            });
        }

        // Restore high contrast preference
        if (localStorage.getItem('high-contrast') === 'true') {
            document.body.classList.add('high-contrast');
        }
    }
}

/**
 * Error Handling and Monitoring
 */
class ErrorMonitor {
    constructor() {
        this.errors = [];
        this.init();
    }

    init() {
        // Global error handler
        window.addEventListener('error', (e) => {
            this.logError({
                type: 'JavaScript Error',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            this.logError({
                type: 'Unhandled Promise Rejection',
                message: e.reason,
                stack: e.reason?.stack
            });
        });

        // Network error handler
        window.addEventListener('online', () => {
            console.log('Network connection restored');
        });

        window.addEventListener('offline', () => {
            console.warn('Network connection lost');
            this.showOfflineMessage();
        });
    }

    logError(error) {
        this.errors.push({
            ...error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        console.error('Logged Error:', error);
        
        // In production, send to monitoring service
        // this.sendToMonitoring(error);
    }

    showOfflineMessage() {
        const message = document.createElement('div');
        message.className = 'offline-message fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
        message.textContent = 'You are currently offline. Some features may not work.';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }
}

// Initialize all optimizations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PerformanceOptimizer();
    new AccessibilityManager();
    new ErrorMonitor();
    
    console.log('🚀 Performance optimizations initialized!');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceOptimizer, AccessibilityManager, ErrorMonitor };
}