import { LogoSvg } from "@/components/svg/logo-svg";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { SignInButton } from "@/features/auth/sign-in-button";
import { AuthButtonClient } from "@/features/auth/auth-button-client";
import {
  Bot,
  Building2,
  EyeOff,
  Grid3X3,
  ImageIcon,
  Lightbulb,
  Menu,
  User,
  Video,
  Youtube,
} from "lucide-react";
import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import Link from "@/compat/link";
import { useRouter } from "@/compat/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const FEATURE_ITEMS = [
  {
    href: "/agents",
    label: "AI Thumbnail Agent",
    description: "Chat with AI to generate thumbnails",
    icon: Bot,
  },
  {
    href: "/face-consistency",
    label: "Face Consistency",
    description: "Your face, consistent across every thumbnail",
    icon: User,
  },
  {
    href: "/inspiration-library",
    label: "Inspiration Library",
    description: "Copy styles from top YouTube creators",
    icon: Lightbulb,
  },
  {
    href: "/ab-testing",
    label: "A/B Testing",
    description: "Generate 4 variations per prompt",
    icon: Grid3X3,
  },
  {
    href: "/anonymize",
    label: "Anonymize Thumbnails",
    description: "Replace faces with wireframe mannequins",
    icon: EyeOff,
  },
  {
    href: "/video-management",
    label: "Video Management",
    description: "Organize videos and generate AI titles",
    icon: Video,
  },
] as const;

const PERSONA_ITEMS = [
  {
    href: "/for-youtubers",
    label: "For YouTubers",
    description: "Easy, cheap, and simple thumbnails",
    icon: Youtube,
  },
  {
    href: "/for-thumbnail-designers",
    label: "For Thumbnail Designers",
    description: "Faster delivery, more revenue per client",
    icon: ImageIcon,
  },
  {
    href: "/for-enterprise",
    label: "For Enterprise",
    description: "Consistent brand, no human bottleneck",
    icon: Building2,
  },
] as const;

function useBoundedScroll(threshold: number) {
  const { scrollY } = useScroll();
  const scrollYBounded = useMotionValue(0);
  const scrollYBoundedProgress = useTransform(
    scrollYBounded,
    [0, threshold],
    [0, 1],
  );

  useEffect(() => {
    const onChange = (current: number) => {
      const previous = scrollY.getPrevious() ?? 0;
      const diff = current - previous;
      const newScrollYBounded = scrollYBounded.get() + diff;

      scrollYBounded.set(clamp(newScrollYBounded, 0, threshold));
    };

    const deleteEvent = scrollY.on("change", onChange);

    const listener = () => {
      const currentScroll = window.scrollY;
      onChange(currentScroll);
    };

    window.addEventListener("scroll", listener, { passive: true });

    return () => {
      deleteEvent();
      window.removeEventListener("scroll", listener);
    };
  }, [threshold, scrollY, scrollYBounded]);

  return { scrollYBounded, scrollYBoundedProgress };
}

function NavListItem({
  href,
  icon: Icon,
  title,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <li>
      <NavigationMenuLink
        asChild
        className="flex-row items-center gap-3 rounded-lg p-2.5"
      >
        <Link href={href}>
          <div className="bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-xl p-2">
            <Icon className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm leading-none font-medium">{title}</span>
            <span className="text-muted-foreground text-xs leading-snug">
              {children}
            </span>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

const ALL_MOBILE_LINKS = [
  { title: "Features", items: FEATURE_ITEMS },
  { title: "Solutions", items: PERSONA_ITEMS },
] as const;

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LogoSvg size={24} className="text-primary" />
            {SiteConfig.title}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-6 px-4 pt-4">
          {ALL_MOBILE_LINKS.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <div className="bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-xl p-2">
                        <item.icon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>
          ))}

          <div className="border-border flex flex-col gap-1 border-t pt-4">
            <SheetClose asChild>
              <Link
                href="#pricing"
                className="hover:bg-accent rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/posts"
                className="hover:bg-accent rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
              >
                Blog
              </Link>
            </SheetClose>
          </div>

          <SheetClose asChild>
            <Link
              href="/auth/start"
              className={cn(buttonVariants(), "mt-2 w-full")}
            >
              Get Started
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function LandingHeader({
  showAuthStatus = true,
}: {
  showAuthStatus?: boolean;
}) {
  const { scrollYBoundedProgress } = useBoundedScroll(400);
  const router = useRouter();
  const scrollYBoundedProgressDelayed = useTransform(
    scrollYBoundedProgress,
    [0, 0.75, 1],
    [0, 0, 1],
  );

  return (
    <motion.header
      style={{
        height: useTransform(scrollYBoundedProgressDelayed, [0, 1], [80, 60]),
      }}
      className="bg-background/80 fixed inset-x-0 z-50 flex h-20 w-screen border-b backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <MobileMenu />
          <Link href="/" className="flex items-center gap-2">
            <LogoSvg
              size={28}
              className="text-primary"
              onClick={() => {
                router.push("/");
              }}
            />
            <motion.span
              style={{
                scale: useTransform(
                  scrollYBoundedProgressDelayed,
                  [0, 1],
                  [1, 0.9],
                ),
              }}
              className="text-foreground flex origin-left items-center text-xl font-bold max-sm:hidden"
            >
              {SiteConfig.title}
            </motion.span>
          </Link>
        </div>

        <motion.div
          style={{
            opacity: useTransform(
              scrollYBoundedProgressDelayed,
              [0, 1],
              [1, 0],
            ),
          }}
          className="hidden md:flex"
        >
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[500px] gap-1 p-2 md:grid-cols-2">
                    {FEATURE_ITEMS.map((item) => (
                      <NavListItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        title={item.label}
                      >
                        {item.description}
                      </NavListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">
                  Solutions
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-1 p-2">
                    {PERSONA_ITEMS.map((item) => (
                      <NavListItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        title={item.label}
                      >
                        {item.description}
                      </NavListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={cn(navigationMenuTriggerStyle(), "bg-transparent")}
                >
                  <Link href="#pricing">Pricing</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={cn(navigationMenuTriggerStyle(), "bg-transparent")}
                >
                  <Link href="/posts">Blog</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </motion.div>

        <div className="flex items-center gap-4">
          {showAuthStatus ? (
            <AuthButtonClient />
          ) : (
            <SignInButton callbackUrl="/" className="hidden sm:inline-flex">
              Sign in
            </SignInButton>
          )}
          <Link
            href="/auth/start"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden gap-2 sm:inline-flex",
            )}
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

const clamp = (number: number, min: number, max: number) =>
  Math.min(Math.max(number, min), max);
