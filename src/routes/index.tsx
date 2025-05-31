import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "./-overview/Overview";

export const Route = createFileRoute("/")({
  component: Dashboard,
});
