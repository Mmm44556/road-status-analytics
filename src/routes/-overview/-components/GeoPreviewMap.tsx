import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import MyPaper from "@/components/MyPaper";

const GeoPreviewMap = ({ height = "100%" }) => {
  const chartRef = useRef(null);
  let chartInstance: echarts.EChartsType | null = null;

  useEffect(() => {
    // 初始化圖表
    if (chartRef.current) {
      chartInstance = echarts.init(chartRef.current);
      chartInstance.showLoading();

      // 獲取台灣的GeoJSON數據
      fetch(
        "https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json"
      )
        .then((response) => response.json())
        .then((taiwanJson) => {
          // 註冊地圖
          echarts.registerMap("Taiwan", taiwanJson);

          // 準備人口數據 (示例數據，您可以替換為實際數據)
          const populationData = [
            { name: "臺北市", value: 2645041 },
            { name: "新北市", value: 3998441 },
            { name: "桃園市", value: 2268807 },
            { name: "臺中市", value: 2813490 },
            { name: "臺南市", value: 1874917 },
            { name: "高雄市", value: 2765932 },
            { name: "基隆市", value: 369982 },
            { name: "新竹市", value: 450743 },
            { name: "嘉義市", value: 267279 },
            { name: "新竹縣", value: 566735 },
            { name: "苗栗縣", value: 545642 },
            { name: "彰化縣", value: 1272784 },
            { name: "南投縣", value: 494490 },
            { name: "雲林縣", value: 679390 },
            { name: "嘉義縣", value: 505297 },
            { name: "屏東縣", value: 818361 },
            { name: "宜蘭縣", value: 457538 },
            { name: "花蓮縣", value: 327136 },
            { name: "臺東縣", value: 218127 },
            { name: "澎湖縣", value: 106166 },
            { name: "金門縣", value: 141023 },
            { name: "連江縣", value: 13165 },
          ];

          // 設置圖表選項
          const option = {
            tooltip: {
              trigger: "item",
              showDelay: 0,
              transitionDuration: 0.2,
              formatter: function (params) {
                const value = (params.value || 0).toLocaleString();
                return params.name + ": " + value + "人";
              },
            },

            visualMap: {
              left: "right",
              min: 100000,
              max: 4000000,
              inRange: {
                color: ["#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
              },
              text: ["高", "低"],
              calculable: true,
            },
            toolbox: {
              show: true,
              left: "left",
              top: "top",
              feature: {
                dataView: { readOnly: false },
                restore: {},
                saveAsImage: {},
              },
            },
            series: [
              {
                name: "即時路況擁塞水準",
                type: "map",
                map: "Taiwan",
                roam: true,
                zoom: 1.5,
                // 限制拖曳範圍
                boundingCoords: [
                  // 西南角座標 (左下)
                  [118.0, 21.5],
                  // 東北角座標 (右上)
                  [122.5, 26.5],
                ],
                // 設置初始縮放級別和中心點
                center: [120.5, 23.7],
                emphasis: {
                  label: {
                    show: true,
                  },
                },
                scaleLimit: {
                  min: 1.5,
                  max: 3.5,
                },
                label: {
                  show: true,
                  fontSize: 10,
                  formatter: function (params) {
                    return params.name;
                  },
                },
                data: populationData,
              },
            ],
          };

          // 應用選項
          chartInstance?.hideLoading();
          chartInstance?.setOption(option);
        })
        .catch((error) => {
          console.error("加載GeoJSON數據時出錯:", error);
          chartInstance?.hideLoading();
        });
    }

    // 清理
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, []);

  // 處理窗口大小變化
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <MyPaper sx={{ height: "100%" }}>
      <div ref={chartRef} style={{ width: "100%", height, margin: "0 auto" }} />
    </MyPaper>
  );
};

export default GeoPreviewMap;
