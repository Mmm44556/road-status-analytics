import MyPaper from "@/components/MyPaper";

import { BarChart } from "@mui/x-charts/BarChart";
import { cityColorMap } from "@/config/cityTheme";

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

const cityNames = dataset.map((item) => item.city);
const values = dataset.map((item) => item.value);
const colors = dataset.map((item) => item.color);
const chartSetting: Partial<React.ComponentProps<typeof BarChart>> = {
  xAxis: [
    {
      label: "交通事故數量",
    },
  ],
  yAxis: [
    {
      scaleType: "band",
      width: 50,
      data: cityNames,
      colorMap: {
        type: "ordinal",
        values: cityNames,
        colors: colors,
      },
    },
  ],

  height: 400,
  slotProps: {
    legend: {
      sx: {
        fontSize: 16,
        fontWeight: 600,
      },
    },
  },
};
export function valueFormatter(value: number | null) {
  return `${value}件`;
}

export default function AccidentCityRank() {
  return (
    <MyPaper>
      <BarChart
        series={[
          {
            data: values,
            label: "交通事故城市排行",
            color: "transparent",
            valueFormatter,
          },
        ]}
        layout="horizontal"
        {...chartSetting}
      />
    </MyPaper>
  );
}
