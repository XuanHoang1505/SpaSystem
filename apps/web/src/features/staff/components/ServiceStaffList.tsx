import { AwardIcon, CalendarPlusIcon, SparklesIcon, UsersIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookServiceButton } from '@/features/bookings/components/BookServiceButton';
import { useServiceStaff } from '../hooks/useServiceStaff';

/** Chữ cái đầu của tên (từ cuối trong họ tên tiếng Việt). */
const initial = (fullName: string) => fullName.trim().split(/\s+/).at(-1)?.charAt(0) ?? '?';

/** "Kỹ thuật viên thực hiện": nhân viên thật có kỹ năng dịch vụ, kèm chứng chỉ và nút đặt lịch chọn sẵn KTV. */
export function ServiceStaffList({ serviceId }: { serviceId: string }) {
  const staff = useServiceStaff(serviceId).data?.items ?? [];
  if (staff.length === 0) return null;
  return (
    <section aria-labelledby="service-staff" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Đội ngũ chuyên môn
          </p>
          <h2
            id="service-staff"
            className="mt-1 flex items-center gap-2 font-heading text-2xl font-semibold sm:text-3xl"
          >
            <UsersIcon className="size-6 text-primary" aria-hidden="true" />
            Kỹ thuật viên thực hiện
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn có thể chọn trước kỹ thuật viên yêu thích ngay khi đặt lịch hẹn.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {staff.length} kỹ thuật viên phụ trách
        </span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <li
            key={member.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-2xs transition-colors hover:border-primary/30"
          >
            <div className="space-y-3.5">
              <div className="flex items-center gap-3.5">
                <Avatar size="lg" className="ring-2 ring-primary/15">
                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                    {initial(member.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-base font-semibold text-foreground">
                    {member.fullName}
                  </p>
                  {member.specialty && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-primary">
                      <SparklesIcon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{member.specialty}</span>
                    </p>
                  )}
                </div>
              </div>

              {member.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t pt-3">
                  {member.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      <AwardIcon className="size-3 shrink-0 text-primary" aria-hidden="true" />
                      <span>{cert}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <BookServiceButton
              serviceId={serviceId}
              prefill={{ staffMemberId: member.id }}
              variant="outline"
              size="sm"
              className="w-full justify-center bg-background/60 hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              <CalendarPlusIcon className="size-3.5" aria-hidden="true" />
              Đặt lịch cùng {member.fullName}
            </BookServiceButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
