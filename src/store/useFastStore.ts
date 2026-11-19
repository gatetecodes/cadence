import { create } from 'zustand';

import { badgesRepo, fastsRepo, resetAll, settingsRepo, waterRepo } from '../db/repo';
import { earnedBadges, type BadgeKey } from '../engine/badges';
import { eatingSnapshot, validateTimes, type Fast, type ValidationError } from '../engine/fast';
import { DEFAULT_NOTIFICATION_PREFS, planNotifications, type NotificationPrefs } from '../engine/notificationPlan';
import { clampCustomGoalMinutes, CUSTOM_PLAN_ID, DEFAULT_PLAN_ID, planById } from '../engine/plans';
import { addDays, startOfDay } from '../engine/time';
import { hideLive, showLiveEating, showLiveFast } from '../live/liveSurface';
import { applyPlan, ensurePermission, setDailyReminder } from '../notifications/scheduler';

export type Settings = {
  /** The last preset plan chosen. Still set while a custom goal is in use. */
  planId: string;
  /** Custom goal in minutes; null means "use the plan's hours". Set from Plans or Settings. */
  customGoalMinutes: number | null;
  waterGoalMl: number;
  notifications: NotificationPrefs;
  dailyReminder: { hour: number; minute: number } | null;
  repostLiveOnDismiss: boolean;
  /** Keep a countdown to the next fast on the lock screen during the eating window. */
  liveEatingWindow: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  planId: DEFAULT_PLAN_ID,
  customGoalMinutes: null,
  waterGoalMl: 2500,
  notifications: DEFAULT_NOTIFICATION_PREFS,
  dailyReminder: null,
  repostLiveOnDismiss: false,
  liveEatingWindow: true,
};

type State = {
  ready: boolean;
  active: Fast | null;
  fasts: Fast[];
  settings: Settings;
  waterTodayMl: number;
  badges: Set<string>;
  /** Badges earned by the action that just happened, for the celebration sheet. */
  freshBadges: BadgeKey[];
  /** The fast that just ended, for the celebration state on Home. */
  justEnded: Fast | null;
};

type Actions = {
  init(): void;
  startFast(startedAt?: number): Promise<void>;
  endFast(endedAt?: number): Promise<Fast | null>;
  editActiveStart(startedAt: number): ValidationError | null;
  editFast(id: number, startedAt: number, endedAt: number): ValidationError | null;
  deleteFast(id: number): void;
  setPlan(planId: string): void;
  /** Switches to a custom goal (clamped to whole hours in range). Moves a running fast's goal too. */
  setCustomGoal(minutes: number): void;
  updateSettings(patch: Partial<Settings>): void;
  /** Deletes every fast, water log, badge and setting, and clears all scheduled alerts. */
  eraseAllData(): Promise<void>;
  addWater(ml?: number): void;
  undoWater(): void;
  dismissCelebration(): void;
  /** Re-sync notifications and live surfaces, e.g. when the app returns to the foreground. */
  resync(): Promise<void>;
};

export const goalMinutesFor = (s: Settings) => s.customGoalMinutes ?? planById(s.planId).fastHours * 60;

/** Plan id to record on a new fast: the preset, or "custom" when a custom goal is set. */
export const planIdFor = (s: Settings) => (s.customGoalMinutes !== null ? CUSTOM_PLAN_ID : s.planId);

function loadWaterToday(): number {
  const now = Date.now();
  return waterRepo.totalMl(startOfDay(now), addDays(now, 1));
}

