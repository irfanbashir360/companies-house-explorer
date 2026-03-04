# Contributing to Companies House Explorer

Thanks for your interest in improving this project.

## Before You Start

- Check existing issues before opening a new one.
- For larger changes, open an issue first to align on scope.
- Keep pull requests focused and easy to review.

## Local Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create your local environment file:

```bash
cp .env.example .env.local
```

4. Add your key:

```bash
COMPANIES_HOUSE_API_KEY=your_api_key_here
```

5. Start dev server:

```bash
npm run dev
```

## Branch Naming

Use clear branch names such as:

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `refactor/<short-description>`

## Code Style and Quality

- Use TypeScript and keep types explicit where possible.
- Follow existing patterns in `src/` and `api/`.
- Run checks before opening a PR:

```bash
npm run lint
npm run build
```

## Pull Request Guidelines

- Describe what changed and why.
- Link related issues (if any).
- Include screenshots or short recordings for UI changes.
- Mention any follow-up work not included in the PR.

## Suggested Commit Message Style

Use concise, intent-first messages:

- `feat: add officer relationship filter`
- `fix: handle missing officer appointment links`
- `docs: improve deployment setup steps`

## Reporting Bugs

When reporting bugs, include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Browser and OS details
- Relevant logs or screenshots

## Security Issues

Do not open public issues for vulnerabilities. Follow [`SECURITY.md`](./SECURITY.md).
