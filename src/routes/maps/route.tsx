import WorkInProgress from "@/components/WorkInProgress";
import { Box } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/maps")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <WorkInProgress />
    </Box>
  );
}
