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
     * Base envelope for successful responses with no data payload.
     * Individual endpoints that return data extend beyond this.
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

    // ── Enums ──────────────────────────────────────────────────────────────────
    /** Mirrors domain.types.ts › UserStatus */
    UserStatus: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      description: 'Lifecycle state of a user account.',
      example: 'ACTIVE',
    },

    // ── Domain objects ─────────────────────────────────────────────────────────
    /**
     * Full user read model — mirrors UserResponseDto.
     * avatarUrl uses OAS 3.1 anyOf-null (no deprecated nullable: true).
     */
    UserResponse: {
      type: 'object',
      required: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatarUrl',
        'emailVerified',
        'status',
        'createdAt',
        'updatedAt',
      ],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique user identifier (UUIDv7).',
          example: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
        },
        email: {
          type: 'string',
          format: 'email',
          description: "User's registered email address.",
          example: 'john.doe@example.com',
        },
        firstName: {
          type: 'string',
          description: "User's given name.",
          example: 'John',
        },
        lastName: {
          type: 'string',
          description: "User's family name.",
          example: 'Doe',
        },
        avatarUrl: {
          // OAS 3.1 nullable — no deprecated `nullable: true`
          anyOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
          description: "URL of the user's profile picture, or null if not set.",
          example: 'https://cdn.example.com/avatars/user.jpg',
        },
        emailVerified: {
          type: 'boolean',
          description: 'Whether the user has confirmed their email address.',
          example: true,
        },
        status: { $ref: '#/components/schemas/UserStatus' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 timestamp of when the account was created.',
          example: '2024-01-15T10:30:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 timestamp of the last account update.',
          example: '2024-06-25T14:00:00.000Z',
        },
      },
    },

    // ── Request schemas ────────────────────────────────────────────────────────
    /** Mirrors registerSchema (auth.validator.ts) */
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address to register. Stored in lowercase.',
          example: 'john.doe@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 72,
          description:
            'Must contain at least one uppercase letter and one digit. ' +
            'Max 72 chars (bcrypt limit).',
          example: 'Str0ngP@ss',
        },
        firstName: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: "User's given name.",
          example: 'John',
        },
        lastName: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: "User's family name.",
          example: 'Doe',
        },
      },
      example: {
        email: 'john.doe@example.com',
        password: 'Str0ngP@ss',
        firstName: 'John',
        lastName: 'Doe',
      },
    },

    /** Mirrors loginSchema (auth.validator.ts) */
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Registered email address.',
          example: 'john.doe@example.com',
        },
        password: {
          type: 'string',
          minLength: 1,
          description: 'Account password.',
          example: 'Str0ngP@ss',
        },
      },
      example: {
        email: 'john.doe@example.com',
        password: 'Str0ngP@ss',
      },
    },

    /** Mirrors requestPasswordResetSchema (auth.validator.ts) */
    ForgotPasswordRequest: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Email of the account to send the password-reset link to.',
          example: 'john.doe@example.com',
        },
      },
      example: { email: 'john.doe@example.com' },
    },

    /** Mirrors resetPasswordSchema (auth.validator.ts) */
    ResetPasswordRequest: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: {
          type: 'string',
          minLength: 1,
          description: 'Opaque reset token received via email link.',
          example: 'eyJhbGciOiJIUzI1NiJ9.reset.token',
        },
        newPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 72,
          description:
            'Must contain at least one uppercase letter and one digit. ' +
            'Max 72 chars (bcrypt limit).',
          example: 'NewStr0ng!',
        },
      },
      example: {
        token: 'eyJhbGciOiJIUzI1NiJ9.reset.token',
        newPassword: 'NewStr0ng!',
      },
    },

    /** Mirrors verifyEmailSchema (auth.validator.ts) */
    VerifyEmailRequest: {
      type: 'object',
      required: ['token'],
      properties: {
        token: {
          type: 'string',
          minLength: 1,
          description: 'Opaque verification token received via email link.',
          example: 'eyJhbGciOiJIUzI1NiJ9.verify.token',
        },
      },
      example: { token: 'eyJhbGciOiJIUzI1NiJ9.verify.token' },
    },

    // ── Response schemas ───────────────────────────────────────────────────────
    /**
     * POST /auth/register — 201
     * Slim projection of the created user (RegisterResponseDto):
     * id + email + status only. Full profile available via GET /user/me.
     */
    RegisterResponse: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true], example: true },
        data: {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              type: 'object',
              required: ['id', 'email', 'status'],
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Unique user identifier (UUIDv7).',
                  example: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john.doe@example.com',
                },
                status: { $ref: '#/components/schemas/UserStatus' },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          user: {
            id: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            email: 'john.doe@example.com',
            status: 'ACTIVE',
          },
        },
      },
    },

    /**
     * POST /auth/login — 200
     * refreshToken is rotated into the __Host-refresh HttpOnly cookie.
     * Mirrors LoginResponseDto minus refreshToken (auth.dto.ts).
     */
    LoginResponse: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true], example: true },
        data: {
          type: 'object',
          required: ['user', 'accessToken'],
          description:
            'The refresh token is rotated into the __Host-refresh HttpOnly cookie, not present in the body.',
          properties: {
            user: {
              type: 'object',
              required: ['id', 'email', 'status'],
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Unique user identifier (UUIDv7).',
                  example: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john.doe@example.com',
                },
                status: { $ref: '#/components/schemas/UserStatus' },
              },
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token signed with RS256. Valid for 15 minutes.',
              example: 'eyJhbGciOiJSUzI1NiJ9.login.token',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          user: {
            id: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            email: 'john.doe@example.com',
            status: 'ACTIVE',
          },
          accessToken: 'eyJhbGciOiJSUzI1NiJ9.login.token',
        },
      },
    },

    /**
     * POST /auth/refresh — 200
     * Kept independent from LoginResponse so each can evolve separately.
     * The new refresh token is rotated into the HttpOnly cookie; not in the body.
     */
    RefreshResponse: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true], example: true },
        data: {
          type: 'object',
          required: ['user', 'accessToken'],
          description:
            'The new refresh token is rotated into the __Host-refresh HttpOnly cookie.',
          properties: {
            user: {
              type: 'object',
              required: ['id', 'email', 'status'],
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Unique user identifier (UUIDv7).',
                  example: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john.doe@example.com',
                },
                status: { $ref: '#/components/schemas/UserStatus' },
              },
            },
            accessToken: {
              type: 'string',
              description: 'Newly issued JWT access token signed with RS256. Valid for 15 minutes.',
              example: 'eyJhbGciOiJSUzI1NiJ9.refresh.token',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          user: {
            id: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            email: 'john.doe@example.com',
            status: 'ACTIVE',
          },
          accessToken: 'eyJhbGciOiJSUzI1NiJ9.refresh.token',
        },
      },
    },
  },

  // ── Named responses ────────────────────────────────────────────────────────
  // All bodies $ref ErrorResponse — no schema duplication.
  responses: {
    ValidationError: {
      description: 'Request body or parameters failed schema validation.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Invalid email address',
              requestId: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            },
          },
        },
      },
    },
    UnauthorizedError: {
      description: 'Authentication credentials are missing or invalid.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Unauthorized',
              requestId: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            },
          },
        },
      },
    },
    ForbiddenError: {
      description: 'The authenticated user lacks the required permissions.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Forbidden',
              requestId: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            },
          },
        },
      },
    },
    NotFoundError: {
      description: 'The requested resource does not exist.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Not Found',
              requestId: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            },
          },
        },
      },
    },
    ConflictError: {
      description: 'A resource with the same unique identifier already exists.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Email already registered',
              requestId: '018e1c2d-3f4a-7b8c-9d0e-1f2a3b4c5d6e',
            },
          },
        },
      },
    },
  },

  // ── Reusable parameters ────────────────────────────────────────────────────
  // Declared now so endpoints can $ref without touching this file later.
  parameters: {
    /** Required on all state-mutating requests once CSRF protection is active. */
    XCsrfToken: {
      name: 'x-csrf-token',
      in: 'header',
      required: true,
      description:
        'CSRF token obtained from the csrfToken cookie set during login. ' +
        'Required for all state-mutating requests (POST / PUT / DELETE).',
      schema: {
        type: 'string',
        example: 'a1b2c3d4e5f67890abcdef1234567890',
      },
    },
  },

  // ── Reusable headers ───────────────────────────────────────────────────────
  // Used in response objects to document Set-Cookie behaviour for tokens.
  headers: {
    /** HttpOnly Secure cookie carrying the opaque refresh token. */
    SetRefreshTokenCookie: {
      description:
        'Sets the __Host-refresh HttpOnly Secure SameSite=Strict cookie ' +
        'containing the opaque refresh token (7-day TTL).',
      schema: {
        type: 'string',
        example:
          '__Host-refresh=eyJ...; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
      },
    },
    /** JS-readable CSRF cookie companion to the refresh token cookie. */
    SetCsrfCookie: {
      description:
        'Sets the csrfToken SameSite=Strict cookie (readable by JS) ' +
        'that must be echoed back in the x-csrf-token header.',
      schema: {
        type: 'string',
        example: 'csrfToken=a1b2c3d4; Path=/; SameSite=Strict',
      },
    },
  },

  // ── Reusable request bodies (populated as endpoints are documented) ────────
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

  // ---------------------------------------------------------------------------
  // Paths — populated incrementally as endpoints are documented.
  //
  // operationId registry (stable names → SDK method names via orval/openapi-generator):
  //
  //   registerUser          POST   /auth/register
  //   loginUser             POST   /auth/login
  //   refreshAccessToken    POST   /auth/refresh
  //   logoutUser            POST   /auth/logout
  //   verifyEmail           POST   /auth/verify-email
  //   resendVerificationEmail POST /auth/resend-verification
  //   requestPasswordReset  POST   /auth/forgot-password
  //   resetPassword         POST   /auth/reset-password
  //   getCurrentUser        GET    /user/me
  // ---------------------------------------------------------------------------
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
