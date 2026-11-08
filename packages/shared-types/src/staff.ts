/** What guests and customers see in `GET /staff` (no contact details, docs/specs/staff.md). */
export interface PublicStaffMember {
  id: string;
  fullName: string;
  specialty: string | null;
  avatarUrl: string | null;
}
