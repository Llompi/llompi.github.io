// Performance monitoring utilities

export class PerformanceMonitor {
  constructor() {
    this.startTime = null;
    this.metrics = new Map();
    this.observers = [];
  }

  start() {
    this.startTime = performance.now();
    this.setupObservers();
  }

  setupObservers() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.set('lcp', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID) - approximation with First Contentful Paint
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.set('fcp', entry.startTime);
          }
        });
      });
      
      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (e) {
        console.warn('FCP observer not supported');
      }

      // Layout Shift (CLS) monitoring
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        entryList.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.set('cls', clsValue);
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
    this.metrics.set(name, performance.now());
  }

  measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        this.metrics.set(name, measure.duration);
        return measure.duration;
      } catch (e) {
        console.warn(`Could not measure ${name}:`, e);
      }
    }
    return null;
  }

  getMetrics() {
    const metrics = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      timing: {}
    };

    // Navigation timing
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing;
      metrics.timing = {
        domComplete: timing.domComplete - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstByte: timing.responseStart - timing.navigationStart,
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnect: timing.connectEnd - timing.connectStart,
        request: timing.responseEnd - timing.requestStart,
        response: timing.responseEnd - timing.responseStart
      };
    }

    // Add custom metrics
    metrics.custom = Object.fromEntries(this.metrics);

    // Memory usage (if available)
    if ('memory' in performance) {
      metrics.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }

    // Connection info
    if ('connection' in navigator) {
      metrics.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }

    return metrics;
  }

  logMetrics() {
    const metrics = this.getMetrics();
    
    console.group('📈 Performance Metrics');
    
    if (metrics.timing.loadComplete) {
      console.log(`🚀 Page Load: ${metrics.timing.loadComplete}ms`);
    }
    
    if (metrics.custom.lcp) {
      console.log(`🎨 LCP: ${metrics.custom.lcp.toFixed(2)}ms`);
    }
    
    if (metrics.custom.fcp) {
      console.log(`🎆 FCP: ${metrics.custom.fcp.toFixed(2)}ms`);
    }
    
    if (metrics.custom.cls) {
      console.log(`📊 CLS: ${metrics.custom.cls.toFixed(4)}`);
    }
    
    if (metrics.memory) {
      console.log(`💾 Memory: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (metrics.connection) {
      console.log(`🌐 Connection: ${metrics.connection.effectiveType} (${metrics.connection.downlink}Mbps)`);
    }
    
    console.groupEnd();
    
    return metrics;
  }

  // Send metrics to analytics service
  sendMetrics(endpoint) {
    const metrics = this.getMetrics();
    
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, JSON.stringify(metrics));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        keepalive: true
      }).catch(err => console.warn('Failed to send metrics:', err));
    }
  }

  stop() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Resource loading utilities
export class ResourceLoader {
  static async loadImage(src, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      if (options.crossOrigin) {
        img.crossOrigin = options.crossOrigin;
      }
      
      img.src = src;
    });
  }

  static async loadScript(src, options = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      
      script.onload = resolve;
      script.onerror = reject;
      
      if (options.async !== false) {
        script.async = true;
      }
      
      if (options.defer) {
        script.defer = true;
      }
      
      if (options.type) {
        script.type = options.type;
      }
      
      script.src = src;
      document.head.appendChild(script);
    });
  }

  static async loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      
      link.onload = resolve;
      link.onerror = reject;
      
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }
}

// Lazy loading utilities
export class LazyLoader {
  constructor() {
    this.observer = null;
    this.setupObserver();
  }

  setupObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        { rootMargin: '50px' }
      );
    }
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        if (element.dataset.src) {
          element.src = element.dataset.src;
          element.removeAttribute('data-src');
        }
        
        if (element.dataset.srcset) {
          element.srcset = element.dataset.srcset;
          element.removeAttribute('data-srcset');
        }
        
        element.classList.add('loaded');
        this.observer.unobserve(element);
      }
    });
  }

  observe(element) {
    if (this.observer) {
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      if (element.dataset.src) {
        element.src = element.dataset.src;
      }
      if (element.dataset.srcset) {
        element.srcset = element.dataset.srcset;
      }
    }
  }

  observeAll(selector = '[data-src]') {
    document.querySelectorAll(selector).forEach(el => this.observe(el));
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}