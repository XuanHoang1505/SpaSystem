import { beforeEach, expect, test } from 'vitest';
import type { AuthResult } from '@spa/shared-types';
import { canAccessRole, useAuthStore } from './authStore';

const result: AuthResult = {
  accessToken: 'access',
  accessTokenExpiresAtUtc: '2026-11-05T10:15:00Z',
  refreshToken: null,
  refreshTokenExpiresAtUtc: null,
  user: { id: 'u1', fullName: 'Nguyễn Thị Lan', email: 'lan@spa.vn', role: 'owner' },
};

beforeEach(() => useAuthStore.setState({ status: 'restoring', user: null, accessToken: null }));

test('starts restoring and becomes authenticated with setSession', () => {
  expect(useAuthStore.getState().status).toBe('restoring');
  useAuthStore.getState().setSession(result);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'access',
    user: result.user,
    endReason: null,
  });
});

test('endSession clears the tokens and records why', () => {
  useAuthStore.getState().setSession(result);
  useAuthStore.getState().endSession('logout');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'anonymous',
    user: null,
    accessToken: null,
    accessTokenExpiresAtUtc: null,
    endReason: 'logout',
  });
});

test('markAnonymous ends restoring without a reason', () => {
  useAuthStore.getState().markAnonymous();
  expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', endReason: null });
});

test('canAccessRole compares the user role', () => {
  expect(canAccessRole(result.user, 'owner')).toBe(true);
  expect(canAccessRole(result.user, 'staff')).toBe(false);
  expect(canAccessRole(null, 'owner')).toBe(false);
});
