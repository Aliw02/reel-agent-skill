/**
 * AI Reel Editor — Core TypeScript Schema (V3.0.0 Reference-Quality)
 * Canonical contract between Multimodal AI Director, Python Pipeline, and Remotion Renderer.
 */

export type SceneLayoutType =
  | "talking_head_full"
  | "talking_head_typography"
  | "stat_pip"
  | "split_screen"
  | "screen_demo"
  | "comparison_scene"
  | "fullscreen_broll"
  | "quote_scene"
  | "infographic_scene";

export type TransitionType =
  | "hard_cut"
  | "zoom_cut"
  | "glitch_slice"
  | "rgb_glitch"
  | "blur_wipe"
  | "whip_left"
  | "whip_right"
  | "flash"
  | "push"
  | "mask_reveal"
  | "none";

export interface TransitionConfig {
  type: TransitionType;
  startFrame: number;
  durationInFrames: number;
  intensity?: number;
  direction?: "left" | "right" | "up" | "down";
}

export interface WordItem {
  word: string;
  cleanWord?: string;
  start: number; // in seconds
  end: number; // in seconds
  startFrame: number;
  endFrame: number;
  emoji?: string | null;
  highlight?: boolean; // semantic emphasis decided by Director
  role?: "normal" | "numeric" | "keyword" | "vocal_stress";
  confidence?: number;
}

export interface SubtitleChunk {
  id: number;
  startFrame: number;
  endFrame: number;
  text: string;
  translation?: string; // Secondary English translation underneath
  emoji?: string | null;
  words: WordItem[];
  emphasisLevel?: "normal" | "high" | "punchline";
  hasNumeric?: boolean;
  hasKeyword?: boolean;
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
  secondaryFontFamily?: string;
  secondaryFontSize?: number;
  secondaryColor?: string;
  highlightColor?: string;
  activeWordColor?: string;
  inactiveWordColor?: string;
  positionBottom?: number; // Distance from bottom in px
  uppercase?: boolean; // false for Arabic
  direction?: "rtl" | "ltr";
  animation?: "bounce" | "fade" | "scale" | "none";
}

export interface AnimatedCounterConfig {
  startVal: number;
  endVal: number;
  prefix?: string; // e.g. "$"
  suffix?: string; // e.g. "%", "k", " ضعف"
  decimals?: number;
  title?: string;
  subtitle?: string;
  beforeVal?: string; // e.g. "$100" -> "$20"
  durationInFrames?: number;
}

export interface BackgroundTypographyConfig {
  text: string;
  subText?: string;
  glowColor?: string;
  fontSize?: number;
  opacity?: number;
  blur?: number;
  animate?: boolean;
}

export interface WaveformConfig {
  enabled: boolean;
  color?: string;
  barsCount?: number;
  position?: "bottom" | "top" | "center";
}

export interface CalloutItem {
  id: string | number;
  type: "arrow" | "circle" | "badge" | "checkmark" | "cross";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size?: number;
  color?: string;
  label?: string;
  startFrame: number;
  durationInFrames: number;
}

export interface SubjectTrackingFrame {
  frame: number;
  faceBox?: [number, number, number, number]; // [x, y, w, h] normalized 0.0-1.0
  faceCenter?: [number, number]; // [x, y] normalized
  personBox?: [number, number, number, number];
  headRoom?: number;
  safeNegativeZone?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center";
  confidence?: number;
}

export interface SubjectTrackingData {
  fps: number;
  width: number;
  height: number;
  frames: SubjectTrackingFrame[];
  averageFaceCenter?: [number, number];
}

export interface ScreenRoiEvent {
  startFrame: number;
  durationInFrames: number;
  roiBox: [number, number, number, number]; // [x, y, w, h] normalized 0.0-1.0
  zoomLevel: number; // e.g. 1.8
  label?: string;
}

