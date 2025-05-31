import { memo, useEffect, useState } from "react";
import MySelect from "@/components/MySelect";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useGetComponentProps from "@/hooks/useGetComponentProps";
import MyPaper from "@/components/MyPaper";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
interface DateCalendarValueProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
function DateCalendarValue({ setOpen }: DateCalendarValueProps) {
  const [startDate, setStartDate] = useState<Date | null>(
    new Date("2025-05-01")
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date("2025-05-31"));

  useEffect(() => {
    const controller = new AbortController();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        controller.abort();
      }
    };
    window.addEventListener("keydown", handleKeyDown, {
      signal: controller.signal,
    });
    return () => {
      controller.abort();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setOpen]);
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
        onClick={() => setOpen(false)}
      />
      <DemoContainer
        components={["DateCalendar", "DateCalendar"]}
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          border: "1px solid #e0e0e0",
          gap: 5,
          position: "absolute",
          bottom: 0,
          transform: "translateY(100%)",
          left: 0,
          bgcolor: "white",
          zIndex: 1000,
          "& .MuiDateCalendar-root": {
            margin: 0,
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
      </DemoContainer>
    </LocalizationProvider>
  );
}
function OverviewSelect() {
  const [open, setOpen] = useState(false);
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
      }}
    >
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
            Time Range
            <KeyboardArrowDownIcon sx={{ fontSize: 24, color: grey[600] }} />
          </Typography>
        </Box>
        {open && <DateCalendarValue setOpen={setOpen} />}
      </Box>
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
    </MyPaper>
  );
}

export default memo(OverviewSelect);
