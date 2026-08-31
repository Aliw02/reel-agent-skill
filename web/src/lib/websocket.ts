export type WSEventType =
  | "stage_update"
  | "progress_log"
  | "copilot_token"
  | "copilot_action"
  | "job_complete"
  | "error";

export interface WSEvent {
  type: WSEventType;
  payload: unknown;
}

type Listener = (event: WSEvent) => void;

export function connectJobSocket(
  jobId: string,
  onEvent: Listener,
  onError?: (err: Event) => void
): WebSocket {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const ws = new WebSocket(`${baseUrl}/ws/jobs/${jobId}`);

  ws.onmessage = (msg) => {
    try {
      const event: WSEvent = JSON.parse(msg.data);
      onEvent(event);
    } catch {
      // ignore malformed frames
    }
  };

  ws.onerror = onError ?? (() => {});

  return ws;
}
