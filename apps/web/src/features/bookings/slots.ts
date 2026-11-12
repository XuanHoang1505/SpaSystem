import type { Availability } from '@spa/shared-types';

/** Giờ bắt đầu (HH:mm) không trùng nhau của mọi nhân viên, tăng dần: hàng "kỹ thuật viên bất kỳ". */
export function anyStaffTimes(availability: Availability): string[] {
  const times = new Set(
    availability.staff.flatMap((member) => member.slots.map((slot) => slot.startTime)),
  );
  return [...times].sort();
}

/** Ẩn giờ đã qua, chỉ khi ngày đang xem là hôm nay (giờ Việt Nam). Chỉ để hiển thị: backend vẫn kiểm tra. */
export function hideElapsed(
  times: readonly string[],
  date: string,
  now: { date: string; time: string },
): string[] {
  return date === now.date ? times.filter((time) => time > now.time) : [...times];
}
