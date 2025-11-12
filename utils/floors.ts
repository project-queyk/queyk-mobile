import { ImageSourcePropType } from "react-native";

export type Floor = {
  id: string;
  value: string;
  label: string;
  altitude: number;
};

export const getFloorImage = (
  floorValue: string,
  isGif: boolean
): ImageSourcePropType => {
  switch (floorValue) {
    case "ground":
      return isGif
        ? require("../assets/images/floor_plans/animated/ground-floor.gif")
        : require("../assets/images/floor_plans/static/ground-floor.png");
    case "first":
      return isGif
        ? require("../assets/images/floor_plans/animated/first-floor.gif")
        : require("../assets/images/floor_plans/static/first-floor.png");
    case "second":
      return isGif
        ? require("../assets/images/floor_plans/animated/second-floor.gif")
        : require("../assets/images/floor_plans/static/second-floor.png");
    case "third":
      return isGif
        ? require("../assets/images/floor_plans/animated/third-floor.gif")
        : require("../assets/images/floor_plans/static/third-floor.png");
    case "fourth":
      return isGif
        ? require("../assets/images/floor_plans/animated/fourth-floor.gif")
        : require("../assets/images/floor_plans/static/fourth-floor.png");
    default:
      return require("../assets/images/floor_plans/static/ground-floor.png");
  }
};

export const floors: Floor[] = [
  {
    id: "02677862-9e8d-4c50-bbf7-77f938d94e63",
    value: "ground",
    label: "Ground Floor",
    altitude: 119.69999694824219,
  },
  {
    id: "22204293-9a7b-42d3-ae41-a9171d49e317",
    value: "first",
    label: "1st Floor",
    altitude: 124.19999694824219,
  },
  {
    id: "299cc5e1-7c7c-4b18-a5e0-d8f1108dab93",
    value: "second",
    label: "2nd Floor",
    altitude: 126.80000305175781,
  },
  {
    id: "70875545-3051-41b2-82d6-e3daf69a8650",
    value: "third",
    label: "3rd Floor",
    altitude: 128.8000030517578,
  },
  {
    id: "da84ed65-fd2e-48cb-af6c-d9d2b0b0d222",
    value: "fourth",
    label: "4th Floor",
    altitude: 130.19999694824219,
  },
];
