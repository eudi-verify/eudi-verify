# Security Policy

## Project Status

⚠️ **Active Development — Pre-Audit**

This project is currently in **demo mode** and has not undergone independent security audit. It is NOT recommended for production use until:

- [ ] Third-party security audit completed
- [ ] Production mode with real EUDI Wallet integration tested
- [ ] This notice removed from documentation

**Current limitations:**
- Demo mode only (simulated credentials)
- No production EUDI Wallet integration
- Pre-audit stage

## Supported Versions

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 0.x.x   | :white_check_mark: | Demo mode only |

## Reporting a Vulnerability

We take security seriously even during development.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

**Preferred**: [GitHub Security Advisories](https://github.com/eudi-verify/eudi-verify/security/advisories/new)

**Alternative**: mkasceldev@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Affected versions
- Suggested fixes (if any)

### Response Timeline

This is a volunteer-maintained project. We aim for:

- **Initial acknowledgment**: Within 7 days
- **Status updates**: As investigation progresses
- **Fix timeline**: Depends on severity and complexity

We cannot guarantee specific SLAs at this stage but will make best efforts to respond promptly to valid security reports.

### Severity Classification

| Severity | Examples |
|----------|----------|
| Critical | RCE, authentication bypass, token forgery |
| High     | XSS, CSRF, significant data leak, cryptographic weakness |
| Medium   | Rate limit bypass, minor information disclosure |
| Low      | Best practice violations, configuration recommendations |

## Safe Harbor

We consider security research conducted under this policy to be:
- Authorized in accordance with responsible disclosure principles
- Conducted in good faith
- Exempt from legal action by this project

We will not pursue legal action against researchers who:
- Follow this disclosure policy
- Make good faith efforts to avoid privacy violations and service disruption
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue

## Security Acknowledgments

We will acknowledge security researchers who responsibly disclose valid vulnerabilities (with permission) once we have:
1. Verified and fixed the issue
2. Established a formal acknowledgment process

If you'd like to be acknowledged, please indicate this in your report.

## Security Updates

Security updates are released as patch versions and announced via:
- GitHub releases
- Repository notifications

Subscribe to repository notifications to stay informed.

## Future Security Plans

Before production release, we plan to:
- Commission an independent security audit
- Establish a formal security response process
- Set up dedicated security email (security@eudi-verify.eu or .org)
- Define and publish SLAs for vulnerability response

## Additional Resources

- [Threat Model](THREAT_MODEL.md) — Documented threats and mitigations
- [Dependency Analysis](DEPENDENCY.md) — Third-party security posture
- [Integration Guide](docs/INTEGRATION.md) — Secure implementation patterns

---

**Note**: This policy applies to the eudi-verify project. For vulnerabilities in dependencies (`@openeudi/core`, etc.), please report to the respective upstream projects.
