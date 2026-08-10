import ReactECharts from "echarts-for-react";
import { generateChartOption } from "@/utils/generateChartOption";
import { Alert, Paper, Skeleton } from "@mui/material";
import {
  getLatestPeriod,
  getTopCities,
  useAccidentSummary,
} from "@/service/trafficApi";

export default function AccidentRank() {
  const { data, isPending, error } = useAccidentSummary();

  if (isPending) {
    return <Skeleton variant="rounded" height={350} aria-label="正在載入事故排行" />;
  }

  if (error) {
    return <Alert severity="error">事故排行載入失敗：{error.message}</Alert>;
  }

  const period = getLatestPeriod(data.data);
  if (!period) {
    return <Alert severity="info">目前沒有事故排行資料</Alert>;
  }
  const orderedCityRank = getTopCities(
    data.data,
    period.year,
    period.month,
    5,
  ).reverse();

  const option = generateChartOption({
    title: {
      text: `${period.year} 年 ${period.month} 月交通事故排行 Top 5`,
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
