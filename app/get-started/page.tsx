import { redirect } from "next/navigation";

type LegacyGetStartedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyGetStartedPage({ searchParams }: LegacyGetStartedPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        nextParams.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  redirect(query ? `/pay?${query}` : "/pay");
}
