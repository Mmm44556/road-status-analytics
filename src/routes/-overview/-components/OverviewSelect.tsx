import { memo, useState } from "react";
import MySelect from "@/components/MySelect";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useGetComponentProps from "@/hooks/useGetComponentProps";
import MyPaper from "@/components/MyPaper";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { Box, Button, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { format, addDays } from "date-fns";
import useWindowListener from "@/hooks/useEventListner";

function OverviewSelect() {
  const props = useGetComponentProps<typeof MySelect>({
    IconComponent: ExpandMoreIcon,
    sx: {
      paddingLeft: 1,
    },
    slotProps: {
      input: {
        sx: {
          padding: "4px",
        },
      },
    },
  });
  return (
    <MyPaper
      sx={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <TimeRangeSelect />
      <MySelect
        options={[]}
        onChange={() => {}}
        placeholder="Accident Type"
        value={""}
        {...props}
      />
      <MySelect
        options={[]}
        onChange={() => {}}
        placeholder="City"
        value={""}
        {...props}
      />
      <MySelect
        options={[]}
        onChange={() => {}}
        placeholder="Vehicle Type"
        value={""}
        {...props}
      />
      <Button
        variant="contained"
        size="small"
        sx={{
          maxHeight: "31px",
          width: 85,
          marginLeft: 1,
          bgcolor: grey[800],
        }}
      >
        查詢
      </Button>
    </MyPaper>
  );
}

const TimeRangeSelect = memo(() => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 30));
  useWindowListener([
    {
      event: "keydown",
      handler: (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
        }
      },
    },
  ]);
  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: 1,
        cursor: "pointer",
      }}
    >
      <Box
        onClick={() => {
          setOpen(!open);
        }}
        sx={{
          bgcolor: "white",
          borderRadius: 1,
          border: `1px solid ${grey[400]}`,
          paddingLeft: 1,
          height: "31px",
          "&:hover": {
            border: `1px solid ${grey[600]}`,
          },
        }}
      >
        <Typography
          sx={{
            fontSize: "1rem",
            whiteSpace: "nowrap",
            height: "100%",
            padding: 0.5,
            color: "#000",
            lineHeight: "1.4375em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {startDate && format(startDate, "yyyy-MM-dd")}
          {" ~ "}
          {endDate && format(endDate, "yyyy-MM-dd")}
          <KeyboardArrowDownIcon sx={{ fontSize: 24, color: grey[600] }} />
        </Typography>
      </Box>
      {open && (
        <>
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
            }}
            onClick={() => setOpen(false)}
          />
          <DateCalendarValue
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        </>
      )}
    </Box>
  );
});

interface DateCalendarValueProps {
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
}
function DateCalendarValue({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: DateCalendarValueProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          border: "1px solid #e0e0e0",
          gap: 5,
          position: "absolute",
          bottom: -10,
          transform: "translateY(100%)",
          left: 0,
          bgcolor: "white",
          zIndex: 1000,
          "& .MuiDateCalendar-root": {
            margin: 0,
          },
          animation: "fadeIn 0.1s ease-in",
          "@keyframes fadeIn": {
            from: {
              opacity: 0,
            },
            to: {
              opacity: 1,
            },
          },
        }}
      >
        <DateCalendar
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
        />

        <DateCalendar
          value={endDate}
          onChange={(newValue) => setEndDate(newValue)}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default memo(OverviewSelect);
