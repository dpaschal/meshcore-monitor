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
- **CodeQL**: Static analysis for security issues (if enabled)
- **npm audit**: Run `npm audit` to check for known vulnerabilities

## Acknowledgments

We appreciate responsible disclosure of security issues. Contributors who report valid vulnerabilities will be acknowledged (with permission) in release notes.
