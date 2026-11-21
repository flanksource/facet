export interface ColorLocation {
  type: 'pdf' | 'docx' | 'png';
  page?: number;
  object?: string;
  operator?: number;
  part?: string;
  elementPath?: string;
  bounds?: { x: number; y: number; width: number; height: number };
}
export interface ColorEntry {
  value?: string;
  kind?: string;
  rgba?: number[];
  pixels?: number;
  percentage?: number;
  modifiers?: Record<string, string>;
  locations?: ColorLocation[];
}
export interface ColorInventory {
  space?: string;
  conversion?: string;
  approximate: boolean;
  limit?: number;
  entries: ColorEntry[];
}
