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

---

## Setup & Getting Started

### Requirements

To run this project locally, ensure you have the following installed:
*   **Node.js**: version `>=22.19.0`
*   **pnpm**: version `>=9`
*   **Docker & Docker Compose**: (Recommended for running the test database locally)

### Environment Variables

The Identity Service requires configuration variables to boot. Run the initialization script to generate your local `.env` configuration file:

```bash
pnpm env:init
```

A default `.env` will be copied from `.env.example`. Make sure to configure the variables described below inside `.env`:

*   `NODE_ENV`: The server execution environment (`development`, `production`, `test`).
*   `PORT`: The port the Express HTTP server binds to (default: `3000`).
*   `DATABASE_URL`: Connection string for PostgreSQL database.
*   `CORS_ORIGINS`: Comma-separated list of allowed client origins.
*   `BCRYPT_SALT_ROUNDS`: Number of salt rounds for password hashing.
*   `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: 2048-bit RS256 RSA keypair in PEM format (newlines escaped as literal `\n`).
*   `JWT_ACCESS_TOKEN_EXPIRES_IN`: Expire duration for generated JWTs (e.g. `15m`).

### JWT RS256 Key Generation

The service uses asymmetric RS256 signatures for access tokens. You must generate a 2048-bit RSA key pair. Run the key generator script to automatically create these keys:

```bash
pnpm keys:generate
```

This generates `private.pem` (private key) and `public.pem` (public key) inside the `keys/` directory (automatically git-ignored).

To use these keys in development:
1. Copy the contents of the generated PEM files.
2. In your `.env` file, assign the keys to `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`, making sure to format them on a single line where all newlines are replaced by literal `\n` characters (as shown in `.env.example`).

### Installation

Once environment variables are configured, install project dependencies and generate the database client:

```bash
# Install packages
pnpm install

# Generate Prisma DB Client
pnpm prisma:generate
```

