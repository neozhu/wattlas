"use client";

import { sendGAEvent } from "@next/third-parties/google";

export type WattlasAction =
  | "lens_changed"
  | "filter_changed"
  | "entity_selected"
  | "google_search_opened"
  | "evidence_opened"
  | "comparison_added"
  | "filters_hidden"
  | "filters_shown"
  | "year_changed"
  | "inspector_resized"
  | "data_status_opened";

type AnalyticsValue = string | number | boolean | undefined;
export type WattlasActionParameters = Record<string, AnalyticsValue>;

export function geographyEntityType(properties: object): "country" | "state" | "region" {
  if (!("level" in properties)) return "region";
  return properties.level === "country" ? "country" : properties.level === "admin_1" ? "state" : "region";
}

export function trackWattlasAction(action: WattlasAction, parameters: WattlasActionParameters = {}) {
  const definedParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );
  sendGAEvent("event", "wattlas_action", { action, ...definedParameters });
}
