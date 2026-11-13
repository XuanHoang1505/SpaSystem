import { UsersIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useServiceStaff } from '../hooks/useServiceStaff';

/** Chữ cái đầu của tên (từ cuối trong họ tên tiếng Việt). */
const initial = (fullName: string) => fullName.trim().split(/\s+/).at(-1)?.charAt(0) ?? '?';

/** "Kỹ thuật viên thực hiện": nhân viên thật có kỹ năng dịch vụ. Ẩn khi đang tải, lỗi hoặc chưa có ai. */
export function ServiceStaffList({ serviceId }: { serviceId: string }) {
  const staff = useServiceStaff(serviceId).data?.items ?? [];
  if (staff.length === 0) return null;
  return (
    <section aria-labelledby="service-staff" className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Đội ngũ</p>
        <h2 id="service-staff" className="flex items-center gap-2 text-2xl sm:text-3xl">
          <UsersIcon className="size-6 text-primary" aria-hidden="true" />
          Kỹ thuật viên thực hiện
        </h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <li key={member.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <Avatar size="lg">
              {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
              <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                {initial(member.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{member.fullName}</p>
              {member.specialty && (
                <p className="truncate text-sm text-muted-foreground">{member.specialty}</p>
              )}
              {member.certifications.length > 0 && (
                <p className="text-xs text-muted-foreground">{member.certifications.join(' · ')}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
