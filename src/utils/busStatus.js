export function getBusStatus(bus) {
  if (!bus.updatedAt) {
    return bus.liveStatus || bus.status || "Not Started";
  }

  const fiveMinutes = 5 * 60 * 1000;
  const isOffline = Date.now() - bus.updatedAt > fiveMinutes;

  if (isOffline) {
    return "Offline";
  }

  return bus.liveStatus || bus.status || "Running";
}