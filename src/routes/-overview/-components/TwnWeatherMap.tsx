import { useEffect, useState } from "react";
import { generateChartOption } from "@/utils/generateChartOption";
import { Paper } from "@mui/material";
import EChartsReact from "echarts-for-react";
import * as echarts from "echarts";
import taiwanGeoJson from "@/assets/geo/taiwan.json";
import instantPredictWeather from "@/mock/instantPredictWeather.json";
import { taiwanCities } from "@/constant";
import { grey } from "@mui/material/colors";
import { format } from "date-fns";

type GeoJson = Parameters<typeof echarts.registerMap>[1];

export default function TwnWeatherMap() {
  const [isMapRegistered, setIsMapRegistered] = useState(false);

  const sortedWeatherData = taiwanCities.map((city) => {
    const foundWeatherCity = instantPredictWeather.records.location.find(
      (f) => f.locationName === city
    );
    if (foundWeatherCity) {
      const weatherElement = foundWeatherCity.weatherElement;
      // 最高溫度
      const maxTemp = weatherElement.find((f) => f.elementName === "MaxT")
        ?.time?.[0]?.parameter;
      const tempStr = maxTemp?.parameterName ? maxTemp.parameterName : "N/A";

      // 降雨機率
      const rainProbability = weatherElement.find(
        (f) => f.elementName === "PoP"
      )?.time?.[0]?.parameter;
      const rainProbabilityStr = rainProbability?.parameterName
        ? `${rainProbability.parameterName}%`
        : "N/A";

      // 舒適度
      const comfortability = weatherElement.find((f) => f.elementName === "CI")
        ?.time?.[0]?.parameter;
      const comfortabilityStr = comfortability?.parameterName
        ? comfortability.parameterName
        : "N/A";

      return {
        city,
        temp: tempStr,
        rainProbability: rainProbabilityStr,
        comfortability: comfortabilityStr,
      };
    }
    return {
      city,
      temp: "N/A",
      rainProbability: "N/A",
      comfortability: "N/A",
    };
  });

  useEffect(() => {
    echarts.registerMap("Taiwan", taiwanGeoJson as GeoJson, {});
    setIsMapRegistered(true);
  }, []);

  const option = generateChartOption({
    title: {
      text: "當日溫度分布",
      left: 15,
      top: 15,
      subtext: format(new Date(), "yyyy/MM/dd"),
    },

    tooltip: {},
    legend: {},
    visualMap: {
      min: 20,
      max: 40,
      text: ["高", "低"],
      realtime: false,
      calculable: true,
      left: "right",
      top: "bottom",
      inRange: {
        color: ["lightskyblue", "yellow", "orangered"],
      },
    },
    series: [
      {
        map: "Taiwan",
        type: "map",
        roam: false,
        zoom: 1.5,

        data: sortedWeatherData.map((item) => ({
          name: item.city,
          value: Number(item.temp),
        })),
        tooltip: {
          formatter: (params) => {
            return params.name + (params.value ? `：${params.value}°C` : "");
          },
        },
        scaleLimit: {
          min: 1,
          max: 5,
        },
        emphasis: {
          itemStyle: {
            areaColor: grey[400], // 選到時的區域顏色（例如金色）
            borderColor: "#333", // 邊框顏色
            borderWidth: 2, // 邊框寬度
            shadowBlur: 10, // 陰影模糊
            shadowColor: "rgba(0,0,0,0.5)", // 陰影顏色
          },
        },
        select: {
          label: {
            show: true, // 一定要加這行
            color: "#000", // 你想要的顏色
            fontWeight: "bold",
          },
          itemStyle: {
            areaColor: grey[400], // 點擊選取時的顏色（例如番茄紅）
            borderColor: "#222",
            borderWidth: 3,
          },
        },
        label: {
          show: true,
          fontSize: 12,
          color: "#222",
          backgroundColor: "rgba(255,255,255,0.7)",
          borderRadius: 2,
          padding: [2, 4],
          overflow: "break", // 避免超出
        },
        layoutCenter: ["32%", "40%"],
        layoutSize: "90%",
        itemStyle: {
          borderColor: "#fff",
        },
      },
    ],
  });
  if (!isMapRegistered) {
    return <div>Loading map...</div>;
  }
  return (
    <Paper>
      <EChartsReact
        option={option}
        style={{ height: "400px" }}
        echarts={echarts}
      />
    </Paper>
  );
}
