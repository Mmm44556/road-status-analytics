import ReactECharts from "echarts-for-react";
import { generateChartOption } from "@/utils/generateChartOption";
import { Paper } from "@mui/material";
import mock_accident_summary from "~/server/traffic/cache/aggregate_cache.json";
import { getMonth } from "date-fns";
import numberIntl from "@/utils/numberIntl";
import { trafficEventTypes } from "@/constant";

const lastMonth = getMonth(new Date());
const lastMonthMM = lastMonth < 10 ? `0${lastMonth}` : lastMonth;
export default function AccidentDonutPie() {
  const currentMonthEvents = mock_accident_summary.data.filter((item) => {
    return item.MM === lastMonthMM;
  });

  // 累加A1,A2,A3
  const eventsReduced = currentMonthEvents.reduce(
    (acc, item) => {
      acc.A1 += item.A1;
      acc.A2 += item.A2;
      acc.A3 += item.A3;
      return acc;
    },
    { A1: 0, A2: 0, A3: 0 }
  );

  const option = generateChartOption({
    title: {
      text: "上個月交通事故類型統計",
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
