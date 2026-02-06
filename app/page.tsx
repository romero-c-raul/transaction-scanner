import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold">Receipt Scanner</h1>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}
