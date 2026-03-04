# Security Policy

## Supported Versions

This project is currently maintained on the default branch only. Security fixes
are applied to the latest codebase.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Instead:

- Open a private security advisory on GitHub (preferred), or
- Contact the maintainer directly with clear reproduction details.

Include:

- A description of the vulnerability
- Impact and potential attack scenario
- Steps to reproduce
- Suggested remediation (if known)

You can expect an initial response within 5 business days.

## Secret Handling

- Never commit API keys or secrets (`.env.local` must stay local).
- The app is designed to call Companies House through server-side proxies in
  `api/` to avoid exposing `COMPANIES_HOUSE_API_KEY` in browser code.
- If you suspect accidental secret exposure, rotate the key immediately and
  report the incident.
