# Identity Service

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.19.0-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-blue.svg)](https://pnpm.io/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-lightblue.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-orange.svg)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Local_DB-blue.svg)](https://www.docker.com/)

A robust, production-ready, reusable generic **Identity Service** designed to handle security, authentication, and authorization for modern web applications. Built on Node.js using Express, TypeScript (strict mode), and Prisma ORM.

---

## Core Capabilities

The Identity Service provides a comprehensive set of features out of the box:

### Authentication & Authorization
*   **Authentication**: Complete user sign-up, email verification, login, password reset, and logout flows.
*   **Authorization**: Flexible middleware supporting role-based access control (RBAC).

### Token- & Session-Based Security
*   **Asymmetric JWT signing (RS256)**: Secure access tokens signed using a private RSA key on the server, which can be verified externally with the corresponding public key.
*   **Secure Session Management**: Track, renew, and revoke active sessions. Supplying a long-lived rotating refresh token (`__Host-refresh` cookie) allows generating new short-lived access tokens.
*   **CSRF Protection**: Comprehensive Double Submit Cookie validation via custom header (`x-csrf-token`) and secure cookie (`csrfToken`).

### Security Features
*   **Rate Limiting**: Granular rate limiters configured per endpoint to prevent brute-force attacks and abuse.
*   **RBAC**: Flexible middleware (`authorize(...roles)`) that checks assigned roles from the database to restrict access dynamically.
*   **Email Verification**: Account activation workflow using opaque single-use verification tokens.
*   **Password Reset**: Opaque reset tokens to securely change forgotten passwords.

### Developer Experience & Standards
*   **OpenAPI 3.1 Specification**: Single source of truth API contract with Swagger UI for local documentation and sandbox testing, coupled with Redocly for linting/validation.
*   **Docker Integration**: Streamlined containerized local environments for running tests and dependencies seamlessly.
*   **CI/CD Pipeline**: Integrated GitHub Actions workflows ensuring linting, formatting, type safety, OpenAPI contract validation, and tests pass successfully on every push.
