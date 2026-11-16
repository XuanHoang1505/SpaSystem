import {
  CategoryShowcase,
  ClosingInvite,
  FeaturedServices,
  HomeBackdrop,
  HomeHero,
  HomePromise,
  PackageDeals,
  ReviewsSection,
  TeamSection,
} from '@/features/home';

/**
 * Public home (SCR-W01), a full-width editorial page for the web (each block a different composition, unlike the
 * mobile cards), over faint branches: banner, category bento, service list on a white band, team,
 * package feature, reviews on a white band, promise on a dark band, closing invitation.
 */
export function HomePage() {
  return (
    <div className="relative isolate space-y-20 md:space-y-28">
      <HomeBackdrop />
      <HomeHero />
      <CategoryShowcase />
      <FeaturedServices />
      <TeamSection />
      <PackageDeals />
      <ReviewsSection />
      <HomePromise />
      <ClosingInvite />
    </div>
  );
}
