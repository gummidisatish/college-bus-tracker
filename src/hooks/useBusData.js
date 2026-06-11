import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function useBusData() {
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [buses, setBuses] = useState([]);
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collegeRef = ref(db, "collegeInfo");
    const busesRef = ref(db, "buses");
    const locationsRef = ref(db, "locations");

    const unsubscribeCollege = onValue(collegeRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setCollegeInfo(null);
        return;
      }

      setCollegeInfo({
        ...data,
        location: {
          lat: toNumber(data?.location?.lat),
          lng: toNumber(data?.location?.lng),
        },
      });
    });

    const unsubscribeBuses = onValue(busesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const busArray = Object.values(data);
      setBuses(busArray);
      setLoading(false);
    });

    const unsubscribeLocations = onValue(locationsRef, (snapshot) => {
      setLocations(snapshot.val() || {});
    });

    return () => {
      unsubscribeCollege();
      unsubscribeBuses();
      unsubscribeLocations();
    };
  }, []);

  const busesWithLocations = buses.map((bus) => {
    const location = locations[bus.id];

    const lat = toNumber(location?.lat);
    const lng = toNumber(location?.lng);

    const hasValidLocation = lat !== null && lng !== null;

    return {
      ...bus,
      currentLocation: hasValidLocation
        ? {
            lat,
            lng,
          }
        : null,
      liveStatus: location?.status || bus.status || "Not Started",
      speed: location?.speed || 0,
      updatedAt: location?.updatedAt || null,
    };
  });

  return {
    collegeInfo,
    buses: busesWithLocations,
    loading,
  };
}

export default useBusData;