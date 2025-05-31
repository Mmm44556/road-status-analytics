import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TransformComponent,
  LegendComponent,
} from "echarts/components";
import { LineChart, PieChart } from "echarts/charts";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import AccidentCityTitle from "./AccidentCityTitle";
import type { EChartsOption } from "@/types/eChart";
import mock_data from "../../../../../server/cacheMerged/accident_aggregated.json";
import Box from "@mui/material/Box";
import MyPaper from "@/components/MyPaper";
import { cityColorMap } from "@/config/cityTheme";

// 註冊必需的組件
echarts.use([
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TransformComponent,
  LineChart,
  PieChart,
  CanvasRenderer,
  LabelLayout,
  UniversalTransition,
  LegendComponent,
]);

const AccidentCityChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance =
    useRef<UseActivateTooltipTextProps["chartInstance"]["current"]>(null);
  const hoverTarget = useRef<
    UseActivateTooltipTextProps["hoverTarget"]["current"]
  >({
    currentSeriesIndex: null,
    currentDataIndex: null,
  });

  useEffect(() => {
    // 初始化圖表
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current, "light");
    }

    // 使用假數據渲染圖表
    renderChart();

    // 組件卸載時清除圖表實例
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // 渲染圖表的函數
  const renderChart = () => {
    if (!chartInstance.current) return;

    const allDates = Array.from(
      new Set(mock_data.map((item) => item.date))
    ).sort();
    const allCities = Array.from(new Set(mock_data.map((item) => item.city)));

    const citySeries = allCities.map((city) => {
      const data = allDates.map((date) => {
        const found = mock_data.find(
          (item) => item.city === city && item.date === date
        );
        return found ? found.total : undefined; // 不補 0
      });

      return {
        name: city,
        type: "bar" as const,
        stack: "total",
        data,
        emphasis: { focus: "series" as const },
        label: { show: false },
        itemStyle: {
          color: cityColorMap[city] || "#333",
        },
      };
    });
    const option: EChartsOption = {
      media: [
        {
          query: {
            maxWidth: 850,
          },
          option: {
            series: [
              {
                radius: "50%",
                center: ["87%", "50%"],
              },
            ],
          },
        },

        {
          query: {
            minWidth: 1200,
          },
          option: {
            series: [
              {
                radius: "60%",
                center: ["87%", "50%"],
              },
            ],
          },
        },
      ],
      baseOption: {
        timeline: {
          axisType: "category",
          show: false,
        },

        legend: [
          {
            type: "scroll",
            bottom: 10,
            data: allCities,
            textStyle: {
              fontSize: 16,
            },
          },
          {
            data: ["A1類", "A2類", "A3類"],
            right: 20,
            top: 10,
            textStyle: {
              fontSize: 16,
            },
            subtextStyle: {
              fontSize: 16,
            },
          },
        ],

        grid: {
          left: "3%",
          right: "55%",
          bottom: "15%",
          containLabel: true,
          width: "70%",
        },
        xAxis: {
          type: "category",
          data: allDates,
          name: "日期",
          nameTextStyle: { fontSize: 14 },
          axisLabel: {
            fontSize: 14,
          },
        },
        yAxis: {
          type: "value",
          name: "事故數量",
          nameTextStyle: { fontSize: 14 },
          axisLabel: {
            fontSize: 14,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: function (params) {
            if (!Array.isArray(params)) return "";
            const date = params[0]?.name;

            // 過濾有資料的
            const filtered = params.filter(
              (p) => typeof p.value === "number" && p.value > 0
            );
            // 依數量由大到小排
            filtered.sort((a, b) => (b.value as number) - (a.value as number));
            const title = `<p style="font-weight:bold;">日期: ${date}</p>`;
            let result = "";
            filtered.forEach((p) => {
              const color = cityColorMap[p.seriesName as string] || "#333";

              const isHighlight =
                hoverTarget.current.currentDataIndex === p.dataIndex &&
                hoverTarget.current.currentSeriesIndex === p.seriesIndex;
              // 高亮 hover 的縣市
              if (isHighlight) {
                result += `<span style="color:${color};font-weight:bold;">${p.seriesName}: ${p.value}</span>`;
              } else {
                result += `<span>${p.seriesName}: ${p.value}</span>`;
              }
            });
            return `
          <div style="display:flex;flex-direction:column;gap:0px;">
          ${title}
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">${result}</div>
          </div>
          `;
          },
        },
        series: [
          {
            type: "pie",
            radius: "50%",
            center: ["85%", "50%"],
            emphasis: {
              focus: "self",
            },

            tooltip: {
              trigger: "item",
              formatter: "{b}: {c} ({d}%)",
              textStyle: {
                fontSize: 16,
              },
            },
            label: {
              fontSize: 16,
              position: "inner",
            },
          },
          ...citySeries,
        ],
      },
      options: [
        {
          series: [
            {
              data: [
                {
                  name: "A1類",
                  value: 600,
                },
                {
                  name: "A2類",
                  value: 135,
                },
                {
                  name: "A3類",
                  value: 120,
                },
              ],
            },
            {
              data: [
                {
                  value: 200,
                },
              ],
            },
          ],
        },
      ],
    };
    chartInstance.current.setOption(option);
  };

  // 窗口大小改變時調整圖表大小
  useResizeChart({ chartInstance });

  // 滑鼠移動事件，綁定Tooltip，並且設定 hover 的縣市
  useActivateTooltipText({
    chartInstance,
    hoverTarget,
  });

  return (
    <MyPaper
      sx={{
        display: "flex",
        gap: 1,
        padding: 1,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
        }}
      >
        <AccidentCityTitle />
        <div ref={chartRef} style={{ width: "100%", height: "400px" }} />
      </Box>
    </MyPaper>
  );
};
type UseActivateTooltipTextProps = {
  chartInstance: React.RefObject<echarts.EChartsType | null>;
  hoverTarget: React.RefObject<{
    currentSeriesIndex: number | null;
    currentDataIndex: number | null;
  }>;
};
function useActivateTooltipText({
  chartInstance,
  hoverTarget,
}: UseActivateTooltipTextProps) {
  useEffect(() => {
    if (!chartInstance.current) return;
    const chart = chartInstance.current;

    function handleMouseMove(e: echarts.ECElementEvent) {
      hoverTarget.current.currentSeriesIndex = e.seriesIndex ?? null;
      hoverTarget.current.currentDataIndex = e.dataIndex ?? null;
    }
    function handleMouseOut() {
      hoverTarget.current.currentSeriesIndex = null;
      hoverTarget.current.currentDataIndex = null;
    }
    chart.on("mousemove", handleMouseMove);
    chart.on("mouseout", handleMouseOut);
    return () => {
      chart.off("mousemove", handleMouseMove);
      chart.off("mouseout", handleMouseOut);
    };
  }, [chartInstance, hoverTarget]);
}

type UseResizeChartProps = {
  chartInstance: React.RefObject<echarts.EChartsType | null>;
};
function useResizeChart({ chartInstance }: UseResizeChartProps) {
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [chartInstance]);
}

export default AccidentCityChart;
