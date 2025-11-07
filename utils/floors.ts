import { ImageSourcePropType } from "react-native";

export type Floor = {
  value: string;
  label: string;
  imageSrc: ImageSourcePropType;
  altitude: number; // Relative altitude in meters (ground floor = 0)
  wifiFingerprint: { [bssid: string]: number }; // Wi-Fi RSSI fingerprint collected via admin UI
};

export const floors: Floor[] = [
  {
    value: "ground",
    label: "Ground Floor",
    imageSrc: require("../assets/images/floor_plans/ground-floor.jpg"),
    altitude: 0, // Reference: Ground floor = 0 (relative altitude)
    wifiFingerprint: {
      "a8:74:84:c3:b7:fc": -80,
      "a8:74:84:c3:b7:fd": -89,
      "ce:bc:e3:10:4d:e4": -77,
      "3c:84:6a:48:0a:82": -54,
      "fc:40:09:33:c0:cb": -87,
      "3c:84:6a:d3:03:8e": -88,
      "54:16:9d:8a:fb:2a": -52,
      "0e:62:79:52:ed:2a": -88,
      "f4:2d:06:cf:06:3c": -78,
      "f4:2d:06:cf:06:3e": -81,
      "6c:d7:19:3b:53:d0": -85,
      "32:16:9d:8a:fb:2a": -52,
      "d6:8d:26:86:85:8a": -69,
      "cc:2d:21:36:19:28": -86,
      "84:74:60:90:47:12": -88,
      "f6:2d:06:9f:06:3c": -78,
      "d4:b7:09:e8:16:63": -81,
      "30:16:9d:8a:fb:29": -59,
      "30:68:93:d2:94:80": -80,
      "6e:22:1a:88:d9:d5": -75,
      "fc:40:09:2a:56:59": -76,
    }, // Collected from center location - add more samples from different spots for better coverage
  },
  {
    value: "first",
    label: "1st Floor",
    imageSrc: require("../assets/images/floor_plans/first-floor.jpg"),
    altitude: 4.0, // Relative: +4m from ground (typical floor height)
    wifiFingerprint: {},
  },
  {
    value: "second",
    label: "2nd Floor",
    imageSrc: require("../assets/images/floor_plans/second-floor.jpg"),
    altitude: 8.0, // Relative: +8m from ground
    wifiFingerprint: {},
  },
  {
    value: "third",
    label: "3rd Floor",
    imageSrc: require("../assets/images/floor_plans/third-floor.jpg"),
    altitude: 12.0, // Relative: +12m from ground
    wifiFingerprint: {},
  },
  {
    value: "fourth",
    label: "4th Floor",
    imageSrc: require("../assets/images/floor_plans/fourth-floor.jpg"),
    altitude: 16.0, // Relative: +16m from ground
    wifiFingerprint: {},
  },
];