export interface SceneItem {
  id: string;
  startFrame: number;
  endFrame: number;
  durationInFrames?: number;
  layout: SceneLayoutType;
  intent?: string; // e.g. "hook", "statistic", "screen_demo", "comparison"
  energy?: "high" | "medium" | "low";
  transitionIn?: TransitionType;
  transitionOut?: TransitionType;
  transitionInDuration?: number;
  transitionOutDuration?: number;
  
  // Scene-specific data
  backgroundTypography?: BackgroundTypographyConfig;
  animatedCounter?: AnimatedCounterConfig;
  screenRoi?: ScreenRoiEvent;
  comparisonData?: {
    itemA: { title: string; subtitle?: string; value?: string; imageSrc?: string };
    itemB: { title: string; subtitle?: string; value?: string; imageSrc?: string };
  };
  brollSrc?: string;
  pipVideoSrc?: string;
  
  // Camera & Tracking override
  cameraScale?: number;
  focalPoint?: [number, number];
  
  reason?: string; // Machine-readable reasoning for AI Director trace
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
  cutout?: boolean; // transparent background cutout
}

export interface SFXEvent {
  startFrame: number;
  src: string;
  volume?: number;
  category?: "whoosh" | "impact" | "pop" | "click" | "glitch";
}

export interface AudioConfig {
  bgmSrc?: string;
  bgmVolume?: number; // e.g. 0.15
  duckingVolume?: number; // e.g. 0.04 during active speech
  duckedVolume?: number; // Alias for backward compatibility
  duckingEnabled?: boolean;
  fadeDurationFrames?: number;
  normalizedLoudnessLufs?: number;
  sfxEvents?: SFXEvent[];
}

export interface ProgressBarConfig {
  enabled: boolean;
  color?: string;
  gradientColors?: [string, string] | [string, string, string];
  height?: number;
  position?: "top" | "bottom";
}

export interface HookConfig {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  durationInFrames?: number;
}

export type ColorPreset =
  | "modern_tech"
  | "warm_creator"
  | "clean_creator"
  | "cinematic_soft"
  | "high_energy_social"
  | "none";

export interface ColorGradeConfig {
  preset?: ColorPreset;
  exposure?: number; // -1.0 to 1.0
  contrast?: number; // 0.5 to 1.5
  saturation?: number; // 0.0 to 2.0
  vignette?: boolean;
  vignetteIntensity?: number;
}

export interface SafeZoneConfig {
  platform?: "tiktok" | "instagram_reels" | "youtube_shorts" | "generic_916";
  topExclusionPx?: number;
  bottomExclusionPx?: number;
  rightExclusionPx?: number;
}

export interface EditPlanV3 {
  version: string;
  videoSrc?: string;
  cutoutVideoSrc?: string; // Alpha mask / keyed cutout video for depth layering
  durationInFrames: number;
  totalFrames?: number; // Backwards compatibility
  fps: number;
  width?: number;
  height?: number;
  
  title?: string;
  hook?: HookConfig;
  captionStyle?: CaptionStyleConfig;
  subtitles: SubtitleChunk[];
  
  // Scene-First V3 Architecture
  scenes?: SceneItem[];
  
  // Transitions & Motion
  transitions?: TransitionConfig[];
  callouts?: CalloutItem[];
  waveform?: WaveformConfig;
  
  // Overlays & Layers
  overlays?: OverlayItem[];
  mediaOverlays?: MediaOverlay[];
  
  // Camera & Tracking
  zoomEvents?: ZoomEvent[];
  reframeEvents?: ReframeEvent[];
  subjectTracking?: SubjectTrackingData;
  
  // Audio & Grade
  audio?: AudioConfig;
  color?: ColorGradeConfig;
  progressBar?: ProgressBarConfig;
  safeZones?: SafeZoneConfig;
  
  // Backward compatibility
  highlightColor?: string;
  infoCard?: any;

  // Browser-safe asset resolution
  assetBaseUrl?: string;

  [key: string]: unknown;
}

export interface InfoCardProps {
  enabled: boolean;
  text: string;
  startFrame: number;
  durationInFrames: number;
  icon?: string;
  theme?: string;
}

export type ReelProps = EditPlanV3;
