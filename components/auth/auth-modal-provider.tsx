"use client";

import * as React from "react";

import { AuthModal } from "@/components/auth/auth-modal";

export type AuthView =
  | "sign-in"
  | "register"
  | "verify-email"
  | "forgot-password"
  | "verify-reset"
  | "reset-password";

type AuthModalContextValue = {
  openAuthModal: (view?: AuthView) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = React.createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<AuthView>("sign-in");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const openAuthModal = React.useCallback((nextView: AuthView = "sign-in") => {
    setView(nextView);
    setNotice(null);
    setOpen(true);
  }, []);

  const closeAuthModal = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal
        code={code}
        email={email}
        notice={notice}
        open={open}
        view={view}
        onCodeChange={setCode}
        onEmailChange={setEmail}
        onNoticeChange={setNotice}
        onOpenChange={setOpen}
        onViewChange={setView}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = React.useContext(AuthModalContext);

  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider.");
  }

  return context;
}
