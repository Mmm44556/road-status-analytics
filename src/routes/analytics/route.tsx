import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="p-2">Hello from Analytics!</div>;
}
