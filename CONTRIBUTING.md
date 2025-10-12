# Contributing to Portfolio Website

Thank you for your interest in contributing to this portfolio website project! This repository serves as both a personal portfolio and a demonstration of modern web development practices.

> **⚠️ CI/CD Status:** The automated CI/CD workflows are currently paused while we focus on the portfolio revamp. Manual testing and review processes are in place during this period.

## 🎆 Welcome Contributors

Contributions are welcome! Whether you're:

- Suggesting improvements to the design
- Reporting bugs or issues
- Proposing new features
- Improving documentation
- Optimizing performance

## 🚀 Getting Started

### Prerequisites

- Git installed on your machine
- Modern web browser for testing
- Code editor (VS Code recommended)
- Basic knowledge of HTML, CSS, and JavaScript

### Local Development Setup

1. **Fork the repository**
   ```bash
   # Click the Fork button on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/llompi.github.io.git
   cd llompi.github.io
   ```

2. **Switch to development branch**
   ```bash
   git checkout revamp
   ```

3. **Start local development server**
   ```bash
   # Using Python (recommended)
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using VS Code Live Server extension
   # Right-click index.html and select "Open with Live Server"
   ```

4. **View the site**
   Open `http://localhost:8000` in your browser

## 📄 Contribution Guidelines

### Code Style

- **HTML**: Use semantic HTML5 elements
- **CSS**: Follow BEM methodology for class naming
- **JavaScript**: Use modern ES6+ syntax
- **Comments**: Write clear, helpful comments
- **Formatting**: Use consistent indentation (2 spaces)

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(ui): add smooth scroll to navigation
fix(responsive): correct layout on mobile devices
docs(readme): update installation instructions
```

## 🔀 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Test thoroughly on different browsers
   - Ensure responsive design works

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your feature branch
   - Fill in the PR template
   - Link any related issues

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
Describe testing performed:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile devices

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Fixes #issue_number
```

## 🧪 Testing Guidelines

### Manual Testing Checklist

- [ ] All pages load correctly
- [ ] Navigation works smoothly
- [ ] Forms validate properly
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Cross-browser compatibility
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance (load times, animations)
- [ ] No console errors

### Browser Testing

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Responsive Testing

Test breakpoints:
- Mobile: 375px - 639px
- Tablet: 640px - 1023px
- Desktop: 1024px+

## 📦 Project Priorities

### High Priority (Current Focus)
- **Portfolio revamp** - Main redesign and content updates
- **Responsive design** - Mobile-first approach
- **Performance optimization** - Fast load times
- **Accessibility** - WCAG 2.1 AA compliance
- **SEO optimization** - Meta tags, structured data, sitemap

### Medium Priority
- **Animation enhancements** - Smooth transitions, micro-interactions
- **Design system** - Consistent color variables, typography scale
- **Browser compatibility** - Cross-browser testing and fixes
- **Documentation** - Code comments, README improvements

### Nice to Have
- **Dark/light mode toggle** - Theme switching functionality
- **Internationalization** - Multi-language support
- **PWA features** - Service worker, offline support
- **Analytics integration** - Performance monitoring

## 📋 Code Review Process

1. **~~Automated checks~~** *(Currently paused - manual review only)*
2. **Manual review** by project maintainer
3. **Testing verification** on different devices/browsers
4. **Feedback incorporation** if changes are requested
5. **Merge** when approved

> **Note:** While CI/CD workflows are paused, all PRs will undergo thorough manual testing and review. Contributors are expected to test their changes locally across multiple browsers and devices before submitting.

## 🔒 Security

If you discover a security vulnerability, please:

- **Do not** open a public issue
- Email directly: Joan.llbab@gmail.com
- Include detailed description of the vulnerability
- Wait for confirmation before disclosing publicly

## 📜 Additional Resources

- **Project Documentation**: [README.md](README.md)
- **License**: [MIT License](LICENSE)
- **Live Site**: [https://llompi.github.io](https://llompi.github.io)
- **Design Inspiration**: [Notion Project Page](https://www.notion.so/28a32634e0468117be66f694cd32bca1)

## 🙏 Recognition

All contributors will be:
- Listed in project credits
- Acknowledged in release notes
- Given public recognition for their contributions

## ❓ Questions

Have questions? Feel free to:
- Open a GitHub Discussion
- Create an issue with the `question` label
- Reach out via email: Joan.llbab@gmail.com

---

Thank you for contributing to making this portfolio website better! 🎉
