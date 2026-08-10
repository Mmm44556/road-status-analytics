import ReactECharts from "echarts-for-react";
import { generateChartOption } from "@/utils/generateChartOption";
import { Alert, Paper, Skeleton } from "@mui/material";
import numberIntl from "@/utils/numberIntl";
import { trafficEventTypes } from "@/constant";
import {
  getAccidentTypeTotals,
  getLatestPeriod,
  useAccidentSummary,
} from "@/service/trafficApi";

export default function AccidentDonutPie() {
  const { data, isPending, error } = useAccidentSummary();

  if (isPending) {
    return <Skeleton variant="rounded" height={450} aria-label="正在載入事故類型統計" />;
  }

  if (error) {
    return <Alert severity="error">事故類型統計載入失敗：{error.message}</Alert>;
  }

  const period = getLatestPeriod(data.data);
  if (!period) {
    return <Alert severity="info">目前沒有事故類型統計資料</Alert>;
  }
  const eventsReduced = getAccidentTypeTotals(
    data.data,
    period.year,
    period.month,
  );

  const option = generateChartOption({
    title: {
      text: `${period.year} 年 ${period.month} 月交通事故類型統計`,
      left: 15,
      top: 15,
    },

    tooltip: {
      trigger: "none",
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: "交通事故類型",
        type: "pie",
        radius: ["40%", "70%"],
        label: {
          show: true,
          fontSize: 16,
          formatter: (params) => {
            return `${params.name}: ${numberIntl(Number(params.value))} 件`;
          },
        },

        data: [
          {
            value: eventsReduced.A1,
            name: "A1",
            itemStyle: {
              color: "#ef4444",
            },
          },
          {
            value: eventsReduced.A2,
            name: "A2",
          },
          {
            value: eventsReduced.A3,
            name: "A3",
          },
        ],
      },
    ],

    graphic: [
      {
        type: "text",
        left: "center",
        top: "48%",
        style: {
          text: `總計: ${numberIntl(
            Number(eventsReduced.A1) +
              Number(eventsReduced.A2) +
              Number(eventsReduced.A3)
          )} 件`,
          font: "16px sans-serif",
          fill: "#888",
        },
      },
      {
        type: "text",
        left: "center",
        bottom: 10,
        style: {
          text: `${trafficEventTypes.join("\n")}`,
          font: "14px sans-serif",
          lineHeight: 18,
          fill: "#888",
        },
      },
    ],
  });
  return (
    <Paper
      sx={{
        position: "relative",
      }}
    >
      <ReactECharts option={option} style={{ height: "450px" }} />
    </Paper>
  );
}
