import { useSession } from "@/lib/auth-client";
import { LoggedInButton, SignInButton } from "./sign-in-button";

export const AuthButtonClient = () => {
  const session = useSession();

  if (session.data?.user) {
    const user = session.data.user;
    return <LoggedInButton user={user} />;
  }

  return <SignInButton />;
};
