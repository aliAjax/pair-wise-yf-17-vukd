import type { PipeDef, PipeKind, ReedStatus, StopDef, Venue } from "./types";

// —— 预置：两场馆 ——
export const VENUES: Venue[] = [
  { id: "v-st-mary", name: "圣马利亚教堂", organ: "三排键机械管风琴" },
  { id: "v-city-hall", name: "市音乐厅", organ: "两排键电动管风琴" },
];

// —— 预置：三音栓 ——
export const STOPS: StopDef[] = [
  { id: "s-principal", venueId: "v-st-mary", name: "Principal 8'", label: "主音栓 8'", kind: "flue" },
  { id: "s-trumpet", venueId: "v-st-mary", name: "Trumpet 8'", label: "小号簧栓 8'", kind: "reed" },
  { id: "s-bourdon", venueId: "v-city-hall", name: "Bourdon 16'", label: "布尔登低音 16'", kind: "flue" },
];

function pipe(id: string, stopId: string, code: string, nominalHz: number): PipeDef {
  return { id, stopId, code, nominalHz };
}

// —— 预置：八根音管（3 + 2 + 3）——
export const PIPES: PipeDef[] = [
  pipe("p-pr-c4", "s-principal", "C4", 261.63),
  pipe("p-pr-e4", "s-principal", "E4", 329.63),
  pipe("p-pr-a4", "s-principal", "A4", 440.0),
  pipe("p-tr-cs4", "s-trumpet", "C#4", 277.18),
  pipe("p-tr-a4", "s-trumpet", "A4", 440.0),
  pipe("p-bo-c2", "s-bourdon", "C2", 65.41),
  pipe("p-bo-f2", "s-bourdon", "F2", 87.31),
  pipe("p-bo-g2", "s-bourdon", "G2", 98.0),
];

export function stopsOfVenue(venueId: string): StopDef[] {
  return STOPS.filter((s) => s.venueId === venueId);
}

export function pipesOfStop(stopId: string): PipeDef[] {
  return PIPES.filter((p) => p.stopId === stopId);
}

export function stopById(id: string): StopDef {
  const stop = STOPS.find((s) => s.id === id);
  if (!stop) throw new Error("未知音栓: " + id);
  return stop;
}

export function venueById(id: string): Venue {
  const venue = VENUES.find((v) => v.id === id);
  if (!venue) throw new Error("未知场馆: " + id);
  return venue;
}

export function defaultReed(kind: PipeKind): ReedStatus {
  return kind === "reed" ? "ok" : "none";
}

export const REED_OPTIONS: { value: ReedStatus; label: string }[] = [
  { value: "none", label: "无簧片（唇管）" },
  { value: "ok", label: "簧片正常" },
  { value: "tune", label: "簧片需微调" },
  { value: "aged", label: "簧片老化" },
];

export function reedLabel(status: ReedStatus): string {
  return REED_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export const STATUS_LABEL: Record<import("./types").MeasureStatus, string> = {
  unmeasured: "未测",
  measured: "已测",
  recheck: "待复测",
};
