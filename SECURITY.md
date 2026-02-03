# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MeshCore Monitor, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include as much detail as possible about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Measures

### What We Protect

- **No secrets in code**: API keys, passwords, and tokens must never be committed
- **Environment variables**: All sensitive configuration uses environment variables
- **Session security**: Secure session handling with configurable secrets
- **Rate limiting**: API endpoints are rate-limited to prevent abuse

### Environment Variables (Keep Secret)

The following should NEVER be committed to the repository:

- `SESSION_SECRET` - Session encryption key
- `ADMIN_PASSWORD` - Initial admin password
- Database credentials (if using external database)
- Any API keys or tokens

### Secure Deployment Checklist

- [ ] Set a strong `SESSION_SECRET` (random 32+ characters)
- [ ] Change default admin password immediately
- [ ] Use HTTPS in production (`COOKIE_SECURE=true`)
- [ ] Set `ALLOWED_ORIGINS` to your specific domain
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Review `.env` files are in `.gitignore`

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x: (development)  |

## Security Scanning

This repository uses automated security scanning:

- **Dependabot**: Monitors dependencies for vulnerabilities
- **CodeQL**: Static analysis for security issues
- **Secret Detection**: Scans for accidentally committed secrets
- **npm audit**: Run `npm audit` to check for known vulnerabilities

## Known Vulnerabilities (Upstream)

The following vulnerabilities are inherited from upstream [MeshMonitor](https://github.com/Yeraze/meshmonitor) dependencies and are **development-only** (not in production builds):

| Package | Severity | Risk | Notes |
|---------|----------|------|-------|
| esbuild | Moderate | Low | Dev server only - not in production |
| vitepress | Moderate | Low | Documentation tool - dev only |
| lodash | Moderate | Low | Prototype pollution - common in many projects |

**Why these are low risk:**
- These packages are **development dependencies** only
- They are **not included** in the production build
- The vulnerabilities affect dev servers, not deployed applications
- Fixes require breaking changes that could affect stability

**Status:** Waiting for upstream MeshMonitor to update dependencies. When they do, our automated sync will inherit the fixes.

If you have concerns about these vulnerabilities, you can:
1. Review the [npm audit advisories](https://docs.npmjs.com/cli/v8/commands/npm-audit) for details
2. Run in a containerized/isolated development environment
3. Open an issue on [upstream MeshMonitor](https://github.com/Yeraze/meshmonitor/issues)

## Acknowledgments

We appreciate responsible disclosure of security issues. Contributors who report valid vulnerabilities will be acknowledged (with permission) in release notes.
