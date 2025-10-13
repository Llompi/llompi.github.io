// Main application entry point
import './components/Navigation.js';
import './components/Hero.js';
import './components/Projects.js';
import './components/ThreeScene.js';
import { AnimationController } from './utils/animations.js';
import { PerformanceMonitor } from './utils/performance.js';
import { ThemeManager } from './utils/theme.js';

// Import styles
import '../css/tokens.css';
import '../css/components.css';

class PortfolioApp {
  constructor() {
    this.isInitialized = false;
    this.components = new Map();
    this.utils = {
      animationController: new AnimationController(),
      performanceMonitor: new PerformanceMonitor(),
      themeManager: new ThemeManager()
    };
  }

  async init() {
    try {
      // Initialize performance monitoring
      this.utils.performanceMonitor.start();
      
      // Initialize theme system
      await this.utils.themeManager.init();
      
      // Initialize components when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
      } else {
        this.initializeComponents();
      }

      // Initialize animations
      this.utils.animationController.init();
      
      // Set up global error handling
      this.setupErrorHandling();
      
      // Set up intersection observers for animations
      this.setupIntersectionObservers();
      
      this.isInitialized = true;
      
      // Log performance metrics
      this.utils.performanceMonitor.logMetrics();
      
      console.log('🚀 Portfolio app initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize portfolio app:', error);
      this.handleInitError(error);
    }
  }

  initializeComponents() {
    // Initialize all components
    const componentSelectors = [
      '[data-component="navigation"]',
      '[data-component="hero"]',
      '[data-component="projects"]',
      '[data-component="three-scene"]'
    ];

    componentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const componentName = element.dataset.component;
        if (componentName && !this.components.has(element)) {
          this.initializeComponent(componentName, element);
        }
      });
    });
  }

  initializeComponent(componentName, element) {
    try {
      // Component initialization logic will be handled by individual components
      this.components.set(element, componentName);
      element.classList.add('component-initialized');
    } catch (error) {
      console.error(`Failed to initialize component ${componentName}:`, error);
    }
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // Could send to analytics service here
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Could send to analytics service here
    });
  }

  setupIntersectionObservers() {
    // Animate elements when they come into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target;
            if (element.dataset.animation) {
              this.utils.animationController.animate(element, element.dataset.animation);
              observer.unobserve(element); // Only animate once
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    // Observe all elements with data-animation attribute
    document.querySelectorAll('[data-animation]').forEach(el => {
      observer.observe(el);
    });
  }

  handleInitError(error) {
    // Fallback graceful degradation
    document.body.classList.add('app-init-failed');
    
    // Show a simple error message to user
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      ">
        <strong>App Loading Error</strong><br>
        Some features may not work correctly.
        <button onclick="this.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          float: right;
          cursor: pointer;
          font-size: 1.2rem;
          margin-top: -0.5rem;
        ">&times;</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Public API for components to register themselves
  registerComponent(name, instance) {
    this.components.set(name, instance);
  }

  getComponent(name) {
    return this.components.get(name);
  }

  // Cleanup method for SPA navigation or component unmounting
  destroy() {
    this.utils.performanceMonitor.stop();
    this.utils.animationController.destroy();
    this.components.clear();
    this.isInitialized = false;
  }
}

// Create global app instance
const app = new PortfolioApp();

// Auto-initialize
app.init();

// Export for global access if needed
window.PortfolioApp = app;

export default app;