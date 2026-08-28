/**
 * AI Reel Editor — Core TypeScript Schema
 * Defines the unified data contract between AI Director, Python Pipeline, and Remotion Renderer.
 */

export interface WordItem {
  word: string;
  start: number; // in seconds
  end: number; // in seconds
  startFrame: number;
  endFrame: number;
  emoji?: string | null;
  highlight?: boolean; // semantic emphasis decided by Director
  confidence?: number;
}

export interface SubtitleChunk {
  id: number;
  startFrame: number;
  endFrame: number;
  text: string;
  emoji?: string | null;
  words: WordItem[];
  emphasisLevel?: "normal" | "high" | "punchline";
}

export type CaptionTheme =
  | "box_glass"
  | "neon"
  | "bold_yellow"
  | "clean_white"
  | "cyber";

export interface CaptionStyleConfig {
  theme: CaptionTheme;
  fontFamily?: string;
  fontSize?: number;
  highlightColor?: string;
  activeWordColor?: string;
  inactiveWordColor?: string;
  positionBottom?: number; // Distance from bottom in px
  uppercase?: boolean; // false for Arabic
  direction?: "rtl" | "ltr";
}

export type OverlayType =
  | "card"
  | "hook_title"
  | "quote"
  | "stat"
  | "bullet_list"
  | "code"
  | "lower_third"
  | "badge";

export interface OverlayItem {
  id: string | number;
  type: OverlayType;
  startFrame: number;
  durationInFrames: number;
  title?: string;
  text?: string;
  items?: string[]; // for bullet lists
  statNumber?: string; // for stat callouts (e.g. "95%", "10x", "$50K")
  statLabel?: string;
  icon?: string;
  position?: "top" | "center" | "bottom";
  theme?: "glass" | "gradient" | "neon" | "minimal";
  codeSnippet?: string;
  codeLanguage?: string;
}

export type ZoomEventType =
  | "punch_in"
  | "slow_zoom"
  | "slow_zoom_in"
  | "slow_zoom_out"
  | "snap"
  | "shake";

export type ZoomType = ZoomEventType;

export interface ZoomEvent {
  id?: string | number;
  startFrame: number;
  durationInFrames?: number;
  endFrame?: number;
  scale: number; // e.g. 1.15 for punch-in
  originX?: string; // e.g. "50%"
  originY?: string; // e.g. "40%"
  type?: ZoomEventType;
  ease?: string;
  holdFrames?: number;
}

export interface ReframeEvent {
  startFrame: number;
  durationInFrames: number;
  centerX: number; // 0.0 - 1.0
  centerY: number; // 0.0 - 1.0
  scale?: number;
}

export interface MediaOverlay {
  id: string | number;
  src: string; // image or video path
  startFrame: number;
  durationInFrames: number;
  type?: "image" | "video" | "screenshot";
  position?: "top-right" | "top-left" | "center" | "bottom-right" | "bottom-left" | "pip" | "full";
  top?: number | string;
  right?: number | string;
  left?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  label?: string;
}

export interface SFXEvent {
  startFrame: number;
  src: string;
  volume?: number;
}

export interface AudioConfig {
  bgmSrc?: string;
  bgmVolume?: number; // e.g. 0.15
  duckingVolume?: number; // e.g. 0.04 during active speech
  fadeDurationFrames?: number;
  sfxEvents?: SFXEvent[];
}

export interface ProgressBarConfig {
  enabled: boolean;
  color?: string;
  gradientColors?: [string, string];
  height?: number;
  position?: "top" | "bottom";
}

export interface HookConfig {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  durationInFrames?: number;
}

export interface InfoCardProps {
  enabled: boolean;
  text: string;
  startFrame: number;
  durationInFrames: number;
}

export interface ReelProps {
  videoSrc?: string;
  durationInFrames: number;
  fps: number;
  width?: number;
  height?: number;
  title?: string;
  hook?: HookConfig;
  captionStyle?: CaptionStyleConfig;
  subtitles: SubtitleChunk[];
  overlays?: OverlayItem[];
  zoomEvents?: ZoomEvent[];
  reframeEvents?: ReframeEvent[];
  mediaOverlays?: MediaOverlay[];
  audio?: AudioConfig;
  progressBar?: ProgressBarConfig;
  
  // Backward compatibility
  highlightColor?: string;
  infoCard?: InfoCardProps;

  [key: string]: unknown;
}
