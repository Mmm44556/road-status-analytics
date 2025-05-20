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
import { LineChart } from "echarts/charts";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import TypeMenuList from "./TypeMenuList";
import type { EChartsOption } from "@/types/eChart";
import mock_data from "../../../../../server/cacheMerged/accident_aggregated.json";

const cityColorMap: Record<string, string> = {
  臺北市: "#A7C7E7", // 淺藍
  新北市: "#B7EFC5", // 淺綠
  桃園市: "#FFE0A3", // 淺橘
  臺中市: "#FFF9B0", // 淺黃
  臺南市: "#FFB3B3", // 淺紅
  高雄市: "#B2F0E6", // 淺青綠
  基隆市: "#C3D6F3", // 淺鐵藍
  新竹市: "#E6D3B3", // 淺棕
  新竹縣: "#F3E6D3", // 更淡棕
  苗栗縣: "#D9F6CA", // 淺山綠
  彰化縣: "#F7C6C7", // 淺紅
  南投縣: "#C6F7C3", // 淺森林綠
  雲林縣: "#F7E2C6", // 淺巧克力
  嘉義市: "#FFD6E0", // 淺粉
  嘉義縣: "#F7C6B7", // 淺印度紅
  屏東縣: "#B2F0F7", // 淺蔚藍
  宜蘭縣: "#B3E6FF", // 淺天藍
  花蓮縣: "#D6C6F7", // 淺靛藍
  臺東縣: "#FFD6F7", // 淺粉紅
  澎湖縣: "#B2F7F0", // 淺藍綠
  金門縣: "#FFF2B2", // 淺金
  連江縣: "#E6E6E6", // 淺灰
  // 兼容舊寫法
  台北市: "#A7C7E7",
  台中市: "#FFF9B0",
  台南市: "#FFB3B3",
  台東縣: "#FFD6F7",
  台南縣: "#FFB3B3",
  台中縣: "#FFF9B0",
  台北縣: "#A7C7E7",
  高雄縣: "#B2F0E6",
};
// 註冊必需的組件
echarts.use([
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TransformComponent,
  LineChart,
  CanvasRenderer,
  LabelLayout,
  UniversalTransition,
  LegendComponent,
]);

const AccidentCityLineRace = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.EChartsType | null>(null);
  const hoverTarget = useRef<{
    currentSeriesIndex: number | null;
    currentDataIndex: number | null;
  }>({
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

  //   // 窗口大小改變時調整圖表大小
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
  }, []);

  // 滑鼠移動事件，綁定Tooltip
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
        emphasis: { focus: "series" as const },
        data,
        barWidth: 30,
        label: { show: false },
        itemStyle: {
          color: cityColorMap[city] || undefined,
        },
      };
    });

    const option: EChartsOption = {
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
          // 依數量由大到小排序
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
      title: {
        text: "各縣市即時交通事故",
        left: "center",
        top: 0,
      },
      legend: { type: "scroll", bottom: 10 },

      grid: { left: 100, right: 100, top: 50, bottom: 50 },
      xAxis: { type: "category", data: allDates, name: "日期" },
      yAxis: { type: "value", name: "事故數量" },
      series: [
        ...citySeries,
        {
          type: "pie",
          id: "pie",
          radius: "30%",
          center: ["50%", "25%"],
          emphasis: {
            focus: "self",
          },
          label: {
            formatter: "{b}: {@2012} ({d}%)",
          },
          encode: {
            itemName: "product",
            value: "2012",
            tooltip: "2012",
          },
        },
      ],
    };

    chartInstance.current.setOption(option);
  };

  return (
    <>
      <TypeMenuList />
      <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
    </>
  );
};

export default AccidentCityLineRace;
