// 共享数据模型：场馆 / 音栓 / 音管目录 + 维护运行时状态

export type ReedStatus = "无簧片" | "正常" | "需微调" | "待清洁" | "更换";

export type StopKind = "主音栓" | "簧片音栓" | "混合音栓" | "低音管";

export interface Venue {
  id: string;
  name: string;
  place: string;
}

export interface StopDef {
  id: string;
  venueId: string;
  name: string;
  kind: StopKind;
  rank: string;
  note: string;
}

export interface PipeDef {
  id: string;
  stopId: string;
  venueId: string;
  code: string;
  pitchName: string;
  /** 标称频率 Hz（A4 = 440 Hz） */
  frequency: number;
  /** 是否为簧片音管（非簧片管簧片状态固定为“无簧片”） */
  reed: boolean;
}

/** 单管单次测量记录。sealed=true 表示因环境读数变化被只读封存的原值 */
export interface Measurement {
  id: string;
  time: string;
  deviation: number; // 音分偏差 cent
  measuredFrequency: number; // Hz
  reedStatus: ReedStatus;
  note: string;
  sealed: boolean;
}

/** 一次环境读数（温度 °C / 湿度 %） */
export interface Reading {
  id: string;
  time: string;
  temperature: number;
  humidity: number;
  note: string;
}

export interface PipeRuntime {
  measurements: Measurement[]; // 按时间正序，最后一条为当前值
}

export interface VenueRuntime {
  readings: Reading[]; // 按时间正序，第一条为维护基准读数
  pipes: Record<string, PipeRuntime>;
}

export interface ReportCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface ReportPipeRow {
  pipe: PipeDef;
  measurement: Measurement | null;
  status: "待测" | "已测" | "待复测";
  abnormal: boolean;
}

/** 音栓单次维护报告（由当前数据实时投影，偏差表 / 异常标记与它同源同步） */
export interface StopReport {
  venueId: string;
  stopId: string;
  readings: Reading[];
  baseline: Reading | null;
  temperaturePct: number | null;
  humidityPct: number | null;
  rows: ReportPipeRow[];
  total: number;
  measuredCount: number;
  pendingRetest: number;
  abnormalCount: number;
  checks: ReportCheck[];
  canClose: boolean;
}

/** 结项后冻结的存档报告 */
export interface ArchivedReport extends StopReport {
  id: string;
  archivedAt: string;
}

export interface PersistState {
  runtime: Record<string, VenueRuntime>;
  archives: ArchivedReport[];
}

export interface MeasurementInput {
  deviation: number;
  reedStatus: ReedStatus;
  note: string;
}

export interface ReadingInput {
  time: string;
  temperature: number;
  humidity: number;
  note: string;
}
