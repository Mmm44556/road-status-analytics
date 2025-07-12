import ReactECharts from "echarts-for-react";
import mock_cityRank from "~/server/traffic/cache/city_rank.json";
import { generateChartOption } from "@/utils/generateChartOption";
import { Paper } from "@mui/material";

export default function AccidentRank() {
  const orderedCityRank = structuredClone(mock_cityRank)
    .splice(0, 5)
    .sort((a, b) => b.count - a.count)
    .reverse();
  const option = generateChartOption({
    title: {
      text: "上個月交通事故排行 Top 5",
      left: 15,
      top: 15,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      left: "8%",
      right: "8%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      boundaryGap: [0, 0.01],
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: "category",
      data: orderedCityRank.map((item) => item.city),
      axisLabel: {
        fontSize: 14,
      },
    },
    series: [
      {
        type: "bar",
        data: orderedCityRank.map((item) => item.count),
        animationDuration: 1000,
        animationDelay: function (idx) {
          return idx * 100; // 每個 bar 晚一點出現
        },
      },
    ],
  });

  return (
    <Paper>
      <ReactECharts option={option} style={{ height: 350 }} />
    </Paper>
  );
}
