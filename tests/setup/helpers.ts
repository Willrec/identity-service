import { prisma } from '../../src/infrastructure/database/prisma.js';
import { request } from './test-app.js';
import { generateTestUser } from '../fixtures/users.js';

// ── Test User Tracking for Cleanup ───────────────────────────────────────────
const createdUserIds = new Set<string>();

export const cleanupData = async () => {
  if (createdUserIds.size > 0) {
    const ids = Array.from(createdUserIds);
    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
    createdUserIds.clear();
  }
};

// ── User Creation Helpers ────────────────────────────────────────────────────
export const createUser = async (overrides?: any) => {
  const payload = { ...generateTestUser(), ...overrides };
  const res = await request.post('/api/v1/auth/register').send(payload);
  if (res.body.data?.user?.id) {
    createdUserIds.add(res.body.data.user.id);
  }
  return { res, payload };
};

export const createVerifiedUser = async (overrides?: any) => {
  const { res, payload } = await createUser(overrides);
  const userId = res.body.data?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }
  return { res, payload };
};

export const createUnverifiedUser = async (overrides?: any) => {
  return createUser(overrides);
};

export const createSuspendedUser = async (overrides?: any) => {
  const { res, payload } = await createUser(overrides);
  const userId = res.body.data?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
  }
  return { res, payload };
};

export const createDeletedUser = async (overrides?: any) => {
  const { res, payload } = await createUser(overrides);
  const userId = res.body.data?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED' },
    });
  }
  return { res, payload };
};

export const createAdminUser = async (overrides?: any) => {
  const { res, payload } = await createUser(overrides);
  const userId = res.body.data?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    const role = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN' },
    });
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
  return { res, payload };
};

export const createSuperAdminUser = async (overrides?: any) => {
  const { res, payload } = await createUser(overrides);
  const userId = res.body.data?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    const role = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN' },
    });
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
  return { res, payload };
};

// ── Auth Flow Helpers ────────────────────────────────────────────────────────
export const login = async (email: string, password: string) => {
  const res = await request.post('/api/v1/auth/login').send({ email, password });
  let refreshCookie = '';
  let csrfCookie = '';

  const setCookie = res.headers['set-cookie'];
  if (setCookie) {
    for (const c of setCookie) {
      if (c.startsWith('__Host-refresh=')) {
        refreshCookie = c.split(';')[0].split('=')[1];
      }
      if (c.startsWith('csrfToken=')) {
        csrfCookie = c.split(';')[0].split('=')[1];
      }
    }
  }
  return { res, refreshCookie, csrfCookie };
};

export const verifyEmail = async (token: string) => {
  return request.post('/api/v1/auth/verify-email').send({ token });
};

export const refresh = async (refreshCookie: string, csrfCookie: string, csrfHeader: string) => {
  return request
    .post('/api/v1/auth/refresh')
    .set('Cookie', [`__Host-refresh=${refreshCookie}`, `csrfToken=${csrfCookie}`])
    .set('x-csrf-token', csrfHeader);
};

export const logout = async (refreshCookie: string, csrfCookie: string, csrfHeader: string) => {
  return request
    .post('/api/v1/auth/logout')
    .set('Cookie', [`__Host-refresh=${refreshCookie}`, `csrfToken=${csrfCookie}`])
    .set('x-csrf-token', csrfHeader);
};

export const forgotPassword = async (email: string) => {
  return request.post('/api/v1/auth/forgot-password').send({ email });
};

export const resetPassword = async (token: string, newPassword: string) => {
  return request.post('/api/v1/auth/reset-password').send({ token, newPassword });
};

export const authenticateClient = async (overrides?: any) => {
  const { payload } = await createVerifiedUser(overrides);
  const { res, refreshCookie, csrfCookie } = await login(payload.email, payload.password);
  return {
    accessToken: res.body.data?.accessToken,
    refreshCookie,
    csrfCookie,
    userPayload: payload
  };
};
