import { requireOptionalNativeModule } from 'expo';

type NativeModule = {
  start(configJson: string): void;
  refresh(): void;
  stop(): void;
  isShowing(): boolean;
};

/** null on iOS, web and Expo Go — callers treat it as optional. */
const native = requireOptionalNativeModule<NativeModule>('CadenceLiveNotification');

export type LiveFastZone = { startMinutes: number; label: string; color: string };

type LiveCommon = {
  title: string;
  accentColor: string;
  scheme: string;
  /** Android 14+ lets users swipe ongoing notifications away; re-post if true. */
  repostOnDismiss: boolean;
};

/** Counts up from the start of the fast, with an "End fast" action. */
export type LiveFastConfig = LiveCommon & {
  mode: 'fast';
  startedAt: number;
  goalMinutes: number;
  zones: LiveFastZone[];
};

/** Counts down to the end of the eating window, with a "Start fast" action; removes itself at the end. */
export type LiveEatingConfig = LiveCommon & {
  mode: 'eating';
  /** When the window opened (the end of the last fast). */
  startedAt: number;
  endsAt: number;
};

export const CadenceLiveNotification = {
  isAvailable: native !== null,
  start(config: LiveFastConfig | LiveEatingConfig) {
    native?.start(JSON.stringify(config));
  },
  refresh() {
    native?.refresh();
  },
  stop() {
    native?.stop();
  },
  isShowing(): boolean {
    return native?.isShowing() ?? false;
  },
};
