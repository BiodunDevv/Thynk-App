"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function WorkspacePromptBox() {
  const [value, setValue] = React.useState("");

  return (
    <Card id="workspace-prompt-box" className="border border-border bg-card">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl tracking-tight">
          What do you want to create with Thynk?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Start with a rough objective, a broken workflow, or a messy note dump.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          className="min-h-40 resize-none"
          placeholder="Describe what you want Thynk to create…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />

        <Separator />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {["Template", "Tone", "Platform"].map((label) => (
              <Button key={label} type="button" variant="outline" size="sm" className="gap-2">
                {label}
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/templates">Browse templates</Link>
            </Button>
            <Button>
              Generate
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

