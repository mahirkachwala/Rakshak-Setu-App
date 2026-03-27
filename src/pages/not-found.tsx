import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="mt-4 rounded-xl">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}
