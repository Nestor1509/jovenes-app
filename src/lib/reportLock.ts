export function reportLockKey(dateISO: string): string {
  return `report_lock_${dateISO}`;
}

export function isReportLockedToday(dateISO: string): boolean {
  try {
    return localStorage.getItem(reportLockKey(dateISO)) === "1";
  } catch {
    return false;
  }
}

export function setReportLocked(dateISO: string, locked: boolean): void {
  try {
    if (locked) localStorage.setItem(reportLockKey(dateISO), "1");
    else localStorage.removeItem(reportLockKey(dateISO));
  } catch {
    // ignore
  }
  notifyReportLockChanged();
}

export function notifyReportLockChanged(): void {
  try {
    window.dispatchEvent(new Event("report_lock_changed"));
  } catch {
    // ignore
  }
}

export const REPORT_LOCK_CHANGED_EVENT = "report_lock_changed" as const;
