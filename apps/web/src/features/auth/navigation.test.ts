import { expect, test } from 'vitest';
import { homePathFor, loginPathFor, safeRedirect } from './navigation';

test('homePathFor maps each role to its area', () => {
  expect(homePathFor('customer')).toBe('/account');
  expect(homePathFor('staff')).toBe('/staff');
  expect(homePathFor('owner')).toBe('/owner');
});

test.each([
  ['/owner/staff', 'owner', '/owner/staff'],
  ['/owner/staff?page=2', 'owner', '/owner/staff?page=2'],
  ['/my-bookings/abc', 'customer', '/my-bookings/abc'],
  ['/services', 'customer', '/services'],
  ['//evil.com', 'owner', '/owner'],
  ['https://evil.com', 'customer', '/account'],
  ['/owner', 'customer', '/account'],
  ['/login', 'staff', '/staff'],
  ['/register?x=1', 'customer', '/account'],
  ['/forgot-password', 'owner', '/owner'],
  ['/nowhere', 'owner', '/owner'],
  [null, 'staff', '/staff'],
] as const)('safeRedirect(%s, %s) → %s', (redirect, role, expected) => {
  expect(safeRedirect(redirect, role)).toBe(expected);
});

test('loginPathFor keeps the path and query to come back to', () => {
  expect(loginPathFor({ pathname: '/owner', search: '?tab=1' })).toBe(
    '/login?redirect=%2Fowner%3Ftab%3D1',
  );
});
