/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_actions from "../admin/actions.js";
import type * as admin_dto from "../admin/dto.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as app from "../app.js";
import type * as app_agentChats from "../app/agentChats.js";
import type * as app_gallery from "../app/gallery.js";
import type * as app_organizations from "../app/organizations.js";
import type * as app_people from "../app/people.js";
import type * as app_profile from "../app/profile.js";
import type * as app_prompts from "../app/prompts.js";
import type * as app_referrals from "../app/referrals.js";
import type * as app_shared from "../app/shared.js";
import type * as auth_config from "../auth/config.js";
import type * as auth_permissions from "../auth/permissions.js";
import type * as billing from "../billing.js";
import type * as billingNode from "../billingNode.js";
import type * as billingRenewal from "../billingRenewal.js";
import type * as changelog from "../changelog.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as editor from "../editor.js";
import type * as editorNode from "../editorNode.js";
import type * as email_markdownEmail from "../email/markdownEmail.js";
import type * as email_sendMarkdownEmail from "../email/sendMarkdownEmail.js";
import type * as featureFlags from "../featureFlags.js";
import type * as forms from "../forms.js";
import type * as generationConfig from "../generationConfig.js";
import type * as http from "../http.js";
import type * as inspiration from "../inspiration.js";
import type * as inspirationActions from "../inspirationActions.js";
import type * as lib_inspirationAccess from "../lib/inspirationAccess.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as orgPlanLimits from "../orgPlanLimits.js";
import type * as orgStats from "../orgStats.js";
import type * as personQualityNode from "../personQualityNode.js";
import type * as signupCredits from "../signupCredits.js";
import type * as telegram from "../telegram.js";
import type * as testHelpers from "../testHelpers.js";
import type * as thumbnailUrls from "../thumbnailUrls.js";
import type * as userImages from "../userImages.js";
import type * as userImagesNode from "../userImagesNode.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_search from "../utils/search.js";
import type * as video from "../video.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/actions": typeof admin_actions;
  "admin/dto": typeof admin_dto;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  app: typeof app;
  "app/agentChats": typeof app_agentChats;
  "app/gallery": typeof app_gallery;
  "app/organizations": typeof app_organizations;
  "app/people": typeof app_people;
  "app/profile": typeof app_profile;
  "app/prompts": typeof app_prompts;
  "app/referrals": typeof app_referrals;
  "app/shared": typeof app_shared;
  "auth/config": typeof auth_config;
  "auth/permissions": typeof auth_permissions;
  billing: typeof billing;
  billingNode: typeof billingNode;
  billingRenewal: typeof billingRenewal;
  changelog: typeof changelog;
  credits: typeof credits;
  crons: typeof crons;
  editor: typeof editor;
  editorNode: typeof editorNode;
  "email/markdownEmail": typeof email_markdownEmail;
  "email/sendMarkdownEmail": typeof email_sendMarkdownEmail;
  featureFlags: typeof featureFlags;
  forms: typeof forms;
  generationConfig: typeof generationConfig;
  http: typeof http;
  inspiration: typeof inspiration;
  inspirationActions: typeof inspirationActions;
  "lib/inspirationAccess": typeof lib_inspirationAccess;
  migrations: typeof migrations;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  orgPlanLimits: typeof orgPlanLimits;
  orgStats: typeof orgStats;
  personQualityNode: typeof personQualityNode;
  signupCredits: typeof signupCredits;
  telegram: typeof telegram;
  testHelpers: typeof testHelpers;
  thumbnailUrls: typeof thumbnailUrls;
  userImages: typeof userImages;
  userImagesNode: typeof userImagesNode;
  "utils/errors": typeof utils_errors;
  "utils/search": typeof utils_search;
  video: typeof video;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
