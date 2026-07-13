"use client";

import type { ComponentType } from "react";
import type { DesignConfig } from "@/lib/schema/config";
import { GaneshModel } from "./GaneshModel";
import { KrishnaModel } from "./KrishnaModel";
import { ShankarModel } from "./ShankarModel";

export interface BodyModelProps {
  config: DesignConfig;
  colorPick?: boolean;
  onZoneClick?: (zoneKey: string) => void;
}

/**
 * Placeholder body model per deity. This is the ONLY place a deity id maps
 * to code: catalog parts stay data-driven; only the parametric placeholder
 * body needs a component (real artist rigs replace these via the same
 * socket/zone conventions).
 */
const BODY_MODELS: Record<string, ComponentType<BodyModelProps>> = {
  ganesh: GaneshModel,
  krishna: KrishnaModel,
  shankar: ShankarModel,
};

export function getBodyModel(deityId: string): ComponentType<BodyModelProps> {
  return BODY_MODELS[deityId] ?? GaneshModel;
}
