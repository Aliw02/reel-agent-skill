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

export interface ZoomEvent {
  id?: string | number;
  startFrame: number;
  durationInFrames: number;
  scale: number; // e.g. 1.15 for punch-in
  originX?: string; // e.g. "50%"
  originY?: string; // e.g. "40%"
  type?: "punch_in" | "slow_zoom" | "snap";
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
  type: "image" | "video" | "screenshot";
  position?: "center" | "pip" | "full";
  borderRadius?: number;
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
  infoCard?: {
    enabled: boolean;
    text: string;
    startFrame: number;
    durationInFrames: number;
  };
}
