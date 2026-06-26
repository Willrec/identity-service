# Contributing to Identity Service

We welcome contributions of all kinds! This guide helps you get started with contributing to this repository.

## Code of Conduct

By participating in this project, you agree to maintain a professional, respectful, and welcoming environment for everyone.

## Getting Started

### Prerequisites

- **Node.js**: `>=22.19.0`
- **pnpm**: `>=9`
- **Docker**: Required for running integration tests locally

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd identity-service
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Initialize environment and generate keys**:
   ```bash
   pnpm setup
   ```
   This script will verify your engine versions, create local `.env` and `.env.test` files, generate a 2048-bit RSA keypair, format and inject the keys into your environment, and generate the Prisma Client.

4. **Run database migrations**:
   Ensure you have a PostgreSQL database running, or let the test/dev suites spin up Docker containers.
   ```bash
   pnpm prisma migrate deploy
   ```

5. **Seed the database**:
   ```bash
   pnpm seed
   ```

6. **Start development server**:
   ```bash
   pnpm dev
   ```

---

## Development Workflow

### 1. Branch Naming Conventions

Create a new branch from `main` or the active release branch using the following patterns:
- `feature/short-description` (for new features)
- `bugfix/short-description` (for bug fixes)
- `hotfix/short-description` (for critical production fixes)
- `chore/short-description` (for maintenance work, dependencies, docs)

### 2. Commit Message Conventions

We recommend following the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat: add rate limiting to registration`
- `fix: correct token expiration calculation`
- `docs: update setup instructions`
- `chore: bump dependencies`

### 3. Code Style & Verification

Before committing and pushing your changes, you **must** run the local repository verification pipeline to ensure code quality:
```bash
pnpm verify
```
This script runs the following tasks sequentially:
1. **Linting** (`pnpm lint`): Checks stylistic guidelines.
2. **Build** (`pnpm build`): Validates TypeScript compilation.
3. **OpenAPI** (`pnpm openapi`): Re-compiles, validates, and generates TypeScript client types from the OpenAPI specification.
4. **Tests** (`pnpm test:local`): Provisions a temporary Docker database, runs Vitest integration tests, and tears it down.

All quality gates must pass successfully with zero errors before pushing your branch.

### 4. Submitting a Pull Request

1. Push your branch to GitHub.
2. Open a Pull Request targeting `main`.
3. Provide a clear description of the changes, verification steps, and link any related issues.
4. Ensure all CI checks pass. A maintainer will review your contribution shortly!
