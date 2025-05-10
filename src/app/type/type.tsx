import { ReactNode } from "react";
export type AuthProps = {
  children: ReactNode;
};

export type UserProps = {
  userId?: string;
  authType: "firebase" | "web 3";
  email?: string | null;
  walletId?: string;
};
