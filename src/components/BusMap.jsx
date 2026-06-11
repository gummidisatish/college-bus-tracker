import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { getBusStatus } from "../utils/busStatus";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function isValidPoint(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

function MapUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();

      if (points.length > 1) {
        map.fitBounds(points, {
          padding: [40, 40],
        });
      } else if (points.length === 1) {
        map.setView(points[0], 15);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [map, points]);

  return null;
}

function BusMap({ collegeInfo, buses }) {
  const collegePosition = [
    Number(collegeInfo?.location?.lat),
    Number(collegeInfo?.location?.lng),
  ];

  if (!isValidPoint(collegePosition)) {
    return (
      <div className="map-error">
        <h3>College location is invalid.</h3>
        <p>
          Check Firebase: collegeInfo → location → lat and lng must be valid
          numbers.
        </p>
      </div>
    );
  }

  const busesWithLocation = buses.filter((bus) => {
    const lat = Number(bus?.currentLocation?.lat);
    const lng = Number(bus?.currentLocation?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const allPoints = [
    collegePosition,
    ...busesWithLocation.map((bus) => [
      Number(bus.currentLocation.lat),
      Number(bus.currentLocation.lng),
    ]),
  ];

  return (
    <div className="map-wrapper">
      <MapContainer
        key={busesWithLocation.map((bus) => bus.id).join("-") || "college-map"}
        center={collegePosition}
        zoom={14}
        scrollWheelZoom={true}
        className="bus-map"
      >
        <MapUpdater points={allPoints} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={collegePosition}>
          <Popup>
            <strong>{collegeInfo.name}</strong>
            <br />
            {collegeInfo.address}
          </Popup>
        </Marker>

        {busesWithLocation.map((bus) => {
          const displayStatus = getBusStatus(bus);

          return (
            <Marker
              key={bus.id}
              position={[
                Number(bus.currentLocation.lat),
                Number(bus.currentLocation.lng),
              ]}
            >
              <Popup>
                <strong>Bus {bus.busNumber}</strong>
                <br />
                Route: {bus.routeName}
                <br />
                Status: {displayStatus}
                <br />
                Speed: {bus.speed || 0} km/h
                <br />
                Last Updated:{" "}
                {bus.updatedAt
                  ? new Date(bus.updatedAt).toLocaleTimeString()
                  : "Not available"}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default BusMap;