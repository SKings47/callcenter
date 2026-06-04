/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as helpers from "../helpers.js";
import type * as ingest_recording from "../ingest_recording.js";
import type * as ingestion from "../ingestion.js";
import type * as queries from "../queries.js";
import type * as queues from "../queues.js";
import type * as reviews from "../reviews.js";
import type * as routing from "../routing.js";
import type * as sessions from "../sessions.js";
import type * as storage from "../storage.js";
import type * as transcribe from "../transcribe.js";
import type * as transcriptions from "../transcriptions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  agents: typeof agents;
  auth: typeof auth;
  helpers: typeof helpers;
  ingest_recording: typeof ingest_recording;
  ingestion: typeof ingestion;
  queries: typeof queries;
  queues: typeof queues;
  reviews: typeof reviews;
  routing: typeof routing;
  sessions: typeof sessions;
  storage: typeof storage;
  transcribe: typeof transcribe;
  transcriptions: typeof transcriptions;
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

export declare const components: {};
