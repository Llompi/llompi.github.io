# Portfolio Website - llompi.github.io

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://llompi.github.io)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A modern, minimalistic portfolio website showcasing professional projects and demonstrating GitHub best practices.

## 🚀 Project Overview

This repository serves as both a portfolio showcase and a comprehensive demonstration of modern web development workflows using GitHub's powerful collaboration and automation features.

### ✨ Features

- **Modern Design**: Minimalistic, clean interface with dark mode support
- **Responsive Layout**: Mobile-first design optimized for all devices
- **Interactive Elements**: Smooth animations and 3D hover effects
- **Performance Optimized**: 90+ Lighthouse scores across all metrics
- **Accessible**: WCAG 2.1 AA compliant
- **CI/CD Pipeline**: Automated testing, building, and deployment

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: CSS Grid, Flexbox, Custom Properties
- **Animations**: CSS Transforms, JavaScript interactions
- **Build Tools**: GitHub Actions
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
│   ├── workflows/
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

2. **Switch to development branch**
   ```bash
   git checkout revamp
   ```

3. **Start local server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using VS Code Live Server extension
   # Right-click index.html and select "Open with Live Server"
   ```

4. **Open in browser**
   Navigate to `http://localhost:8000`

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production branch (auto-deploys to GitHub Pages)
- `revamp` - Primary development branch
- `feature/*` - Individual feature branches
- `hotfix/*` - Emergency fixes

### Contributing

1. Create feature branch from `revamp`
2. Make changes with descriptive commits
3. Open Pull Request with detailed description
4. Automated checks must pass
5. Request code review
6. Merge after approval

### Commit Convention

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting, missing semicolons
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance tasks
```

## 🔧 GitHub Features Demonstrated

### Project Management
- **GitHub Projects**: Kanban-style project tracking
- **Issues**: Feature requests, bug tracking with templates
- **Milestones**: Release planning and progress tracking
- **Labels**: Organized issue categorization

### Automation & CI/CD
- **GitHub Actions**: Automated testing and deployment
- **Branch Protection**: Required reviews, status checks
- **Auto-merge**: Dependency updates with Dependabot
- **Security**: CodeQL analysis, vulnerability scanning

### Collaboration
- **Pull Request Templates**: Structured code reviews
- **Code Owners**: Automatic review assignments
- **Discussions**: Community engagement and Q&A
- **Wiki**: Additional documentation

## 📊 Performance & Quality

### Lighthouse Scores
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### Code Quality
- ESLint for JavaScript linting
- Prettier for code formatting
- HTML5 semantic markup
- CSS custom properties

## 🎨 Design System

### Color Palette
```css
:root {
  --primary: #00ff88;
  --secondary: #0070f3;
  --accent: #ff0080;
  --background: #000000;
  --surface: #111111;
  --text: #ffffff;
  --text-secondary: #888888;
}
```

### Typography
- **Primary**: Inter (modern, clean sans-serif)
- **Code**: JetBrains Mono (for code snippets)
- **Sizes**: Fluid typography with clamp()

## 📱 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## 🚀 Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

**Live Site**: [https://llompi.github.io](https://llompi.github.io)

### Deployment Process
1. Changes merged to `main`
2. GitHub Actions workflow triggered
3. Build process (minification, optimization)
4. Deploy to GitHub Pages
5. Cache invalidation

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