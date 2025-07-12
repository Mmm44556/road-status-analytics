import { Fragment, memo } from "react";
import { Box, tooltipClasses, styled, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Tooltip, { type TooltipProps } from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { SxProps } from "@mui/material";
import { trafficEventTypes } from "@/constant";

interface AccidentTypeTooltipProps {
  sx: SxProps;
}
const AccidentTypeTooltip = (props: AccidentTypeTooltipProps) => {
  return (
    <Box
      sx={{
        position: "absolute",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "black",
        height: "fit-content",
        ...props.sx,
      }}
    >
      <HtmlTooltip
        title={
          <Fragment>
            {trafficEventTypes.map((text, index) => (
              <Typography
                key={index}
                color="inherit"
                sx={{
                  fontSize: 16,
                  wordBreak: "keep-all",
                  textWrap: "nowrap",
                }}
              >
                {text}
              </Typography>
            ))}
          </Fragment>
        }
      >
        <Button sx={{ color: "black", padding: 0, minWidth: "auto" }}>
          <HelpOutlineIcon
            sx={{
              fontSize: {
                xs: "16px",
                sm: "18px",
                md: "20px",
                "2xl": "24px",
              },
            }}
          />
        </Button>
      </HtmlTooltip>
    </Box>
  );
};
const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
    maxWidth: "100%",
    padding: 10,
  },
}));

export default memo(AccidentTypeTooltip);
