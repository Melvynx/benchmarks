import { CreatePersonSchema } from "@/features/person/person.schema";
import { describe, expect, it } from "vitest";

describe("person schema", () => {
  it("allows creating a person without a generated description", () => {
    expect(
      CreatePersonSchema.safeParse({
        name: "Jane",
        description: "",
        images: ["https://example.com/person.jpg"],
      }).success,
    ).toBe(true);
  });

  it("still requires a name", () => {
    expect(
      CreatePersonSchema.safeParse({
        name: "",
        description: "",
        images: ["https://example.com/person.jpg"],
      }).success,
    ).toBe(false);
  });
});
