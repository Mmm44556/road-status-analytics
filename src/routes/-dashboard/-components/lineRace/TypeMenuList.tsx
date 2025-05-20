import { Fragment, memo, useState } from "react";
import {
  ListItemText,
  List,
  ListItemButton,
  MenuItem,
  Menu,
  Box,
  tooltipClasses,
  styled,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import Tooltip, { type TooltipProps } from "@mui/material/Tooltip";
import { blue } from "@mui/material/colors";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const options = ["(A1類)", "(A2類)", "(A3類)"];
const tooltipText = [
  "A1: 造成人員當場或二十四小時內死亡之交通事故。",
  "A2: 造成人員受傷或超過二十四小時死亡之交通事故。",
  "A3: 僅有車輛財物受損之交通事故。",
];

const TypeMenuList = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const open = Boolean(anchorEl);
  const handleClickListItem = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (index: number) => {
    setSelectedIndex(index);
    setAnchorEl(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 12,
        right: 20,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "fit-content",
        gap: 1,
      }}
    >
      <HtmlTooltip
        title={
          <Fragment>
            {tooltipText.map((text, index) => (
              <Typography
                key={index}
                color="inherit"
                sx={{ fontSize: 14, wordBreak: "keep-all", textWrap: "nowrap" }}
              >
                {text}
              </Typography>
            ))}
          </Fragment>
        }
      >
        <Button sx={{ color: "black", padding: 0, minWidth: "auto" }}>
          <HelpOutlineIcon sx={{ fontSize: 20 }} />
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

export default memo(TypeMenuList);
