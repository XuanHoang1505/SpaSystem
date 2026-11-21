import {
  AboutFaq,
  AboutGallery,
  AboutIntro,
  AboutJourney,
  AboutNote,
  AboutValues,
  AboutVisit,
} from '@/features/about';
import { ClosingInvite, HomeBackdrop, TeamSection } from '@/features/home';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * About the spa (UC-SPA-08, SCR-W06): story, the spa's note, values, a visit step by step, the space, team, common
 * questions, address with map and contact actions.
 */
export function AboutPage() {
  useDocumentTitle('Giới thiệu');
  return (
    <div className="relative isolate space-y-20 md:space-y-28">
      <HomeBackdrop />
      <AboutIntro />
      <AboutNote />
      <AboutValues />
      <AboutJourney />
      <AboutGallery />
      <TeamSection />
      <AboutFaq />
      <AboutVisit />
      <ClosingInvite />
    </div>
  );
}
