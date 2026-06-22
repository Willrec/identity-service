# Objective

Using the configured Neon MCP connection, design and generate the complete authentication database schema for a CV Builder SaaS platform.

The system follows a pragmatic microservices architecture.

Current services:

* auth-service
* resume-service

This task applies ONLY to the auth-service database.

Use PostgreSQL and create all database objects inside a dedicated schema named `auth`.

---

# Architecture Context

The authentication service is responsible for:

* User registration
* User authentication
* OAuth 2.0 authentication
* JWT issuance
* Refresh token rotation
* Session management
* Email verification
* Password reset
* RBAC authorization
* Security auditing

The platform will use:

* Node.js
* Express
* TypeScript
* Prisma ORM
* Neon PostgreSQL
* JWT RS256
* Google OAuth 2.0

The database design must be production-ready and allow future expansion without major schema changes.

---

# General Requirements

* Create schema `auth` if it does not exist.
* Use UUID primary keys.
* Prefer UUID v7 when supported.
* Use snake_case naming convention.
* Use TIMESTAMP WITH TIME ZONE.
* Use NOW() defaults where applicable.
* Add all required foreign keys.
* Add indexes for frequently queried columns.
* Add unique constraints where appropriate.
* Generate idempotent SQL migration scripts.
* Include comments where useful.
* Avoid unnecessary nullable fields.
* Do not implement soft deletes in the initial version.

---

# Schema: auth

## users

Purpose:

Stores platform users.

Columns:

* id
* email
* password_hash
* first_name
* last_name
* avatar_url
* email_verified
* status
* created_at
* updated_at

Constraints:

* email unique
* email_verified default false
* status default 'ACTIVE'

Allowed status values:

* ACTIVE
* SUSPENDED
* DELETED

Indexes:

* email
* status

---

## roles

Purpose:

RBAC roles.

Columns:

* id
* name
* description
* created_at

Seed values:

* USER
* ADMIN
* SUPER_ADMIN

Constraints:

* role name unique

Indexes:

* name

---

## permissions

Purpose:

Defines system permissions.

Columns:

* id
* name
* description
* resource
* action
* created_at

Examples:

* resume:create
* resume:update
* resume:delete
* resume:view
* user:view
* user:update
* admin:access

Constraints:

* permission name unique

Indexes:

* name
* resource

---

## role_permissions

Purpose:

Many-to-many relationship between roles and permissions.

Columns:

* role_id
* permission_id
* created_at

Constraints:

* composite primary key (role_id, permission_id)

Indexes:

* role_id
* permission_id

---

## user_roles

Purpose:

Many-to-many relationship between users and roles.

Columns:

* user_id
* role_id
* created_at

Constraints:

* composite primary key (user_id, role_id)

Indexes:

* user_id
* role_id

---

## oauth_accounts

Purpose:

Stores OAuth providers linked to users.

Columns:

* id
* user_id
* provider
* provider_user_id
* created_at

Examples:

* google

Constraints:

* unique(provider, provider_user_id)

Indexes:

* user_id
* provider

---

## sessions

Purpose:

Tracks active user sessions and devices.

This table enables:

* Logout from all devices
* Session revocation
* Security monitoring
* Device tracking
* Suspicious activity detection

Columns:

* id
* user_id
* refresh_token_id
* device_name
* browser
* operating_system
* ip
* user_agent
* last_seen_at
* expires_at
* revoked
* revoked_at
* created_at

Constraints:

* revoked default false

Indexes:

* user_id
* refresh_token_id
* expires_at
* revoked
* last_seen_at

---

## refresh_tokens

Purpose:

Stores hashed refresh tokens.

Security Requirement:

Never store refresh tokens in plain text.

Columns:

* id
* user_id
* session_id
* token_hash
* expires_at
* revoked
* revoked_at
* created_at

Constraints:

* revoked default false

Indexes:

* user_id
* session_id
* expires_at
* revoked

---

## email_verification_tokens

Purpose:

Email verification workflow.

Columns:

* id
* user_id
* token_hash
* expires_at
* created_at

Indexes:

* user_id
* expires_at

---

## password_reset_tokens

Purpose:

Password reset workflow.

Columns:

* id
* user_id
* token_hash
* expires_at
* created_at

Indexes:

* user_id
* expires_at

---

## audit_logs

Purpose:

Stores authentication and security audit events.

Columns:

* id
* user_id
* action
* ip
* user_agent
* metadata JSONB
* created_at

Example actions:

* LOGIN_SUCCESS
* LOGIN_FAILED
* LOGOUT
* PASSWORD_CHANGED
* PASSWORD_RESET
* EMAIL_VERIFIED
* USER_CREATED
* ROLE_ASSIGNED
* ROLE_REMOVED
* SESSION_REVOKED
* LOGIN_BLOCKED

Indexes:

* user_id
* action
* created_at

---

# Relationships

users
→ user_roles

roles
→ user_roles

roles
→ role_permissions

permissions
→ role_permissions

users
→ oauth_accounts

users
→ sessions

sessions
→ refresh_tokens

users
→ refresh_tokens

users
→ email_verification_tokens

users
→ password_reset_tokens

users
→ audit_logs

---

# Security Requirements

The schema must support:

* JWT RS256 authentication
* Refresh token rotation
* OAuth 2.0 providers
* RBAC authorization
* Future ABAC extension
* Security auditing
* Session revocation
* Device management
* Account suspension
* Email verification
* Password reset

Refresh tokens must be stored only as hashes.

No secrets, JWTs, access tokens, OAuth tokens, or passwords may be stored in plaintext.

---

# Seed Data

Generate SQL seed scripts for:

Roles:

* USER
* ADMIN
* SUPER_ADMIN

Permissions:

* resume:create
* resume:update
* resume:delete
* resume:view
* user:view
* user:update
* admin:access

Role mappings:

USER:

* resume:create
* resume:update
* resume:view

ADMIN:

* all USER permissions
* resume:delete
* user:view
* user:update

SUPER_ADMIN:

* all permissions

---

# Additional Validation

Before generating the migration:

Validate:

* PostgreSQL best practices
* Neon compatibility
* Prisma ORM compatibility
* RBAC best practices
* OAuth 2.0 requirements
* Refresh token rotation requirements
* Session management requirements
* Security audit requirements

If improvements are identified, explain them before generating the final migration.

---

# Deliverables

Generate:
1. Complete PostgreSQL migration SQL.
2. Schema creation script.
3. Tables.
4. Constraints.
5. Foreign keys.
6. Indexes.
7. Seed data.
8. Prisma schema recommendations.
9. Entity relationship diagram (ERD).
10. Security architecture explanation.
11. Future scalability recommendations.
The resulting schema must be suitable for production deployment in Neon PostgreSQL and support a secure authentication service for a microservices-based SaaS platform.
