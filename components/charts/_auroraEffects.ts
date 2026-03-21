export function useAuroraPulse(triggeredLevel?: number) {
  let lastLevel = triggeredLevel;

  return {
    shouldFlash(newLevel?: number) {
      if (newLevel === undefined) return false;
      if (lastLevel === undefined) {
        lastLevel = newLevel;
        return false;
      }
      const changed = newLevel !== lastLevel;
      lastLevel = newLevel;
      return changed;
    }
  };
}
