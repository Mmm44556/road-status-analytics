import { createFileRoute } from "@tanstack/react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CrisisAlertRoundedIcon from "@mui/icons-material/CrisisAlertRounded";
import LocalHospitalRoundedIcon from "@mui/icons-material/LocalHospitalRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccidentRank from "@/routes/-overview/-components/AccidentRank";
import AccidentDonutPie from "@/routes/-overview/-components/AccidentDonutPie";
import { getAccidentTypeTotals, getLatestPeriod, getTopCities, useAccidentSummary } from "@/service/trafficApi";
import numberIntl from "@/utils/numberIntl";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { data, isPending, error } = useAccidentSummary();
  if (isPending) return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={520} /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">分析資料載入失敗：{error.message}</Alert></Box>;

  const period = getLatestPeriod(data.data);
  if (!period) return <Box sx={{ p: 3 }}><Alert severity="info">目前沒有可分析的事故資料。</Alert></Box>;
  const totals = getAccidentTypeTotals(data.data, period.year, period.month);
  const topCity = getTopCities(data.data, period.year, period.month, 1)[0];
  const metrics = [
    { label: "事故總數", value: totals.A1 + totals.A2 + totals.A3, suffix: "件", icon: CrisisAlertRoundedIcon, color: "warning.main" },
    { label: "A1 死亡事故", value: totals.A1, suffix: "件", icon: LocalHospitalRoundedIcon, color: "error.main" },
    { label: "事故最多縣市", value: topCity?.city ?? "—", suffix: "", icon: PlaceRoundedIcon, color: "secondary.main" },
  ];

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 4 } }}>
      <Box component="header" sx={{ mb: 3 }}>
        <Chip icon={<CalendarMonthRoundedIcon />} label={`最新可用資料 ${period.year}/${period.month}`} size="small" sx={{ mb: 1.25, bgcolor: "secondary.light", color: "secondary.dark", fontWeight: 750 }} />
        <Typography component="h1" variant="h1">事故趨勢分析</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 680 }}>從城市排行與事故類型理解道路風險。統計依 API 最新可用期間彙整，不代表今日即時事故量。</Typography>
      </Box>

      <Box component="section" aria-label="分析摘要" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0,1fr))" }, gap: 1.5, mb: 2 }}>
        {metrics.map(({ label, value, suffix, icon: Icon, color }) => (
          <Paper key={label} sx={{ p: 2.25, display: "grid", gridTemplateColumns: "48px 1fr", gap: 1.5, alignItems: "center" }}>
            <Box sx={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "background.default", color }}><Icon /></Box>
            <Box><Typography variant="body2" color="text.secondary" fontWeight={650}>{label}</Typography><Typography component="p" fontSize={{ xs: 24, md: 30 }} fontWeight={800} lineHeight={1.2}>{typeof value === "number" ? numberIntl(value) : value} <Typography component="span" color="text.secondary" fontSize={14}>{suffix}</Typography></Typography></Box>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
        <AccidentRank />
        <AccidentDonutPie />
      </Box>
      <Alert severity="info" sx={{ mt: 2 }}>資料來源：政府開放資料平臺與交通資料服務。結果僅供趨勢觀察。</Alert>
    </Box>
  );
}
