// Legacy script functionality - now integrated into enhanced-portfolio.js
// This file is maintained for backward compatibility

// Simple theme switching that works with the enhanced portfolio
function initLegacyFeatures() {
    // Any legacy functionality can be added here if needed
    console.log('Legacy script loaded - enhanced features active');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLegacyFeatures);
} else {
    initLegacyFeatures();
}

// Export for potential use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initLegacyFeatures };
}