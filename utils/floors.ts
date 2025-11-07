import { ImageSourcePropType } from "react-native";

export type Floor = {
  id: string;
  value: string;
  label: string;
  imageSrc: ImageSourcePropType;
  altitude?: number;
};

export const floors: Floor[] = [
  {
    id: "02677862-9e8d-4c50-bbf7-77f938d94e63",
    value: "ground",
    label: "Ground Floor",
    imageSrc: require("../assets/images/floor_plans/ground-floor.jpg"),
    altitude: 119.69999694824219,
  },
  {
    id: "22204293-9a7b-42d3-ae41-a9171d49e317",
    value: "first",
    label: "1st Floor",
    imageSrc: require("../assets/images/floor_plans/first-floor.jpg"),
    altitude: 124.19999694824219,
  },
  {
    id: "299cc5e1-7c7c-4b18-a5e0-d8f1108dab93",
    value: "second",
    label: "2nd Floor",
    imageSrc: require("../assets/images/floor_plans/second-floor.jpg"),
    altitude: 126.80000305175781,
  },
  {
    id: "70875545-3051-41b2-82d6-e3daf69a8650",
    value: "third",
    label: "3rd Floor",
    imageSrc: require("../assets/images/floor_plans/third-floor.jpg"),
    altitude: 128.8000030517578,
  },
  {
    id: "da84ed65-fd2e-48cb-af6c-d9d2b0b0d222",
    value: "fourth",
    label: "4th Floor",
    imageSrc: require("../assets/images/floor_plans/fourth-floor.jpg"),
    altitude: 130.19999694824219,
  },
];
