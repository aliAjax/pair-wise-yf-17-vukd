import type { PipeDef, StopDef, Venue } from "../types";

// 预置：两场馆、三音栓、八根音管
export const VENUES: Venue[] = [
  { id: "v-st-mary", name: "St. Mary 教堂", place: "教堂" },
  { id: "v-concert-hall", name: "城市音乐厅", place: "音乐厅" },
];

export const STOPS: StopDef[] = [
  {
    id: "s-principal",
    venueId: "v-st-mary",
    name: "Principal 8'",
    kind: "主音栓",
    rank: "8 呎",
    note: "开放式金属主音管，为整组音栓的音准基准",
  },
  {
    id: "s-trumpet",
    venueId: "v-st-mary",
    name: "Trumpet 8'",
    kind: "簧片音栓",
    rank: "8 呎",
    note: "簧片音栓，调音时需同时记录簧片状态",
  },
  {
    id: "s-bourdon",
    venueId: "v-concert-hall",
    name: "Bourdon 16'",
    kind: "低音管",
    rank: "16 呎",
    note: "闭管低音音栓，实际音高比标称量低八度",
  },
];

export const PIPES: PipeDef[] = [
  // St. Mary 教堂 · Principal 8'（3 根）
  { id: "p-prin-c4", stopId: "s-principal", venueId: "v-st-mary", code: "01", pitchName: "C4", frequency: 261.63, reed: false },
  { id: "p-prin-e4", stopId: "s-principal", venueId: "v-st-mary", code: "02", pitchName: "E4", frequency: 329.63, reed: false },
  { id: "p-prin-a4", stopId: "s-principal", venueId: "v-st-mary", code: "03", pitchName: "A4", frequency: 440.0, reed: false },
  // St. Mary 教堂 · Trumpet 8'（2 根，簧片）
  { id: "p-trump-cs4", stopId: "s-trumpet", venueId: "v-st-mary", code: "01", pitchName: "C♯4", frequency: 277.18, reed: true },
  { id: "p-trump-g4", stopId: "s-trumpet", venueId: "v-st-mary", code: "02", pitchName: "G4", frequency: 392.0, reed: true },
  // 城市音乐厅 · Bourdon 16'（3 根，低音闭管）
  { id: "p-bour-c2", stopId: "s-bourdon", venueId: "v-concert-hall", code: "01", pitchName: "C2", frequency: 65.41, reed: false },
  { id: "p-bour-g2", stopId: "s-bourdon", venueId: "v-concert-hall", code: "02", pitchName: "G2", frequency: 98.0, reed: false },
  { id: "p-bour-c3", stopId: "s-bourdon", venueId: "v-concert-hall", code: "03", pitchName: "C3", frequency: 130.81, reed: false },
];

export const stopsOfVenue = (venueId: string) =>
  STOPS.filter((stop) => stop.venueId === venueId);

export const pipesOfStop = (stopId: string) =>
  PIPES.filter((pipe) => pipe.stopId === stopId);

export const venueName = (venueId: string) =>
  VENUES.find((venue) => venue.id === venueId)?.name ?? venueId;

export const stopDef = (stopId: string) =>
  STOPS.find((stop) => stop.id === stopId);
