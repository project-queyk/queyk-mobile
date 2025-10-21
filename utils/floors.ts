import { ImageSourcePropType } from "react-native";

export type Floor = {
  value: string;
  label: string;
  imageSrc: ImageSourcePropType;
  altitude?: number;
};

export const floors: Floor[] = [
  {
    value: "ground",
    label: "Ground Floor",
    imageSrc: require("../assets/images/floor_plans/ground-floor.jpg"),
    altitude: 119.69999694824219,
  },
  {
    value: "first",
    label: "1st Floor",
    imageSrc: require("../assets/images/floor_plans/first-floor.jpg"),
    altitude: 124.19999694824219,
  },
  {
    value: "second",
    label: "2nd Floor",
    imageSrc: require("../assets/images/floor_plans/second-floor.jpg"),
    altitude: 126.80000305175781,
  },
  {
    value: "third",
    label: "3rd Floor",
    imageSrc: require("../assets/images/floor_plans/third-floor.jpg"),
    altitude: 128.8000030517578,
  },
  {
    value: "fourth",
    label: "4th Floor",
    imageSrc: require("../assets/images/floor_plans/fourth-floor.jpg"),
    altitude: 130.19999694824219,
  },
];
