import { AuthEntryPage } from "@/components/auth/auth-entry-page";

export default function SignInPlaceholderPage() {
  return (
    <AuthEntryPage
      view="sign-in"
      title="Sign in to Thynk"
      description="Open the auth workspace to continue with your prompts, saved items, and usage."
    />
  );
}
