---
title: Contributing to HAI3
description: How to contribute to the HAI3 framework
---

# Contributing to HAI3

We welcome contributions to HAI3! This guide will help you get started with contributing code, documentation, and ideas.

## Ways to Contribute

### Report Bugs

Found a bug? [Open an issue](https://github.com/hai3org/hai3/issues/new?template=bug_report.md) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, package versions)
- Code samples or screenshots

### Request Features

Have an idea? [Open a feature request](https://github.com/hai3org/hai3/issues/new?template=feature_request.md) with:
- Problem statement: What problem does this solve?
- Proposed solution: How should it work?
- Alternatives considered: Other approaches you've thought about
- Use cases: Real-world scenarios where this helps

### Improve Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples and code snippets
- Write tutorials or guides
- Translate documentation (future)

Submit documentation PRs to the `docs/` directory.

### Submit Code

Code contributions should:
- Follow the [Architecture Rules](/hai3/contributing/architecture-rules)
- Include tests
- Update documentation
- Pass CI checks

### Share Projects

Built something with HAI3? Share it:
- Add to [Showcase](https://github.com/hai3org/hai3/discussions/categories/showcase)
- Write a blog post or case study
- Present at meetups or conferences

### Help Others

Answer questions in:
- [GitHub Discussions](https://github.com/hai3org/hai3/discussions)
- Stack Overflow (tag: `hai3`)
- Discord community (link in README)

## Getting Started

### Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0 (or yarn, pnpm)
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub first

# Clone your fork
git clone https://github.com/<your-username>/hai3.git
cd hai3

# Add upstream remote
git remote add upstream https://github.com/hai3org/hai3.git
```

### Install Dependencies

```bash
npm install
```

This installs dependencies for all workspace packages.

### Build Packages

```bash
npm run build
```

Builds all packages in dependency order.

### Run Tests

```bash
npm test
```

Runs all package tests.

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/bug-description
```

**Branch naming:**
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation changes
- `refactor/*`: Code refactoring
- `test/*`: Test improvements

### 2. Make Changes

Follow [Architecture Rules](/hai3/contributing/architecture-rules):
- Respect layer boundaries (L1 → L2 → L3 → L4)
- Use TypeScript strictly (no `any`/`unknown`)
- Follow naming conventions
- Add tests for new code

### 3. Test Your Changes

```bash
# Run tests for specific package
npm test --workspace=@hai3/state

# Run all tests
npm test

# Run linter
npm run lint

# Type check
npm run typecheck
```

### 4. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(state): add event bus wildcard support"
git commit -m "fix(react): resolve useEffect dependency warning"
git commit -m "docs(architecture): clarify layer responsibilities"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build, CI, tooling

### 5. Push and Create PR

```bash
git push origin feature/my-feature
```

Open a pull request on GitHub with:
- Clear title and description
- Link to related issues
- Screenshots/videos if UI changes
- Test plan

## Testing

### Unit Tests

```bash
npm test
```

**Requirements:**
- Test new features and bug fixes
- Maintain >80% code coverage
- Use descriptive test names

**Example:**

```typescript
describe('EventBus', () => {
  test('emits events to subscribers', () => {
    const eventBus = createEventBus();
    const handler = jest.fn();

    eventBus.on('test.event', handler);
    eventBus.emit({ type: 'test.event', payload: { foo: 'bar' } });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test.event',
        payload: { foo: 'bar' }
      })
    );
  });
});
```

### Integration Tests

Test package interactions:

```typescript
test('framework integrates with state package', () => {
  const app = createHAI3()
    .use(statePlugin)
    .build();

  expect(app.store).toBeDefined();
  expect(app.eventBus).toBeDefined();
});
```

### E2E Tests (Future)

Coming soon: Playwright tests for full application flows.

## Pull Request Process

### 1. Before Submitting

- [ ] Code builds without errors
- [ ] Tests pass
- [ ] Linter passes
- [ ] TypeScript type checks pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)

### 2. PR Template

Use the provided template to describe:
- What changed and why
- How to test
- Breaking changes (if any)
- Related issues

### 3. Review Process

1. Automated checks run (CI)
2. Maintainers review code
3. Address feedback
4. Get approval (2 maintainers required for core changes)
5. Squash and merge

### 4. After Merge

- Branch is deleted automatically
- Changes appear in next release
- You're credited in CHANGELOG.md and release notes

## Code Review Guidelines

### As Author

- Respond to feedback promptly
- Ask questions if feedback is unclear
- Update PR description as changes are made
- Be open to suggestions

### As Reviewer

- Be constructive and respectful
- Explain the "why" behind feedback
- Distinguish required vs optional changes
- Approve when ready, even if minor suggestions remain

## Architecture Guidelines

See detailed guidelines:
- [Architecture Rules](/hai3/contributing/architecture-rules)
- [Development Guidelines](https://github.com/HAI3org/HAI3/blob/main/.ai/GUIDELINES.md) (in repo)

**Key principles:**
- Layer independence (no reverse dependencies)
- TypeScript strict mode (no `any`/`unknown`)
- Single Responsibility Principle
- Event-driven communication
- Test-driven development

## Release Process

Releases are handled by maintainers:

1. Version bumped following [Semantic Versioning](https://semver.org/)
2. CHANGELOG.md updated
3. Git tag created
4. Packages published to npm
5. GitHub release created

## Community

- **GitHub Discussions:** Questions, ideas, and showcase
- **Discord:** Real-time chat (link in README)
- **Twitter:** [@hai3framework](https://twitter.com/hai3framework)
- **Blog:** [hai3.org/blog](https://hai3.org/blog)

## Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/):
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

## Questions?

- Check [GitHub Discussions](https://github.com/hai3org/hai3/discussions)
- Ask in Discord
- Email: [email protected]

## Related Documentation

- [Guidelines](/hai3/contributing/guidelines)
- [Architecture Rules](/hai3/contributing/architecture-rules)
- [Roadmap](/hai3/contributing/roadmap)
