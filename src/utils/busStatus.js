export function getBusStatus(bus) {
  if (!bus.updatedAt) {
    return bus.liveStatus || bus.status || "Not Started";
  }

  // Temporary MVP setting:
  // Bus becomes offline only if location is older than 24 hours.
  // Later, after real GPS is added, we can change this to 2 minutes.
  const oneDay = 24 * 60 * 60 * 1000;

  const isOffline = Date.now() - bus.updatedAt > oneDay;

  if (isOffline) {
    return "Offline";
  }

  return bus.liveStatus || bus.status || "Running";
}