export interface WordItem {
  word: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
  emoji?: string;
  highlight?: boolean;
}

export interface SubtitleChunk {
  id: number;
  startFrame: number;
  endFrame: number;
  text: string;
  emoji?: string;
  words: WordItem[];
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
  title: string;
  highlightColor?: string;
  subtitles: SubtitleChunk[];
  infoCard?: InfoCardProps;
}
