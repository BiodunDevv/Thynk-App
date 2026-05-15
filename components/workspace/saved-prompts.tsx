"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { getMyPrompts } from "@/lib/api/prompts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SavedPrompts({ accessToken }: { accessToken: string }) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const promptsQuery = useQuery({
    queryKey: ["prompts", "me"],
    queryFn: () => getMyPrompts(accessToken),
  });

  const prompts = promptsQuery.data ?? [];

  return (
    <Card id="saved-prompts" className="border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Saved prompts</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep useful prompt structures close and reopen them when the same work returns.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {promptsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 border border-border bg-background p-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))
          : null}

        {promptsQuery.isError ? (
          <Alert className="border-border bg-muted">
            <AlertDescription>
              We couldn’t load your saved prompts right now. Try again shortly.
            </AlertDescription>
          </Alert>
        ) : null}

        {!promptsQuery.isLoading && !promptsQuery.isError && prompts.length === 0 ? (
          <div className="border border-border bg-background p-5">
            <h3 className="text-sm font-medium text-foreground">No saved prompts yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Save useful prompts and reuse them whenever you need.
            </p>
            <Button className="mt-4" size="sm" variant="outline">
              Browse templates
            </Button>
          </div>
        ) : null}

        {!promptsQuery.isLoading && !promptsQuery.isError
          ? prompts.slice(0, 5).map((prompt) => (
              <div key={prompt.id} className="border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">{prompt.title}</h3>
                      <Badge variant="outline" className="border-border bg-card text-xs text-muted-foreground">
                        {prompt.category}
                      </Badge>
                      {prompt.is_favorite ? (
                        <Badge className="bg-secondary text-secondary-foreground">Favorite</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(prompt.enhanced_input ?? prompt.rough_input).slice(0, 120)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(prompt.generated_prompt);
                        setCopiedId(prompt.id);
                        window.setTimeout(() => setCopiedId(null), 1400);
                      }}
                    >
                      {copiedId === prompt.id ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm">Open</Button>
                  </div>
                </div>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  );
}

