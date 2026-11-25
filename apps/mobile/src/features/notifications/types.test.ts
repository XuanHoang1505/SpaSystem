import type { NotificationDto } from '@spa/shared-types';
import { initialsOf } from '@/lib/formatting/initials';
import { getMobileNotificationTargetRoute } from './types';

const notice = (
  referenceType: NotificationDto['referenceType'],
  referenceId: string | null = 'ref-1',
): NotificationDto => ({
  id: 'n-1',
  type: 'appointment',
  title: 't',
  body: 'b',
  referenceType,
  referenceId,
  isRead: false,
  createdAtUtc: '2026-11-24T00:00:00Z',
});

describe('getMobileNotificationTargetRoute', () => {
  it('opens the exact record a customer notice names', () => {
    expect(getMobileNotificationTargetRoute(notice('appointment'), 'customer')).toBe(
      '/booking/ref-1',
    );
    expect(getMobileNotificationTargetRoute(notice('order'), 'customer')).toBe('/my-orders/ref-1');
    expect(getMobileNotificationTargetRoute(notice('treatment_plan'), 'customer')).toBe(
      '/treatment/ref-1',
    );
    expect(getMobileNotificationTargetRoute(notice('review'), 'customer')).toBe('/my-reviews');
  });

  it('opens the staff appointment and falls back to lists without an id', () => {
    expect(getMobileNotificationTargetRoute(notice('appointment'), 'staff')).toBe(
      '/(staff)/bookings/ref-1',
    );
    expect(getMobileNotificationTargetRoute(notice('appointment', null), 'staff')).toBe(
      '/(staff)/bookings',
    );
    expect(getMobileNotificationTargetRoute(notice('order', null), 'customer')).toBe('/my-orders');
    expect(getMobileNotificationTargetRoute(notice('work_schedule'), 'staff')).toBe(
      '/(staff)/schedule',
    );
  });

  it('never sends staff or the owner into customer screens', () => {
    expect(getMobileNotificationTargetRoute(notice('order'), 'staff')).toBeNull();
    expect(getMobileNotificationTargetRoute(notice('treatment_plan'), 'staff')).toBeNull();
    expect(getMobileNotificationTargetRoute(notice('appointment'), 'owner')).toBeNull();
    expect(getMobileNotificationTargetRoute(notice(null), 'customer')).toBeNull();
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the first and last words', () => {
    expect(initialsOf('Lê Thị Thu Hà')).toBe('LH');
    expect(initialsOf('  minh  ')).toBe('M');
    expect(initialsOf('')).toBe('');
  });
});
