import { memo } from "react";
import Box from "@mui/material/Box";
import CircleIcon from "@mui/icons-material/Circle";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import Chip from "@mui/joy/Chip";
import { format } from "date-fns";
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

function Description() {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        height: "10px",
        mt:1
      }}
    >
      <Chip onClick={() => {}} color="danger" variant="soft">
        <CircleIcon
          sx={{
            color: "red",
            width: 10,
            height: 10,
            marginRight: 1,
            animation: `${pulse} 1s ease-in-out infinite`,
          }}
        />
        即時更新
      </Chip>
      <Typography
        fontWeight={500}
        sx={{
          color: "#637587",
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 14,
        }}
      >
        最後更新: {format(new Date(), "yyyy-MM-dd HH:mm:ss")}
      </Typography>
      <Typography
        fontWeight={500}
        sx={{
          color: "#637587",
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 14,
        }}
      >
        資料來源：政府開放資料平臺、TDX 運輸資料流通服務
      </Typography>
    </Box>
  );
}

export default memo(Description);
