import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import CrisisAlertRoundedIcon from "@mui/icons-material/CrisisAlertRounded";
import LocalHospitalRoundedIcon from "@mui/icons-material/LocalHospitalRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { getAccidentTypeTotals, getLatestPeriod, getTopCities, useAccidentSummary } from "@/service/trafficApi";
import numberIntl from "@/utils/numberIntl";

export default function TrafficSummary() {
  const { data, isPending, error } = useAccidentSummary();
  if (isPending) return <Skeleton variant="rounded" height={226} aria-label="正在載入路況摘要" />;
  if (error) return <Alert severity="error">路況摘要載入失敗：{error.message}</Alert>;

  const period = getLatestPeriod(data.data);
  if (!period) return <Alert severity="info">目前沒有可顯示的事故資料。</Alert>;

  const totals = getAccidentTypeTotals(data.data, period.year, period.month);
  const topCity = getTopCities(data.data, period.year, period.month, 1)[0];
  const cards = [
    { label: "事故總數", value: totals.A1 + totals.A2 + totals.A3, icon: CrisisAlertRoundedIcon, color: "warning.main" },
    { label: "傷亡事故", value: totals.A1 + totals.A2, icon: LocalHospitalRoundedIcon, color: "error.main" },
    { label: "事故最多", value: topCity?.city ?? "—", icon: PlaceRoundedIcon, color: "secondary.main" },
  ];

  return (
    <Paper component="section" aria-labelledby="traffic-summary-title" sx={{ p: 2.25 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1.5 }}>
        <Typography id="traffic-summary-title" component="h2" variant="h3">路況摘要</Typography>
        <Typography variant="caption" color="text.secondary">資料期間 {period.year}/{period.month}</Typography>
      </Box>
      <Box sx={{ display: "grid", gap: 1 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Box key={label} sx={{ display: "grid", gridTemplateColumns: "38px 1fr auto", alignItems: "center", gap: 1, py: 1.1, borderTop: "1px solid", borderColor: "divider" }}>
            <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: "background.default", color }}><Icon fontSize="small" /></Box>
            <Typography variant="body2" color="text.secondary" fontWeight={650}>{label}</Typography>
            <Typography fontWeight={800} fontSize={18}>{typeof value === "number" ? numberIntl(value) : value}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
