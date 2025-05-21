import type {
  BarSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
} from "echarts/charts"
import type {
  DatasetComponentOption,
  GridComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
} from "echarts/components"
import type { ComposeOption } from "echarts/core"
import type { ECBasicOption } from "echarts/types/dist/shared"

export type EChartsOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
> & {
  media?: EChartMediaOption
}

export type EChartMediaOption = ECBasicOption["media"]
