# Portfolio Website - llompi.github.io

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://llompi.github.io)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A modern, minimalistic portfolio website showcasing professional projects and demonstrating GitHub best practices.

## 🚀 Project Overview

This repository serves as both a portfolio showcase and a comprehensive demonstration of modern web development workflows using GitHub's powerful collaboration and automation features.

> **⚠️ Note on CI/CD:** The CI/CD implementation is currently paused while prioritizing the portfolio revamp. Automated workflows will be restored once the main redesign is complete.

### ✨ Features

- **Modern Design**: Minimalistic, clean interface with dark mode support
- **Responsive Layout**: Mobile-first design optimized for all devices
- **Interactive Elements**: Smooth animations and 3D hover effects
- **Performance Optimized**: 90+ Lighthouse scores across all metrics
- **Accessible**: WCAG 2.1 AA compliant
- **CI/CD Pipeline**: ⏸️ *Temporarily paused - focus on portfolio revamp*

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: CSS Grid, Flexbox, Custom Properties
- **Animations**: CSS Transforms, JavaScript interactions
- **Build Tools**: GitHub Actions *(paused)*
- **Deployment**: GitHub Pages
- **Version Control**: Git with GitHub Flow

## 📁 Project Structure

```
llompi.github.io/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── docs/
├── .github/
│   ├── workflows/        # CI/CD workflows (temporarily disabled)
│   └── ISSUE_TEMPLATE/
├── index.html
├── README.md
└── LICENSE
```

## 🚀 Getting Started

### Prerequisites

- Modern web browser
- Git
- Code editor (VS Code recommended)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Llompi/llompi.github.io.git
   cd llompi.github.io
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   python -m http.server 8000
   # Or if you have Node.js:
   npx serve
   ```

3. **Start developing**
   - Edit HTML, CSS, and JavaScript files
   - Refresh browser to see changes
   - Test responsiveness across devices

## 📝 Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `revamp`: Major redesign work (current focus)
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/issue-description`

### Code Quality

- Semantic HTML5
- BEM CSS methodology
- ESLint for JavaScript
- Prettier for code formatting

### Responsive Breakpoints

```css
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## 🚀 Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

**Live Site**: [https://llompi.github.io](https://llompi.github.io)

### Deployment Process

> **Note:** Automated deployment via GitHub Actions is currently paused. Manual deployments are being used during the portfolio revamp phase.

1. Changes merged to `main`
2. ~~GitHub Actions workflow triggered~~ (paused)
3. ~~Build process (minification, optimization)~~ (manual for now)
4. Deploy to GitHub Pages
5. ~~Cache invalidation~~ (handled by GitHub Pages)

## 📈 Analytics & Monitoring

- **Google Analytics**: User behavior tracking
- **Core Web Vitals**: Performance monitoring
- **Error Tracking**: Console error monitoring
- **Accessibility**: Automated a11y testing

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development process
- Pull request procedure
- Issue reporting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Design Inspiration**: Various designers from Threads community
- **framer.university**: 3D hover effects and interactions
- **Modern UI/UX**: bachynskyi_ui, figbees, interfaceindex
- **Minimalist Design**: abduzeedo, studiosunsette

## 📞 Contact

- **Portfolio**: [llompi.github.io](https://llompi.github.io)
- **GitHub**: [@Llompi](https://github.com/Llompi)
- **Email**: [Contact via website](https://llompi.github.io#contact)

---

⭐ **Star this repository if you found it helpful!**
