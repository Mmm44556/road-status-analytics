import { createFileRoute, redirect } from "@tanstack/react-router";
import TrafficMapPage from "./-maps/TrafficMapPage";
import { hasSeenWelcome } from "./-welcome/welcomeSeen";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!hasSeenWelcome()) {
      throw redirect({ to: "/welcome" });
    }
  },
  component: TrafficMapPage,
});
