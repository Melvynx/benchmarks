import { Header } from "@/components/header";
import { ThumbnailGenerator } from "@/components/thumbnail-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="px-4 pb-12">
        <ThumbnailGenerator />
      </div>
    </main>
  );
}
