import { cityColorMap } from "@/config/cityTheme";
import { ChartContainer } from "@mui/x-charts/ChartContainer";
import { BarPlot } from "@mui/x-charts/BarChart";
import { ChartsTooltip, ChartsXAxis, ChartsYAxis } from "@mui/x-charts";

const dataset = [
  {
    value: 21,
    city: "台北市",
    color: cityColorMap["台北市"],
  },
  {
    value: 28,
    city: "新北市",
    color: cityColorMap["新北市"],
  },
  {
    value: 41,
    city: "桃園市",
    color: cityColorMap["桃園市"],
  },
  {
    value: 73,
    city: "台中市",
    color: cityColorMap["台中市"],
  },
  {
    value: 99,
    city: "台南市",
    color: cityColorMap["台南市"],
  },
];

export function valueFormatter(value: number | null) {
  if (value === null) return "";
  return `${value}件`;
}

export default function AccidentCityRank() {
  return (
    <ChartContainer
      dataset={dataset}
      series={[
        {
          type: "bar",
          dataKey: "value",
          valueFormatter,
          layout: "horizontal",
        },
      ]}
      yAxis={[{ scaleType: "band", dataKey: "city", width: 50 }]}
      sx={{
        bgcolor: "white",
        flex: 1,
        "& .MuiChartsAxis-directionY .MuiChartsAxis-tickLabel": {
          transform: "translateX(0px)",
        },
      }}
    >
      <BarPlot />
      <ChartsXAxis label="交通事故數量" />
      <ChartsYAxis />
      <ChartsTooltip />
    </ChartContainer>
  );
}
