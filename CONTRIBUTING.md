# Contributing to etu-mobile

Thank you for your interest in contributing to etu-mobile! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, constructive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/etu-mobile.git`
3. Add upstream remote: `git remote add upstream https://github.com/icco/etu-mobile.git`
4. Follow the setup instructions in [README.md](README.md)

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
yarn test

# Run linter
yarn lint

# Run type checker
yarn typecheck

# Run with coverage
yarn test:coverage
```
npm run test:coverage
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat: add password reset flow"
git commit -m "fix: resolve auth token expiration issue"
git commit -m "docs: update README with troubleshooting section"
```

Commit message prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear title and description
- Reference to any related issues
- Screenshots for UI changes
- Test results if applicable

## Code Style

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type unless absolutely necessary
- Define proper types and interfaces
- Use functional components with hooks

### React Native

- Follow React hooks best practices
- Use functional components
- Avoid inline styles where possible (use StyleSheet.create)
- Keep components focused and composable

### Formatting

The project uses:
- **ESLint**: For code linting
- **Prettier**: For code formatting (configured via `.prettierrc.js`)
- **TypeScript**: For type checking

Run linter before committing:

```bash
yarn lint
```

## Testing

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow existing test patterns

Test locations:
- Unit tests: `__tests__/`
- Component tests: `__tests__/`
- Integration tests: `__tests__/`

Example test:

```typescript
describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('should handle user interaction', () => {
    const { getByRole } = render(<MyComponent />);
    const button = getByRole('button');
    fireEvent.press(button);
    // Assert expected behavior
  });
});
```

### Running Tests

```bash
# Run all tests
yarn test

# Run specific test file
yarn test path/to/test.test.tsx

# Run with coverage
yarn test:coverage

# Watch mode
yarn test:watch
```

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass (`yarn test`)
- [ ] Linter passes (`yarn lint`)
- [ ] TypeScript compiles (`yarn typecheck`)
- [ ] Code coverage is maintained (`yarn test:coverage`)
- [ ] Documentation is updated if needed
- [ ] Changelog is updated (if applicable)

### Pull Request Description

Include:
1. **What**: What does this PR do?
2. **Why**: Why is this change needed?
3. **How**: How does it work?
4. **Testing**: How was it tested?
5. **Screenshots**: For UI changes

Example:

```markdown
## What
Adds password reset functionality to the login screen.

## Why
Users need a way to recover access if they forget their password.

## How
- Added "Forgot Password?" link on login screen
- Created ResetPasswordScreen component
- Integrated with backend password reset endpoint
- Added email validation

## Testing
- [ ] Unit tests added for reset flow
- [ ] Manual testing on iOS and Android
- [ ] Tested with various email formats

## Screenshots
[Include screenshots here]
```

## Security

If you discover a security vulnerability, please email the maintainers directly instead of creating a public issue.

## Questions?

- Check the [README](README.md) for setup and usage information
- Review existing [issues](https://github.com/icco/etu-mobile/issues) and [pull requests](https://github.com/icco/etu-mobile/pulls)
- Open a new issue for discussion

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
