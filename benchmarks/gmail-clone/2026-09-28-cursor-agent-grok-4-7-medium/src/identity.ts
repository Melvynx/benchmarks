import type { Person } from "./types";

export const ME_EMAIL = "jordan.hale@northwind.dev";

export const ME: Person = {
  name: "Jordan Hale",
  email: ME_EMAIL,
};

export function mePerson(displayName: string): Person {
  return { name: displayName.trim() || ME.name, email: ME_EMAIL };
}
