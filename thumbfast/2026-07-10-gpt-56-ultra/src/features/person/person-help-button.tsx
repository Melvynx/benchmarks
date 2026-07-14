import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { BookOpen, HelpCircle } from "lucide-react";
import Link from "@/compat/link";

export function showPersonTutorial() {
  dialogManager.custom({
    title: "How to Create a Good Person",
    description:
      "Learn the best practices for creating persons that work well with AI thumbnail generation.",
    size: "xl",
    children: (
      <div className="flex flex-col gap-4">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src="https://www.tella.tv/video/ai-thumbnail-creation-tips-0gth/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
            title="How to create a good person tutorial"
            className="size-full"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        </div>
        <Link
          href="/docs/guides/person-best-practices"
          className={buttonVariants({ variant: "outline" })}
        >
          <BookOpen className="mr-2 size-4" />
          Read Full Documentation
        </Link>
      </div>
    ),
  });
}

export function PersonHelpButton() {
  return (
    <Button variant="outline" onClick={showPersonTutorial}>
      <HelpCircle className="mr-2 size-4" />
      How to create a good person
    </Button>
  );
}
