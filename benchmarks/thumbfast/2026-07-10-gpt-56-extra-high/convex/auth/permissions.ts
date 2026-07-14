import type { Statements } from "better-auth/plugins/access";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete"],
  subscription: ["manage"],
  users: ["create", "delete"],
} as const satisfies Statements;

export const ac = createAccessControl(statement);

const member = ac.newRole({
  project: ["create"],
  users: ["create"],
  ...memberAc.statements,
});

const admin = ac.newRole({
  project: ["create", "update"],
  subscription: ["manage"],
  users: ["create", "delete"],
  ...adminAc.statements,
});

const owner = ac.newRole({
  ...(statement as Statements),
  ...ownerAc.statements,
});

export const roles = { member, admin, owner } as const;
