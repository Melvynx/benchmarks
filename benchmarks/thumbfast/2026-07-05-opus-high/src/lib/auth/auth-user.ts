import { unauthorized } from "@/compat/navigation";

type CompatUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

type CompatSession = {
  user: CompatUser;
};

export const getSession = async (): Promise<CompatSession | null> => null;

export const getUser = async (): Promise<CompatUser | null> => null;

export const getRequiredUser = async () => {
  const user = await getUser();

  if (!user) {
    unauthorized();
  }

  return user;
};

export const getRequiredAdmin = async () => getRequiredUser();
