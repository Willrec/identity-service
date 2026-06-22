Create the complete auth-service project structure.

Requirements:

Tech stack:

* Node.js 22.19.0
* TypeScript
* Express
* Prisma
* PostgreSQL (Neon)
* Docker

Architecture:

src/
├── config/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   └── permissions/
├── middleware/
├── shared/
├── infrastructure/
│   ├── database/
│   └── security/
├── routes/
├── app.ts
└── server.ts

Generate:

1. package.json
2. tsconfig.json
3. eslint configuration
4. prettier configuration
5. Dockerfile
6. .dockerignore
7. .gitignore
8. .env.example
9. Express bootstrap
10. Prisma bootstrap
11. Health endpoint

Requirements:

* Use pnpm
* Use TypeScript strict mode
* Use environment validation with Zod
* Use Helmet
* Use CORS
* Use Cookie Parser
* Use centralized error handling
* Use structured logging
* No authentication endpoints yet
* No OAuth yet
* No business logic yet

Goal:

The service must start successfully, connect to Neon, expose:

GET /health

and be ready for Prisma integration.

Do not create auth endpoints yet.
