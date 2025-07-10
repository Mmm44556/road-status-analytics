import { useContext } from "react";
import { TrafficMapViewContext } from "@/context";

export const useTrafficMapContext = () => {
  const context = useContext(TrafficMapViewContext);
  if (!context) {
    throw new Error(
      "缺少 TrafficMapViewContext 的 context"
    );
  }
  return context;
};
