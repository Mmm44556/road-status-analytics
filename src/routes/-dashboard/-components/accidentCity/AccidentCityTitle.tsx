import { Fragment, memo } from "react"
import { Box, tooltipClasses, styled, Typography } from "@mui/material"
import Button from "@mui/material/Button"
import Tooltip, { type TooltipProps } from "@mui/material/Tooltip"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import { grey } from "@mui/material/colors"

const tooltipText = [
  "A1: 造成人員當場或二十四小時內死亡之交通事故。",
  "A2: 造成人員受傷或超過二十四小時死亡之交通事故。",
  "A3: 僅有車輛財物受損之交通事故。",
]

const AccidentCityTitle = () => {
  return (
    <Box
      sx={{
        position: "absolute",
        left: "calc(50% - 50px)",
        bottom: 0,
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "black",
        height: "fit-content",
        top: {
          xl: 10,
          "2xl": 9,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography sx={{ fontSize: 22 }}>各縣市交通事故</Typography>

        <HtmlTooltip
          title={
            <Fragment>
              {tooltipText.map((text, index) => (
                <Typography
                  key={index}
                  color='inherit'
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
      <Typography sx={{ fontSize: 14, color: grey[600] }}>
        資料來源: TDX 運輸資料流通服務
      </Typography>
    </Box>
  )
}
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
}))

export default memo(AccidentCityTitle)
