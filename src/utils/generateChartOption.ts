import type { EChartsOption } from "echarts";

export const generateChartOption = (option: EChartsOption) => {
  return {
    ...option,
  };
};
