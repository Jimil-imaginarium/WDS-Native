/* Shared API types — mirror Pydantic schemas in apps/api. */

export type StationStatus = "offline" | "online" | "degraded";
export type ActivityState = "active" | "idle" | "no_worker" | "camera_lost";
export type EnhancementMode = "off" | "clahe" | "auto_gamma" | "stretch";

export interface StationROI {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Station {
  id: string;
  name: string;
  location: string | null;
  page_url: string | null;
  floor_x: number | null;
  floor_y: number | null;
  model_variant: string;
  enhancement_mode: EnhancementMode;
  roi: StationROI | null;
  status: StationStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StationCreate {
  name: string;
  location?: string | null;
  page_url?: string | null;
  model_variant?: string;
  enhancement_mode?: EnhancementMode;
  is_active?: boolean;
}

/** Live event pushed via WebSocket. */
export interface LiveEvent {
  type: "event";
  station_id: string;
  station_name?: string;
  state: ActivityState;
  ts: string;
  fps?: number;
  conf?: number;
}

export interface WSHello {
  type: "hello";
  user_id: string;
}

export interface WSPing {
  type: "ping";
}

export type WSMessage = LiveEvent | WSHello | WSPing;
