import { DeviceMotion } from "expo-sensors";
import { useEffect, useRef, useState } from "react";

export const useFloorTransition = () => {
  const [floorDelta, setFloorDelta] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [lastAccelAvg, setLastAccelAvg] = useState(0);
  const [lastGyroAvg, setLastGyroAvg] = useState(0);

  const accelBuffer = useRef<number[]>([]);
  const gyroBuffer = useRef<number[]>([]);
  const lastDetectionTime = useRef(0);

  useEffect(() => {
    let subscription: any;

    const startListening = async () => {
      await DeviceMotion.setUpdateInterval(100); // 10Hz
      subscription = DeviceMotion.addListener((data) => {
        const accel = data.accelerationIncludingGravity;
        const gyro = data.rotationRate;

        if (accel && gyro) {
          const accelMag = Math.sqrt(
            accel.x ** 2 + accel.y ** 2 + accel.z ** 2
          );
          const gyroMag = Math.sqrt(
            gyro.alpha ** 2 + gyro.beta ** 2 + gyro.gamma ** 2
          );

          accelBuffer.current.push(accelMag);
          gyroBuffer.current.push(gyroMag);

          if (accelBuffer.current.length > 10) accelBuffer.current.shift();
          if (gyroBuffer.current.length > 10) gyroBuffer.current.shift();

          const avgAccel =
            accelBuffer.current.reduce((a, b) => a + b, 0) /
            accelBuffer.current.length;
          const avgGyro =
            gyroBuffer.current.reduce((a, b) => a + b, 0) /
            gyroBuffer.current.length;

          setLastAccelAvg(avgAccel);
          setLastGyroAvg(avgGyro);

          // Detect stair-like motion: high accel variance + gyro
          const accelVariance =
            accelBuffer.current.reduce(
              (sum, val) => sum + (val - avgAccel) ** 2,
              0
            ) / accelBuffer.current.length;
          const isStairMotion = accelVariance > 2 && avgGyro > 0.5;

          if (isStairMotion && Date.now() - lastDetectionTime.current > 2000) {
            // Debounce 2s
            const delta = avgAccel > 12 ? 1 : avgAccel < 8 ? -1 : 0; // Rough thresholds
            if (delta !== 0) {
              setFloorDelta((prev) => prev + delta);
              setConfidence(0.8); // Placeholder confidence
              lastDetectionTime.current = Date.now();
            }
          }
        }
      });
    };

    startListening();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const consumeDelta = () => {
    setFloorDelta(0);
    setConfidence(0);
  };

  return { floorDelta, consumeDelta, confidence, lastAccelAvg, lastGyroAvg };
};
