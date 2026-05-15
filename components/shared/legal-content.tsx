import { AlertCircle, FileText, RotateCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LegalContentProps = {
  title: string;
  lastUpdated?: string;
  content?: string;
  error?: string;
};

export function LegalContent({
  title,
  lastUpdated,
  content,
  error,
}: LegalContentProps) {
  if (error) {
    return (
      <Alert className="border-border bg-card">
        <AlertCircle className="size-4" />
        <AlertTitle>We couldn’t load this document.</AlertTitle>
        <AlertDescription>
          {error} Refresh the page or try again shortly. If the issue persists, visit
          support or contact the Thynk team.
        </AlertDescription>
      </Alert>
    );
  }

  if (!content) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-primary" />
            Nothing to show yet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            This legal page is available through the Thynk backend, but no content was
            returned for this document.
          </p>
        </CardContent>
      </Card>
    );
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="space-y-3 border-b border-border pb-6">
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </CardTitle>
        {lastUpdated ? (
          <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-5 text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {paragraphs.map((paragraph, index) => {
            const isHeading = paragraph.length < 80 && !paragraph.includes(".");

            return isHeading ? (
              <h2
                key={`${paragraph}-${index}`}
                className="pt-2 text-base font-semibold tracking-tight text-foreground sm:text-lg"
              >
                {paragraph}
              </h2>
            ) : (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function LegalContentLoading({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "border border-border bg-card",
        className,
      )}
    >
      <CardHeader className="space-y-3 border-b border-border pb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[94%]" />
        <Skeleton className="h-4 w-[88%]" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[72%]" />
      </CardContent>
    </Card>
  );
}

export function LegalRetryHint() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <Button asChild variant="outline" className="border-border">
        <a href=".">
          <RotateCw className="size-4" />
          Refresh page
        </a>
      </Button>
      <span>If this keeps happening, check that the Thynk backend is running.</span>
    </div>
  );
}
