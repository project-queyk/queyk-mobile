import { ImageSourcePropType } from "react-native";

export type Floor = {
  value: string;
  label: string;
  imageSrc: ImageSourcePropType;
  // Optional indoor barometric reference pressure in hectoPascals (hPa).
  // Use this to store a measured pressure value on each floor for improved
  // indoor altitude detection. Example: 1013.2
  pressure?: number;
  altitude?: number;
};

export const floors: Floor[] = [
  {
    value: "ground",
    label: "Ground Floor",
    imageSrc: require("../assets/images/floor_plans/ground-floor.jpg"),
    altitude: 0, // Reference: Ground floor = 0 (relative altitude)
    // TODO: measure indoors on this floor and set pressure (hPa) here
    // Example: pressure: 1013.25
    pressure: undefined,
  },
  {
    value: "first",
    label: "1st Floor",
    imageSrc: require("../assets/images/floor_plans/first-floor.jpg"),
    altitude: 4.0, // Relative: +4m from ground (typical floor height)
    // TODO: measure indoors on this floor and set pressure (hPa) here
    pressure: undefined,
  },
  {
    value: "second",
    label: "2nd Floor",
    imageSrc: require("../assets/images/floor_plans/second-floor.jpg"),
    altitude: 8.0, // Relative: +8m from ground
    // TODO: measure indoors on this floor and set pressure (hPa) here
    pressure: undefined,
  },
  {
    value: "third",
    label: "3rd Floor",
    imageSrc: require("../assets/images/floor_plans/third-floor.jpg"),
    altitude: 12.0, // Relative: +12m from ground
    // TODO: measure indoors on this floor and set pressure (hPa) here
    pressure: undefined,
  },
  {
    value: "fourth",
    label: "4th Floor",
    imageSrc: require("../assets/images/floor_plans/fourth-floor.jpg"),
    altitude: 16.0, // Relative: +16m from ground
    // TODO: measure indoors on this floor and set pressure (hPa) here
    pressure: undefined,
  },
];
