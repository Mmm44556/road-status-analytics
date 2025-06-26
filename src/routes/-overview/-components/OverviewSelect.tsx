import { memo, useState } from "react";
import { addDays, format } from "date-fns";
import MySelect, { type MySelectProps } from "@/components/MySelect";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useGetComponentProps from "@/hooks/useGetComponentProps";
import MyPaper from "@/components/MyPaper";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { Box, Button, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import useWindowListener from "@/hooks/useEventListner";
import { useGetSearchFormContext } from "@/hooks/useGetFormContext";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { searchSchema, type SearchFormType } from "@/zod";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

function OverviewSelect() {
  const methods = useForm<SearchFormType>({
    resolver: standardSchemaResolver(searchSchema),
    defaultValues: {
      startDate: addDays(new Date(), -30),
      endDate: new Date(),
      eventType: "",
      city: "",
      vehicleType: "",
    },
  });

  const onSubmit = (data: SearchFormType) => {
    console.log(data);
  };
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <MyPaper
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* 時間範圍選擇 */}
          <TimeRangeSelect />

          {/* 事件類型選擇 */}
          <ControllerSelect
            name="eventType"
            options={[]}
            placeholder="Accident Type"
          />

          {/* 城市選擇 */}
          <ControllerSelect name="city" options={[]} placeholder="City" />

          {/* 車輛類型選擇 */}
          <ControllerSelect
            name="vehicleType"
            options={[]}
            placeholder="Vehicle Type"
          />

          {/* 查詢按鈕 */}
          <Button
            type="submit"
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
      </form>
    </FormProvider>
  );
}

interface ControllerSelectProps
  extends Omit<MySelectProps, "value" | "onChange"> {
  name: keyof Omit<SearchFormType, "startDate" | "endDate">;
  onChange?: (value: unknown) => void;
}
const ControllerSelect = memo(
  ({
    name,
    options,
    placeholder,
    onChange,
    ...props
  }: ControllerSelectProps) => {
    const { control } = useGetSearchFormContext();

    const styleProps = useGetComponentProps<typeof MySelect>({
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
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <MySelect
            options={options}
            onChange={(value) => {
              field.onChange(value);
              onChange?.(value);
            }}
            placeholder={placeholder}
            value={field.value}
            {...styleProps}
            {...props}
          />
        )}
      />
    );
  }
);

const TimeRangeSelect = memo(() => {
  const [open, setOpen] = useState(false);
  const { control } = useGetSearchFormContext();
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

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
          <DateCalendarValue />
        </>
      )}
    </Box>
  );
});

function DateCalendarValue() {
  const { control } = useGetSearchFormContext();
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
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <DateCalendar
              value={field.value}
              onChange={(newValue) => field.onChange(newValue)}
            />
          )}
        />

        <Controller
          name="endDate"
          control={control}
          render={({ field }) => (
            <DateCalendar
              value={field.value}
              onChange={(newValue) => field.onChange(newValue)}
            />
          )}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default memo(OverviewSelect);
