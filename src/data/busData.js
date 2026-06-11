export const collegeInfo = {
  name: "Your College Name",
  address: "Your College Address",

  // Temporary sample college location.
  // Later replace this with your real college latitude and longitude.
  location: {
    lat: 16.5062,
    lng: 80.6480,
  },
};

export const buses = [
  {
    id: "bus_1",
    busNumber: "1",
    routeName: "Route 1 - Main Road to College",
    morningStart: "7:30 AM",
    collegeArrival: "8:45 AM",
    eveningDeparture: "4:30 PM",
    driverName: "Driver Name",
    driverPhone: "9876543210",
    status: "Running",

    // Temporary sample bus location
    currentLocation: {
      lat: 16.5105,
      lng: 80.6468,
    },
  },
  {
    id: "bus_2",
    busNumber: "2",
    routeName: "Route 2 - City Center to College",
    morningStart: "7:15 AM",
    collegeArrival: "8:40 AM",
    eveningDeparture: "4:30 PM",
    driverName: "Driver Name",
    driverPhone: "9876543211",
    status: "Not Started",

    // Temporary sample bus location
    currentLocation: {
      lat: 16.5035,
      lng: 80.6552,
    },
  },
  {
    id: "bus_3",
    busNumber: "3",
    routeName: "Route 3 - Bus Stand to College",
    morningStart: "7:00 AM",
    collegeArrival: "8:35 AM",
    eveningDeparture: "4:30 PM",
    driverName: "Driver Name",
    driverPhone: "9876543212",
    status: "Reached College",

    // Temporary sample bus location
    currentLocation: {
      lat: 16.4988,
      lng: 80.6425,
    },
  },
];