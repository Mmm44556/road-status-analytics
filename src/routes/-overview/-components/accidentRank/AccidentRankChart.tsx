import ReactECharts from "echarts-for-react";
import { cityColorMap } from "@/config/cityTheme";
import MyPaper from "@/components/MyPaper";
import Box from "@mui/material/Box";

// 假資料，請依實際需求替換
const allDates = ["2024-06-01", "2024-06-02", "2024-06-03"];
const allCities = ["台北市", "台中市", "高雄市"];
const citySeries = allCities.map((city) => {
  const data = allDates.map(() => Math.floor(Math.random() * 100));
  return {
    name: city,
    type: "bar",
    stack: "total",
    data,
    emphasis: { focus: "series" },
    label: { show: false },
    itemStyle: {
      color: cityColorMap[city] || "#333",
    },
  };
});

const option = {
  legend: {
    type: "scroll",
    bottom: 10,
    data: allCities,
    textStyle: {
      fontSize: 16,
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "15%",
    containLabel: true,
    width: "90%",
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
  },
  series: citySeries,
};

const AccidentCityChart = () => {
  return (
    <MyPaper sx={{ display: "flex", gap: 1, padding: 1 }}>
      <Box sx={{ position: "relative", width: "100%" }}>
        <ReactECharts option={option} style={{ width: "100%", height: 400 }} />
      </Box>
    </MyPaper>
  );
};

export default AccidentCityChart;
