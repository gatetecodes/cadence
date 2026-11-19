import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '../../components/Icon';
import { Text } from '../../components/Text';
import { PillButton, Stepper } from '../../components/ui';
import { CUSTOM_GOAL_HOURS, CUSTOM_PLAN_ID, planById, PLANS, ratioFor, type PlanLevel } from '../../engine/plans';
import { useFastStore } from '../../store/useFastStore';
import { colors, shadow } from '../../theme/tokens';

type Filter = 'all' | PlanLevel;
const FILTERS: { id: Filter; label: string; dot: string }[] = [
  { id: 'all', label: 'All', dot: colors.orange },
  { id: 'beginner', label: 'Beginner', dot: colors.green },
  { id: 'intermediate', label: 'Intermediate', dot: colors.yellow },
  { id: 'advanced', label: 'Advanced', dot: colors.lavender },
];

function MiniRing({ fraction, dark }: { fraction: number; dark?: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={r} fill="none" stroke={dark ? 'rgba(246,241,234,0.25)' : 'rgba(255,255,255,0.55)'} strokeWidth={7} />
      <Circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        stroke={dark ? colors.inkOnDark : colors.ink}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${fraction * c} ${c}`}
        rotation={-90}
        origin="24, 24"
      />
    </Svg>
  );
}

export default function Plans() {
  const insets = useSafeAreaInsets();
  const planId = useFastStore((s) => s.settings.planId);
  const customGoalMinutes = useFastStore((s) => s.settings.customGoalMinutes);
  const active = useFastStore((s) => s.active);
  const setPlan = useFastStore((s) => s.setPlan);
  const setCustomGoal = useFastStore((s) => s.setCustomGoal);
  // What is in effect now: a preset id, or "custom" with its hours.
  const current = customGoalMinutes !== null ? CUSTOM_PLAN_ID : planId;
  const currentCustomH = customGoalMinutes !== null ? customGoalMinutes / 60 : null;
  // Unsaved choice on this screen; null follows the store, so changes made in Settings show up here.
  const [draft, setDraft] = useState<{ id: string; customH: number } | null>(null);
  const selected = draft?.id ?? current;
  const customH = draft?.customH ?? currentCustomH ?? planById(planId).fastHours;
  const [filter, setFilter] = useState<Filter>('all');
  const visible = PLANS.filter((p) => filter === 'all' || p.level === filter);

  const isCustom = selected === CUSTOM_PLAN_ID;
  const chosenRatio = isCustom ? ratioFor(customH * 60) : planById(selected).ratio;
  const unchanged = isCustom ? current === CUSTOM_PLAN_ID && currentCustomH === customH : selected === current;
  const pickCustom = (h: number) => setDraft({ id: CUSTOM_PLAN_ID, customH: h });

  return (
    <View style={{ flex: 1, backgroundColor: colors.sage }}>
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 190 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <Text variant="display" style={{ fontSize: 38 }}>
            Pick your rhythm
          </Text>
          <Text variant="body" style={{ color: '#55613A' }}>
            Switch anytime. Your streak stays with you.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
          {FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f.id)}
                style={[styles.filter, on ? { backgroundColor: colors.ink, borderColor: colors.ink } : null]}
              >
                <View style={[styles.filterDot, { backgroundColor: f.dot }]} />
                <Text variant="label" style={{ fontSize: 15, color: on ? colors.inkOnDark : colors.ink }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {visible.map((p) => {
            const on = p.id === selected;
            const fg = p.dark ? colors.inkOnDark : colors.ink;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setDraft({ id: p.id, customH });
                }}
                style={[
                  styles.card,
                  { backgroundColor: p.color, borderColor: on ? colors.ink : 'transparent' },
                  on && styles.cardOn,
                ]}
              >
                <Text variant="number" style={{ width: 82, fontSize: 30, color: fg }}>
                  {p.ratio}
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowGap}>
                    <Text variant="label" style={{ fontSize: 17, color: fg }}>
                      {p.name}
                    </Text>
                    {p.popular && (
                      <View style={styles.popular}>
                        <Text variant="label" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                          POPULAR
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="caption" style={{ color: fg, opacity: 0.85 }}>
                    {p.fastHours}h fast · {24 - p.fastHours}h eating
                  </Text>
                </View>
                <View>
                  <MiniRing fraction={p.fastHours / 24} dark={p.dark} />
                  {on && (
                    <View style={styles.check}>
                      <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3.2} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {filter === 'all' && (
            <View style={[styles.card, styles.customCard, { borderColor: isCustom ? colors.ink : 'transparent' }, isCustom && styles.cardOn]}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isCustom }}
                accessibilityLabel={`Custom goal, ${customH} hours fasting`}
                onPress={() => {
                  void Haptics.selectionAsync();
                  pickCustom(customH);
                }}
                style={styles.customPick}
              >
                <Text variant="number" style={{ width: 82, fontSize: 30 }}>
                  {ratioFor(customH * 60)}
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="label" style={{ fontSize: 17 }}>
                    Custom
                  </Text>
                  <Text variant="caption" style={{ color: colors.ink, opacity: 0.85 }}>
                    {customH}h fast · {24 - customH}h eating
                  </Text>
                </View>
              </Pressable>
              <Stepper
                bg={colors.sage}
                decrementLabel="Shorter custom goal"
                incrementLabel="Longer custom goal"
                canDecrement={customH > CUSTOM_GOAL_HOURS.min}
                canIncrement={customH < CUSTOM_GOAL_HOURS.max}
                onDecrement={() => pickCustom(customH - 1)}
                onIncrement={() => pickCustom(customH + 1)}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 100 }]}>
        <PillButton
          label={unchanged ? `On the ${chosenRatio} plan` : `Switch to ${chosenRatio}${active ? ' now' : ''}`}
          icon="arrow-right"
          onPress={() => {
            if (!unchanged) {
              if (isCustom) setCustomGoal(customH * 60);
              else setPlan(selected);
            }
            setDraft(null);
            router.navigate('/');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 14 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filter: {
    height: 44,
    borderRadius: 22,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.sageLine,
    backgroundColor: colors.surface,
  },
  filterDot: { width: 24, height: 24, borderRadius: 12 },
  card: {
    height: 84,
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 3,
  },
  cardOn: { ...shadow.raised },
  customCard: { backgroundColor: colors.surface, paddingLeft: 0 },
  customPick: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 20 },
  popular: { height: 22, borderRadius: 11, backgroundColor: colors.surface, paddingHorizontal: 8, justifyContent: 'center' },
  check: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 0 },
});
