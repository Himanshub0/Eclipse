/**
 * IPC channel definitions and strict runtime payload validators.
 */

export const IPC_CHANNELS = {
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  RELOAD: 'browser:reload',
  GET_STATE: 'browser:get-state',
  STATE_CHANGED: 'browser:state-changed',
  SET_TOOLBAR_HEIGHT: 'browser:set-toolbar-height',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/**
 * Validates that an incoming URL argument is a valid string within reasonable length.
 */
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

/**
 * Validates toolbar height integer within safe bounds.
 */
export function validateHeightPayload(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Invalid height payload: expected finite number, received ${typeof value}`);
  }
  const clamped = Math.round(value);
  if (clamped < 30 || clamped > 300) {
    throw new RangeError(`Toolbar height ${clamped} out of permitted range [30, 300]`);
  }
  return clamped;
}
