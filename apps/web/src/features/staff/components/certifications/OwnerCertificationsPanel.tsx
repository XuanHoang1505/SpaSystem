import {
  useOwnerCertificationActions,
  useStaffCertifications,
} from '../../hooks/useStaffCertifications';
import { CertificationList } from './CertificationList';

/** Tab "Bằng cấp & chứng chỉ" of the owner's staff detail. Resigned staff stay editable (archive, A1). */
export function OwnerCertificationsPanel({ staffMemberId }: { staffMemberId: string }) {
  const query = useStaffCertifications(staffMemberId);
  const actions = useOwnerCertificationActions(staffMemberId);
  return (
    <CertificationList mode="owner" staffMemberId={staffMemberId} query={query} actions={actions} />
  );
}
