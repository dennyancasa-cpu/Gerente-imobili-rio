import { useState, useEffect } from 'react';

export function useSnoozeAlerts() {
  const [snoozedAlerts, setSnoozedAlerts] = useState<Record<string, { timestamp: number }>>(() => {
    try {
      const saved = localStorage.getItem('imob_snoozed_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const snoozeAlert = (alertId: string) => {
    setSnoozedAlerts(prev => {
      const updated = { ...prev, [alertId]: { timestamp: Date.now() } };
      localStorage.setItem('imob_snoozed_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  const clearSnooze = (alertId: string) => {
    setSnoozedAlerts(prev => {
      const updated = { ...prev };
      delete updated[alertId];
      localStorage.setItem('imob_snoozed_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  // 48 hours = 48 * 60 * 60 * 1000 = 172800000 ms
  const isSnoozed = (alertId: string) => {
    const record = snoozedAlerts[alertId];
    if (!record) return false;
    const now = Date.now();
    const isActivelySnoozed = (now - record.timestamp) < 172800000;
    
    // Automatically clean up old ones? We can just return false
    return isActivelySnoozed;
  };

  const getSnoozeInfo = (alertId: string) => {
    return snoozedAlerts[alertId];
  };

  return { snoozeAlert, clearSnooze, isSnoozed, getSnoozeInfo };
}
