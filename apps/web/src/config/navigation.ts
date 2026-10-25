import { routes } from '@app/routes';
export type Workspace = keyof typeof routes;
const links = (entries: readonly (readonly [string, string])[]) =>
  entries.filter(([path]) => !path.includes(':'));
export const navigation: Record<Workspace, readonly (readonly [string, string])[]> = {
  public: links(routes.public),
  customer: links(routes.customer),
  staff: links(routes.staff),
  owner: links(routes.owner),
};
