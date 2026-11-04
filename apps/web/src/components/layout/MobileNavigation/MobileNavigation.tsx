import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { navigation } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Như Nguyệt Spa</SheetTitle>
          <SheetDescription className="sr-only">Menu điều hướng</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu di động" className="flex flex-col gap-1 px-4">
          {[...navigation.public, { path: '/account', title: 'Cá nhân', icon: undefined }].map(
            ({ path, title, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                  )
                }
              >
                {Icon && <Icon className="size-4" aria-hidden="true" />}
                {title}
              </NavLink>
            ),
          )}
          <Button asChild className="mt-4">
            <Link to="/login" onClick={close}>
              Đăng nhập
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
