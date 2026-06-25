import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { OpenAPIV3_1 } from 'openapi-types';

// ---------------------------------------------------------------------------
// Spec — built programmatically; no YAML files or code-gen required.
// Paths and component schemas are populated incrementally as endpoints are
// documented. The structure below mirrors the final layout so that future
// additions never require a reorganisation.
// ---------------------------------------------------------------------------

const components: OpenAPIV3_1.Document['components'] = {
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
      example: {
        success: true,
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
          example: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
        },
        email: {
          type: 'string',
          format: 'email',
          description: "User's registered email address.",
          example: 'john@example.com',
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
          example: 'john@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 72,
          description:
            'Must contain at least one uppercase letter and one digit. ' +
            'Max 72 chars (bcrypt limit).',
          example: 'Password123!',
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
        email: 'john@example.com',
        password: 'Password123!',
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
          example: 'john@example.com',
        },
        password: {
          type: 'string',
          minLength: 1,
          description: 'Account password.',
          example: 'Password123!',
        },
      },
      example: {
        email: 'john@example.com',
        password: 'Password123!',
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
          example: 'john@example.com',
        },
      },
      example: {
        email: 'john@example.com',
      },
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
          example: 'reset-token',
        },
        newPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 72,
          description:
            'Must contain at least one uppercase letter and one digit. ' +
            'Max 72 chars (bcrypt limit).',
          example: 'NewPassword123!',
        },
      },
      example: {
        token: 'reset-token',
        newPassword: 'NewPassword123!',
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
          example: 'verification-token',
        },
      },
      example: {
        token: 'verification-token',
      },
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
                  example: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john@example.com',
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
            id: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
            email: 'john@example.com',
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
                  example: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john@example.com',
                },
                status: { $ref: '#/components/schemas/UserStatus' },
              },
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token signed with RS256. Valid for 15 minutes.',
              example: '<jwt>',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          user: {
            id: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
            email: 'john@example.com',
            status: 'ACTIVE',
          },
          accessToken: '<jwt>',
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
                  example: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's registered email address.",
                  example: 'john@example.com',
                },
                status: { $ref: '#/components/schemas/UserStatus' },
              },
            },
            accessToken: {
              type: 'string',
              description: 'Newly issued JWT access token signed with RS256. Valid for 15 minutes.',
              example: '<jwt>',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          user: {
            id: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
            email: 'john@example.com',
            status: 'ACTIVE',
          },
          accessToken: '<jwt>',
        },
      },
    },

    /** Mirrors resendVerificationEmailSchema (auth.validator.ts) */
    ResendVerificationRequest: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Registered email address to resend verification link.',
          example: 'john@example.com',
        },
      },
      example: {
        email: 'john@example.com',
      },
    },

    /**
     * GET /auth/me — 200
     * Returns the full profile details for the authenticated user.
     */
    MeResponse: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true], example: true },
        data: { $ref: '#/components/schemas/UserResponse' },
      },
      example: {
        success: true,
        data: {
          id: '0f3d2c4b-2d78-4b89-b20b-4dbe7c8472d8',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          emailVerified: true,
          status: 'ACTIVE',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-06-25T14:00:00.000Z',
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
    InternalServerError: {
      description: 'An unexpected internal server error occurred.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal Server Error',
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
        'CSRF token obtained from the csrfToken cookie. Required only on endpoints ' +
        'relying on cookie auth (POST /auth/refresh and POST /auth/logout) to prevent CSRF attacks. ' +
        'The value must exactly match the value of the csrfToken cookie.',
      schema: {
        type: 'string',
        example: 'a1b2c3d4e5f67890abcdef1234567890',
      },
    },
    /** Cookie containing the CSRF token. Checked by the csrfProtection middleware. */
    CsrfTokenCookie: {
      name: 'csrfToken',
      in: 'cookie',
      required: true,
      description:
        'CSRF token stored in a Lax cookie (readable by frontend JavaScript, HttpOnly=false). ' +
        'Must match the x-csrf-token header. Rotated on refresh.',
      schema: {
        type: 'string',
        example: 'a1b2c3d4e5f67890abcdef1234567890',
      },
    },
    /** HttpOnly Secure cookie carrying the opaque refresh token. */
    RefreshTokenCookie: {
      name: '__Host-refresh',
      in: 'cookie',
      required: true,
      description:
        'HttpOnly Secure (in production) SameSite=Lax cookie containing the opaque refresh token. ' +
        'Rotated on refresh. Path=/.',
      schema: {
        type: 'string',
        example: 'eyJhbGciOiJIUzI1NiJ9.refresh.token',
      },
    },
  },

  // ── Reusable headers ───────────────────────────────────────────────────────
  // Used in response objects to document Set-Cookie behaviour for tokens.
  headers: {
    /** HttpOnly Secure cookie carrying the opaque refresh token. */
    SetRefreshTokenCookie: {
      description:
        'Sets the __Host-refresh HttpOnly Secure (in production) SameSite=Lax cookie ' +
        'containing the opaque refresh token (7-day TTL). Rotated on refresh. Path=/.',
      schema: {
        type: 'string',
        example:
          '__Host-refresh=eyJ...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800',
      },
    },
    /** JS-readable CSRF cookie companion to the refresh token cookie. */
    SetCsrfCookie: {
      description:
        'Sets the csrfToken SameSite=Lax cookie (readable by JS, HttpOnly=false) ' +
        'that must be echoed back in the x-csrf-token header. Rotated on refresh. Path=/.',
      schema: {
        type: 'string',
        example: 'csrfToken=a1b2c3d4; Path=/; SameSite=Lax',
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
const tags: OpenAPIV3_1.Document['tags'] = [
  {
    name: 'Authentication',
    description: 'Registration, login, logout, and token lifecycle.',
  },
  {
    name: 'Users',
    description: 'Authenticated user profile operations.',
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
      'Authentication is token- and cookie-based:\n' +
      '* **Access Token**: Short-lived Bearer token returned in the JSON response payload (`accessToken`). Used in the `Authorization` header.\n' +
      '* **Refresh Token**: Long-lived rotating token stored in an HttpOnly, Secure SameSite=Lax cookie (`__Host-refresh`). Never returned in the response body.\n' +
      '* **CSRF Protection**: All state-mutating requests relying on the refresh cookie must match the `x-csrf-token` header to the `csrfToken` cookie value.',
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
  //   getCurrentUser        GET    /auth/me
  // ---------------------------------------------------------------------------
  paths: {
    '/auth/register': {
      post: {
        operationId: 'registerUser',
        summary: 'Register a new user',
        description: 'Creates a new user account with unverified status and triggers an email verification flow.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'User registration credentials and profile details.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User account registered successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': { $ref: '#/components/responses/ConflictError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/login': {
      post: {
        operationId: 'loginUser',
        summary: 'Log in user',
        description:
          'Authenticates a user using email and password. ' +
          'On success, returns a short-lived access token in the JSON body, ' +
          'and sets the long-lived refresh token and CSRF companion token as HttpOnly and Lax cookies.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'Login email and password.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful. Cookies set.',
            headers: {
              'Set-Cookie': {
                description: 'Sets the __Host-refresh (HttpOnly) and csrfToken cookies. See components headers.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        operationId: 'refreshAccessToken',
        summary: 'Refresh access token',
        description:
          'Rotates the active HttpOnly refresh token cookie and issues a new access token. ' +
          'Requires valid CSRF verification cookies and headers.',
        tags: ['Authentication'],
        security: [],
        parameters: [
          { $ref: '#/components/parameters/XCsrfToken' },
          { $ref: '#/components/parameters/CsrfTokenCookie' },
          { $ref: '#/components/parameters/RefreshTokenCookie' },
        ],
        responses: {
          '200': {
            description: 'Token refreshed successfully. Cookies rotated.',
            headers: {
              'Set-Cookie': {
                description: 'Rotates __Host-refresh (HttpOnly) and csrfToken cookies. See components headers.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/logout': {
      post: {
        operationId: 'logoutUser',
        summary: 'Log out user',
        description:
          'Revokes the user session and clears all authentication/CSRF cookies. ' +
          'Requires valid CSRF verification cookies and headers. Idempotent.',
        tags: ['Authentication'],
        security: [],
        parameters: [
          { $ref: '#/components/parameters/XCsrfToken' },
          { $ref: '#/components/parameters/CsrfTokenCookie' },
          {
            name: '__Host-refresh',
            in: 'cookie',
            required: false,
            description: 'HttpOnly Secure SameSite=Lax cookie containing the opaque refresh token to revoke.',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Logout successful. Cookies cleared.',
            headers: {
              'Set-Cookie': {
                description: 'Clears __Host-refresh and csrfToken cookies by setting Max-Age=0.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        operationId: 'verifyEmail',
        summary: 'Verify email address',
        description: 'Marks a user account email as verified using the opaque verification token received via email.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'Opaque verification token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        operationId: 'resendVerificationEmail',
        summary: 'Resend verification email',
        description: 'Resends an email verification link if the account exists and is not yet verified.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'Registered email address of the account.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResendVerificationRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification email sent if account exists and is unverified.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        operationId: 'requestPasswordReset',
        summary: 'Request password reset link',
        description: 'Sends a password reset token via email if the account exists.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'Registered email address of the account.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset link sent if account exists.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        operationId: 'resetPassword',
        summary: 'Reset password',
        description: 'Resets the account password using the opaque token received in the password reset email.',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          description: 'Opaque reset token and new password credentials.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/me': {
      get: {
        operationId: 'getCurrentUser',
        summary: 'Get current user profile',
        description: 'Retrieves profile details of the currently authenticated user. Requires a valid Bearer JWT.',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
} as const satisfies OpenAPIV3_1.Document;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const docsRouter: Router = Router();

// GET /docs/openapi.json — raw specification
docsRouter.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// GET /docs — Swagger UI
docsRouter.use('/docs', swaggerUi.serve);
docsRouter.get('/docs', swaggerUi.setup(openApiSpec as unknown as Record<string, unknown>));

export { docsRouter as openApiRouter };
