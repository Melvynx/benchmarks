import { customAlphabet } from "nanoid";

const EMAIL_NAME_MAX_LENGTH = 9;

export const formatId = (id: string) => {
  return id
    .replace(/\s/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
};

export const generateSlug = (value: string) => {
  const id = customAlphabet("1234567890abcdef", 10);
  return [formatId(value), id(4)].join("-");
};

export const getNameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "";
  const name = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, EMAIL_NAME_MAX_LENGTH);

  return name || "user";
};
