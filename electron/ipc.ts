/**
 * IPC channel definitions and runtime payload validators for Eclipse.
 */

export const IPC_CHANNELS = {
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  RELOAD: 'browser:reload',
  CREATE_TAB: 'browser:create-tab',
  CLOSE_TAB: 'browser:close-tab',
  SWITCH_TAB: 'browser:switch-tab',
  GET_STATE: 'browser:get-state',
  STATE_CHANGED: 'browser:state-changed',
  SET_LAYOUT_BOUNDS: 'browser:set-layout-bounds',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export function validateUrlPayload(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid URL payload: expected string, received ${typeof value}`);
  }
  const trimmed = value.trim();
  if (trimmed.length > 4096) {
    throw new RangeError('URL payload exceeds maximum permitted length of 4096 characters');
  }
  return trimmed;
}

export function validateTabIdPayload(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid tab ID payload: expected string, received ${typeof value}`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new RangeError('Tab ID must be a non-empty string <= 64 characters');
  }
  return trimmed;
}

export function validateLayoutBoundsPayload(value: unknown): {
  sidebarWidth: number;
  topBarHeight: number;
} {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Layout payload must be an object');
  }
  const obj = value as Record<string, unknown>;
  const sidebarWidth = Number(obj.sidebarWidth);
  const topBarHeight = Number(obj.topBarHeight);

  if (!Number.isFinite(sidebarWidth) || sidebarWidth < 0 || sidebarWidth > 600) {
    throw new RangeError(`Invalid sidebar width ${sidebarWidth}`);
  }
  if (!Number.isFinite(topBarHeight) || topBarHeight < 0 || topBarHeight > 300) {
    throw new RangeError(`Invalid top bar height ${topBarHeight}`);
  }

  return {
    sidebarWidth: Math.round(sidebarWidth),
    topBarHeight: Math.round(topBarHeight),
  };
}
