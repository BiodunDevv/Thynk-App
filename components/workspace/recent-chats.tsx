"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { getMyRequestChats } from "@/lib/api/chats";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentChats({ accessToken }: { accessToken: string }) {
  const chatsQuery = useQuery({
    queryKey: ["request-chats", "me"],
    queryFn: () => getMyRequestChats(accessToken),
  });

  const chats = chatsQuery.data ?? [];

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg tracking-tight">Recent chats</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue from previous request threads without losing context.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {chatsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 border border-border bg-background p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))
          : null}

        {chatsQuery.isError ? (
          <Alert className="border-border bg-muted">
            <AlertDescription>
              We couldn’t load your recent chats right now. Try again shortly.
            </AlertDescription>
          </Alert>
        ) : null}

        {!chatsQuery.isLoading && !chatsQuery.isError && chats.length === 0 ? (
          <div className="border border-border bg-background p-5">
            <h3 className="text-sm font-medium text-foreground">No chats yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a rough idea and Thynk will keep your best conversations here.
            </p>
            <Button className="mt-4" size="sm">
              Create your first prompt
            </Button>
          </div>
        ) : null}

        {!chatsQuery.isLoading && !chatsQuery.isError
          ? chats.slice(0, 5).map((chat) => {
              const latestMessage = chat.messages.at(-1);
              const preview = latestMessage?.content ?? "No messages yet.";

              return (
                <div key={chat.id} className="border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{chat.title}</h3>
                        <Badge variant="outline" className="border-border bg-card text-xs text-muted-foreground">
                          {chat.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{preview}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Continue
                    </Button>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {latestMessage
                      ? `${formatDistanceToNow(new Date(latestMessage.created_at), {
                          addSuffix: true,
                        })} · ${chat.status}`
                      : chat.status}
                  </div>
                </div>
              );
            })
          : null}
      </CardContent>
    </Card>
  );
}