export const useFastStore = create<State & Actions>((set, get) => {
  /** Reload derived lists from the database after any write. */
  const reload = () => {
    set({
      active: fastsRepo.active(),
      fasts: fastsRepo.list(),
      waterTodayMl: loadWaterToday(),
      badges: badgesRepo.keys(),
    });
  };

  const awardBadges = (fastId: number | null): BadgeKey[] => {
    const have = badgesRepo.keys();
    const fresh = [...earnedBadges(fastsRepo.list(), Date.now())].filter((k) => !have.has(k));
    fresh.forEach((k) => badgesRepo.award(k, fastId));
    return fresh;
  };

  const sync = async () => {
    const { active, fasts, settings } = get();
    const now = Date.now();
    const plan = planNotifications(active, fastsRepo.lastFinished(), settings.notifications, now);
    await applyPlan(plan).catch((e) => console.warn('[cadence] scheduling failed', e));

    // The live surface follows the fast, then the eating window after it, then steps aside.
    const opts = { repostOnDismiss: settings.repostLiveOnDismiss };
    const eating = active ? null : eatingSnapshot(fasts, now);
    try {
      if (active) await showLiveFast(active, opts);
      else if (eating && !eating.closed && settings.liveEatingWindow) await showLiveEating(eating, opts);
      else await hideLive();
    } catch (e) {
      console.warn('[cadence] live surface failed', e);
    }
  };

  /** Changing the plan or goal mid-fast moves the running fast's goal too. */
  const applyGoalToActive = () => {
    const { active, settings } = get();
    if (!active) return;
    fastsRepo.update(active.id, { planId: planIdFor(settings), goalMinutes: goalMinutesFor(settings) });
    reload();
    void sync();
  };

  return {
    ready: false,
    active: null,
    fasts: [],
    settings: DEFAULT_SETTINGS,
    waterTodayMl: 0,
    badges: new Set(),
    freshBadges: [],
    justEnded: null,

    init() {
      const stored = settingsRepo.get<Partial<Settings>>('settings', {});
      set({ settings: { ...DEFAULT_SETTINGS, ...stored }, ready: true });
      reload();
      void sync();
    },

    async startFast(startedAt = Date.now()) {
      if (get().active) return;
      const { settings } = get();
      fastsRepo.start({ planId: planIdFor(settings), goalMinutes: goalMinutesFor(settings), startedAt });
      set({ justEnded: null, freshBadges: [] });
      reload();
      await ensurePermission();
      await sync();
    },

    async endFast(endedAt = Date.now()) {
      const { active } = get();
      if (!active) return null;
      const end = Math.max(endedAt, active.startedAt + 1000);
      fastsRepo.end(active.id, end);
      const ended = { ...active, endedAt: end };
      const fresh = awardBadges(active.id);
      reload();
      set({ justEnded: ended, freshBadges: fresh });
      await sync();
      return ended;
    },

    editActiveStart(startedAt) {
      const { active } = get();
      if (!active) return null;
      const err = validateTimes(startedAt, null, Date.now());
      if (err) return err;
      fastsRepo.update(active.id, { startedAt });
      reload();
      void sync();
      return null;
    },

    editFast(id, startedAt, endedAt) {
      const err = validateTimes(startedAt, endedAt, Date.now());
      if (err) return err;
      fastsRepo.update(id, { startedAt, endedAt });
      const { justEnded } = get();
      if (justEnded?.id === id) set({ justEnded: { ...justEnded, startedAt, endedAt } });
      reload();
      void sync();
      return null;
    },

    deleteFast(id) {
      fastsRepo.remove(id);
      reload();
      void sync();
    },

    setPlan(planId) {
      get().updateSettings({ planId, customGoalMinutes: null });
      applyGoalToActive();
    },

    setCustomGoal(minutes) {
      get().updateSettings({ customGoalMinutes: clampCustomGoalMinutes(minutes) });
      applyGoalToActive();
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      settingsRepo.set('settings', settings);
      set({ settings });
      if ('dailyReminder' in patch) void setDailyReminder(settings.dailyReminder);
      if ('notifications' in patch || 'repostLiveOnDismiss' in patch || 'liveEatingWindow' in patch) void sync();
    },

    async eraseAllData() {
      resetAll();
      // The settings rows are gone; drop the in-memory copy too, or the next change would write it back.
      set({ settings: DEFAULT_SETTINGS, justEnded: null, freshBadges: [] });
      reload();
      await setDailyReminder(null).catch((e) => console.warn('[cadence] clearing reminder failed', e));
      await sync();
    },

    addWater(ml = 250) {
      waterRepo.add(ml);
      set({ waterTodayMl: loadWaterToday() });
    },

    undoWater() {
      const now = Date.now();
      waterRepo.undoLast(startOfDay(now), addDays(now, 1));
      set({ waterTodayMl: loadWaterToday() });
    },

    dismissCelebration() {
      set({ justEnded: null, freshBadges: [] });
    },

    async resync() {
      reload();
      await sync();
    },
  };
});
