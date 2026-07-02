// ── STREAK SINGLE-CREDIT (H3) ──
// The streak used to be incremented by three independent mechanisms (load-time
// rollover, toggleCheck rollover, and every completed Fajr→Isha cycle), which
// could award multiple +1s for the same real day. Every increment now flows
// through applyStreakCredit, which credits a given calendar day AT MOST ONCE.
// Keys are local "YYYY-MM-DD" so lexicographic order == chronological order.

// state: { streak: number, lastCredit: "YYYY-MM-DD" | null }
export function applyStreakCredit(state, creditDayKey) {
  const s = { streak: state?.streak || 0, lastCredit: state?.lastCredit || null };
  if (!creditDayKey || !/^\d{4}-\d{2}-\d{2}$/.test(creditDayKey)) {
    return { ...s, applied: false };
  }
  // Only strictly-newer days may be credited — a day already credited (by the
  // Isha cycle, or by a rollover check) can never be credited again, and
  // out-of-order/backdated credits are ignored.
  if (s.lastCredit && creditDayKey <= s.lastCredit) {
    return { ...s, applied: false };
  }
  return { streak: s.streak + 1, lastCredit: creditDayKey, applied: true };
}

// A missed day breaks the streak. lastCredit is preserved so the broken day
// can still never be double-credited afterwards.
export function breakStreak(state) {
  return { streak: 0, lastCredit: state?.lastCredit || null, applied: false };
}
