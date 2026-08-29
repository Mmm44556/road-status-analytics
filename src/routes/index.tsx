import { createFileRoute } from "@tanstack/react-router";
import TrafficMapPage from "./-maps/TrafficMapPage";

export const Route = createFileRoute("/")({
  component: TrafficMapPage,
});
