# Contributing to Portfolio Website

Thank you for your interest in contributing to this portfolio website project! This repository serves as both a personal portfolio and a demonstration of modern web development practices.

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
type(scope): description

Examples:
feat(ui): add dark mode toggle
fix(carousel): resolve swipe gesture on mobile
docs(readme): update installation instructions
style(css): improve responsive layout
refactor(js): optimize 3D rendering performance
test(unit): add carousel component tests
chore(deps): update three.js to latest version
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks, dependency updates

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/component-name` - Code refactoring
- `test/test-description` - Testing improvements

## 🔄 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-commented code
   - Test your changes thoroughly
   - Ensure responsive design works on mobile

3. **Test locally**
   - Verify all functionality works
   - Check console for errors
   - Test on different browsers if possible

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(component): add new feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR from your branch to `revamp`
   - Provide clear description of changes
   - Link any related issues

### Pull Request Guidelines

- **Title**: Clear, descriptive title
- **Description**: Explain what changes you made and why
- **Screenshots**: Include before/after screenshots for UI changes
- **Testing**: Describe how you tested the changes
- **Breaking Changes**: Note any breaking changes

## 🐛 Bug Reports

When reporting bugs, please include:

- **Browser and version**
- **Operating system**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots or console errors**

## 🌟 Feature Requests

For feature requests:

- **Use case**: Describe the problem you're trying to solve
- **Proposed solution**: Your idea for implementing the feature
- **Alternatives**: Other solutions you've considered
- **Screenshots/mockups**: Visual representations if applicable

## 📅 Areas for Contribution

### High Priority
- **Performance optimization** - Reduce bundle size, improve loading times
- **Accessibility improvements** - WCAG compliance, screen reader support
- **Mobile experience** - Touch gestures, responsive design refinements
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

1. **Automated checks** must pass (when CI/CD is implemented)
2. **Manual review** by project maintainer
3. **Testing verification** on different devices/browsers
4. **Feedback incorporation** if changes are requested
5. **Merge** when approved

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