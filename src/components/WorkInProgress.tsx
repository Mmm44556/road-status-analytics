import programmer from "@/assets/images/programmer.png";
import { Box } from "@mui/material";

export default function WorkInProgress() {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={programmer}
        alt="programmer"
        style={{
          maxWidth: "500px",
        }}
      />
    </Box>
  );
}
