import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeContainer } from './HomeContainer';

/** Closing full-width band before the footer: one invitation to book, one way to ask the assistant first. */
export function ClosingInvite() {
  return (
    <section aria-labelledby="home-invite" className="bg-accent py-16 md:py-20">
      <HomeContainer className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h2
            id="home-invite"
            className="font-heading text-3xl leading-[1.15] tracking-tight text-accent-foreground md:text-5xl"
          >
            Dành cho mình một buổi chiều thư thái.
          </h2>
          <p className="max-w-md text-muted-foreground">
            Chọn dịch vụ, khung giờ và kỹ thuật viên bạn muốn, mọi thứ còn lại để spa lo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Button asChild size="lg">
            <Link to="/services">
              Đặt lịch ngay <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-background/70">
            <Link to="/ai-assistant">Hỏi trợ lý AI</Link>
          </Button>
        </div>
      </HomeContainer>
    </section>
  );
}
