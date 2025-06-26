import { memo } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import numberIntl from "@/utils/numberIntl";
import Box from "@mui/material/Box";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import { fontSize } from "@/config/theme";
type CardItem = {
  title: string;
  value: number | string;
  unit?: string;
  prefix?: React.ReactNode;
  icon?: React.ReactNode;
  slotStyle?: {
    card?: React.CSSProperties;
    value?: React.CSSProperties;
    title?: React.CSSProperties;
  };
};
const cardItems: CardItem[] = [
  {
    title: "本月總事故數",
    value: 134,
    unit: "件",
    slotStyle: {
      value: {
        color: "#f59e0b",
      },
    },
  },
  {
    title: "A1 類事故",
    value: 1234,
    unit: "件",
    slotStyle: {
      value: {
        color: "#ef4444",
      },
    },
  },
  {
    title: "較上月變化",
    value: "15.3",
    unit: "%",
    prefix: "+",
    slotStyle: {
      value: {
        color: "#10b981",
      },
    },
  },
  {
    title: "事故最多路段",
    value: "台中市西屯區",
    slotStyle: {
      value: {
        color: "#3b82f6",
      },
    },
  },
];

function AnalyticsCard() {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 2,
        padding: 2,
      }}
    >
      <Typography
        variant="h6"
        component="h2"
        sx={{
          fontSize: fontSize,
          fontWeight: 600,
          marginBottom: 1,
        }}
      >
        本月事故概況
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          marginBottom: "auto",
          marginTop: "auto",
        }}
      >
        {cardItems.map((item) => (
          <EventCard key={item.title} {...item} />
        ))}
      </Box>
    </Box>
  );
}

function EventCard({ title, value, unit, prefix, slotStyle }: CardItem) {
  return (
    <Card
      sx={{
        width: "100%",
        minHeight: 180,
        position: "relative",
        borderRadius: 2,
        boxShadow: "0px 0px 10px 0px rgba(0, 0, 0, 0.1)",
        ...slotStyle?.card,
      }}
    >
      <TouchAppIcon
        sx={{ position: "absolute", top: 10, right: 10, color: "#374151" }}
      />
      <CardActionArea sx={{ height: "100%" }}>
        <CardContent
          sx={{
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              component="h3"
              fontWeight={600}
              marginBottom={1}
              sx={{
                fontSize: 28,
                ...slotStyle?.value,
              }}
            >
              {prefix && <span>{prefix}</span>}
              {numberIntl(value)}
            </Typography>
            {unit && (
              <Typography
                component="span"
                fontSize={16}
                color="text.secondary"
                fontWeight={600}
              >
                {unit}
              </Typography>
            )}
          </Box>

          <Typography
            component="h6"
            fontWeight={600}
            sx={{ fontSize: 18, color: "#374151", ...slotStyle?.title }}
          >
            {title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default memo(AnalyticsCard);
