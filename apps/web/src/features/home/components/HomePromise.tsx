import { demoTrustItems } from '../homeDemoContent';
import { HomeContainer } from './HomeContainer';

/**
 * The spa's promise on a full-width dark brand band (the one colour block of the page, a clear break between the
 * product blocks): a statement on the left, four short points on the right (content is DEMO).
 */
export function HomePromise() {
  return (
    <section
      aria-labelledby="home-promise"
      className="bg-primary py-16 text-primary-foreground md:py-24"
    >
      <HomeContainer className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <h2
          id="home-promise"
          className="font-heading text-3xl leading-[1.2] tracking-tight text-balance md:text-4xl"
        >
          Mỗi buổi chăm sóc là một <em className="pb-1 text-secondary">khoảng lặng</em> được chuẩn
          bị riêng cho bạn.
        </h2>
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {demoTrustItems.map(({ icon: Icon, title, description }) => (
            <li key={title} className="space-y-2 border-t border-primary-foreground/20 pt-5">
              <Icon className="size-6 text-secondary" aria-hidden="true" />
              <p className="font-medium">{title}</p>
              <p className="text-sm leading-relaxed text-primary-foreground/80">{description}</p>
            </li>
          ))}
        </ul>
      </HomeContainer>
    </section>
  );
}
