import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { OpenAPIObject } from 'openapi-types';

// ---------------------------------------------------------------------------
// Spec — built programmatically; no YAML files or code-gen required.
// Paths and component schemas are populated incrementally as endpoints are
// documented. The structure below mirrors the final layout so that future
// additions never require a reorganisation.
// ---------------------------------------------------------------------------

const components: OpenAPIObject['components'] = {
  // ── Security schemes ───────────────────────────────────────────────────────
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Short-lived access token issued by POST /auth/login or POST /auth/refresh.',
    },
  },

  // ── Reusable schemas ───────────────────────────────────────────────────────
  schemas: {
    /**
     * Matches the exact shape emitted by errorHandler.ts:
     * { success: false, error: { code, message, requestId? } }
     */
    ErrorResponse: {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: {
          type: 'boolean',
          enum: [false],
          example: false,
        },
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: {
              type: 'string',
              example: 'UNAUTHORIZED',
              description: 'Machine-readable error code.',
            },
            message: {
              type: 'string',
              example: 'Unauthorized',
              description: 'Human-readable error description.',
            },
            requestId: {
              type: 'string',
              format: 'uuid',
              description: 'Correlation ID for log tracing.',
            },
          },
        },
      },
    },

    /**
     * Base envelope for successful responses.
     * Individual endpoints extend this with their own `data` property.
     */
    SuccessResponse: {
      type: 'object',
      required: ['success'],
      properties: {
        success: {
          type: 'boolean',
          enum: [true],
          example: true,
        },
      },
    },
  },

  // ── Reusable responses (populated as endpoints are documented) ─────────────
  responses: {},

  // ── Reusable parameters ────────────────────────────────────────────────────
  parameters: {},

  // ── Reusable request bodies ────────────────────────────────────────────────
  requestBodies: {},
};

// ---------------------------------------------------------------------------
// Tags — defined globally so every future endpoint can reference them without
// redeclaring descriptions.
// ---------------------------------------------------------------------------
const tags: OpenAPIObject['tags'] = [
  {
    name: 'Auth',
    description: 'Registration, login, logout, and token lifecycle.',
    externalDocs: {
      description: 'Auth module source',
      url: 'https://github.com/elevo/auth/tree/main/src/modules/auth',
    },
  },
  {
    name: 'User',
    description: 'Authenticated user profile operations.',
  },
  {
    name: 'Admin',
    description: 'Privileged operations restricted to admin roles.',
  },
  {
    name: 'Health',
    description: 'Liveness and readiness probes.',
  },
];

// ---------------------------------------------------------------------------
// Root spec object
// ---------------------------------------------------------------------------
export const openApiSpec = {
  openapi: '3.1.0',

  info: {
    title: 'Elevo Auth API',
    // Contract version — tracks the API surface, not the software release.
    version: 'v1',
    description:
      'Authentication and Authorization API for the Elevo SaaS platform. ' +
      'All protected endpoints require a Bearer JWT in the Authorization header.',
    contact: {
      name: 'Elevo Engineering',
      url: 'https://github.com/elevo/auth',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },

  externalDocs: {
    description: 'Full project README',
    url: 'https://github.com/elevo/auth/blob/main/README.md',
  },

  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development',
    },
  ],

  tags,
  components,

  // Populated incrementally as endpoints are documented.
  paths: {},
} as const satisfies OpenAPIObject;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const docsRouter = Router();

// GET /docs/openapi.json — raw specification
docsRouter.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// GET /docs — Swagger UI
docsRouter.use('/docs', swaggerUi.serve);
docsRouter.get('/docs', swaggerUi.setup(openApiSpec as unknown as Record<string, unknown>));

export { docsRouter as openApiRouter };
