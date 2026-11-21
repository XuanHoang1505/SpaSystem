import { ShieldCheckIcon } from 'lucide-react';
import type { PublicStaffMember } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeTeam } from '../hooks/useHomeData';
import { HomeSection } from './HomeSection';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** The technicians as tall portraits with specialty and verified certifications (`GET /staff`, public). */
export function TeamSection() {
  const query = useHomeTeam();
  const members = query.data?.items ?? [];

  return (
    <HomeSection
      id="home-team"
      badge="Đội ngũ chuyên nghiệp"
      title="Đội ngũ kỹ thuật viên"
      description="Người trực tiếp chăm sóc bạn, với chứng chỉ đã được spa xác minh."
    >
      {query.isPending ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4" aria-label="Đang tải đội ngũ">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-sm" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Không tải được đội ngũ.
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : members.length === 0 ? (
        <p className="rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Spa đang cập nhật thông tin đội ngũ.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {members.map((member) => (
            <TeamMember key={member.id} member={member} />
          ))}
        </ul>
      )}
    </HomeSection>
  );
}

function TeamMember({ member }: { member: PublicStaffMember }) {
  const [firstCertification, ...more] = member.certifications;
  return (
    <li className="space-y-4">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt=""
          loading="lazy"
          className="aspect-[3/4] w-full rounded-sm object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid aspect-[3/4] w-full place-items-center rounded-sm bg-accent font-heading text-5xl text-accent-foreground"
        >
          {initials(member.fullName)}
        </div>
      )}
      <div className="space-y-1">
        <p className="font-heading text-xl leading-snug">{member.fullName}</p>
        <p className="text-sm text-muted-foreground">{member.specialty ?? 'Kỹ thuật viên'}</p>
        {firstCertification && (
          <p className="flex items-start gap-1.5 pt-1 text-sm text-primary">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {firstCertification}
              {more.length > 0 && ` và ${more.length} chứng chỉ khác`}
            </span>
          </p>
        )}
      </div>
    </li>
  );
}
