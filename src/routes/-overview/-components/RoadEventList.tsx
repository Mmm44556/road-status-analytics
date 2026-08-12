import { Fragment, memo, useState, startTransition, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import {
  Card,
  CardActionArea,
  CardContent,
  Divider,
} from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { format } from "date-fns";
import getEventDescription from "@/config/eventType";
import debounce from "@/utils/debounce";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import {
  useRoadEvents,
  type LiveRoadEvent,
  type PreviewRoadEvent,
} from "@/service/trafficApi";
import { parseWKTPolygon } from "@/service/map/wkt";
import { getWktRepresentativePoint } from "@/service/map/mapFeatures";
interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
    sx: {
      fontSize: 16,
    },
  };
}

type RoadEventListProps = { city: string };

function RoadEventList({ city }: RoadEventListProps) {
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = debounce(setSearchValue, 500);
  const { data, isPending, isError } = useRoadEvents(city);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value);
  };
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    startTransition(() => {
      setValue(newValue);
    });
  };

  const previewEvents = useMemo<PreviewRoadEvent[]>(
    () => filterFormat(data?.data.preview.Events ?? [], "EventPreview"),
    [data]
  );
  const liveEvents = useMemo<LiveRoadEvent[]>(
    () => filterFormat(data?.data.live.LiveEvents ?? [], "LiveEvent"),
    [data]
  );
  // 事件過濾
  const filteredEvents = useMemo(() => {
    return previewEvents.filter(
      (event) =>
        event.EventTitle.includes(searchValue) ||
        event.Location.Other.includes(searchValue) ||
        event.EffectiveTime.includes(searchValue) ||
        event.ExpireTime.includes(searchValue) ||
        event.PublishTime.includes(searchValue) ||
        event.LastUpdateTime.includes(searchValue)
    );
  }, [searchValue, previewEvents]);

  const filteredLiveEvents = useMemo(() => {
    return liveEvents.filter(
      (event) =>
        event.EventTitle.includes(searchValue) ||
        event.Location.Other.includes(searchValue) ||
        event.PublishTime.includes(searchValue)
    );
  }, [searchValue, liveEvents]);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        height: 450,
        overflow: "auto",
        borderRadius: 1,
      }}
    >
      <AppBar
        position="static"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
        >
          <Tab
            label={`道路預告事件(${filteredEvents.length})`}
            {...a11yProps(0)}
          />
          <Tab
            label={`道路即時事件(${filteredLiveEvents.length})`}
            {...a11yProps(1)}
          />
        </Tabs>
      </AppBar>

      {/* 過濾功能 */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, p: 1 }}>
        {/* 搜尋 */}
        <TextField
          id="standard-search"
          placeholder="搜尋"
          type="search"
          variant="standard"
          fullWidth
          onChange={handleSearch}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* 預告性事件 */}
      <TabPanel value={value} index={0} dir={theme.direction}>
        {isPending && <EventStatus message="正在取得 TDX 道路事件…" />}
        {isError && <EventStatus message="目前無法取得道路事件，請稍後再試。" />}
        {!isPending && !isError && filteredEvents.length === 0 && <EventStatus message="目前沒有符合條件的預告事件。" />}
        {filteredEvents.map((event) => {
          return (
            <Fragment key={event.EventID}>
              <EventCard
                event={event}
                setActiveEvent={setActiveEvent}
                activeEvent={activeEvent}
              />
              <Divider />
            </Fragment>
          );
        })}
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        {isPending && <EventStatus message="正在取得 TDX 即時路況…" />}
        {isError && <EventStatus message="目前無法取得即時路況，請稍後再試。" />}
        {!isPending && !isError && filteredLiveEvents.length === 0 && <EventStatus message="目前沒有符合條件的即時事件。" />}
        {filteredLiveEvents.map((event) => {
          return (
            <Fragment key={event.EventID}>
              <LiveEventCard
                event={event}
                setActiveEvent={setActiveEvent}
                activeEvent={activeEvent}
              />
              <Divider />
            </Fragment>
          );
        })}
      </TabPanel>
    </Box>
  );
}

type CardProps = React.ComponentProps<typeof Card>;

type EventCardProps = {
  event: PreviewRoadEvent;
  setActiveEvent: React.Dispatch<React.SetStateAction<string | null>>;
  activeEvent: string | null;
} & CardProps;

function EventCard({
  event,
  setActiveEvent,
  activeEvent,
  ...props
}: EventCardProps) {
  const { mapController } = useTrafficMapContext();

  const eventDescription = getEventDescription(
    event.EventType.toString(),
    event.EventSubType.toString()
  );
  const handleFlyTo = () => {
    const points = parseWKTPolygon(event.Geometry);
    const position = getWktRepresentativePoint(event.Positions);
    if (!points && !position) return;

    setActiveEvent(event.EventID);
    mapController.showGeometry(points
      ? {
          id: event.EventID,
          type: "polygon",
          coordinates: points as [number, number][],
          color: eventDescription.iconColor,
        }
      : {
          id: event.EventID,
          type: "point",
          coordinates: position!,
          color: eventDescription.iconColor,
        });
    mapController.flyTo((points?.[0] as [number, number] | undefined) ?? position!, 18);
  };

  return (
    <Card
      data-active={activeEvent === event.EventID}
      sx={(theme) => ({
        boxShadow: "none",
        borderBottom: "1px solid #e0e0e0",
        borderRadius: 0,
        "&[data-active='true']": {
          backgroundColor: theme.palette.primary.light,
        },
      })}
      component="div"
      {...props}
    >
      <CardActionArea onClick={handleFlyTo}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {eventDescription.Icon && <Box sx={{ width: 40, height: 40, flex: "0 0 40px", display: "grid", placeItems: "center", borderRadius: 2, bgcolor: eventDescription.iconBackground, color: eventDescription.iconColor }}><eventDescription.Icon sx={{ fontSize: 24 }} /></Box>}
          <Box
            sx={{ display: "flex", flexDirection: "column" }}
            component="span"
          >
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              事件: {event.EventTitle}
            </Typography>

            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
                maxWidth: "240px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              地點: {event.Location.Other}
            </Typography>
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              持續時間: {event.EffectiveTime} ~ {event.ExpireTime}
            </Typography>
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              發佈時間: {event.PublishTime}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

type LiveEventCardProps = {
  event: LiveRoadEvent;
  setActiveEvent: React.Dispatch<React.SetStateAction<string | null>>;
  activeEvent: string | null;
} & CardProps;

function LiveEventCard({
  event,
  setActiveEvent,
  activeEvent,
  ...props
}: LiveEventCardProps) {
  const { mapController } = useTrafficMapContext();
  const handleFlyTo = () => {
    const match = event.Positions.match(/POINT\s*\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(" ").map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        setActiveEvent(event.EventID);

        mapController.showGeometry({
          id: event.EventID,
          type: "point",
          coordinates: [lng, lat],
          color: eventDescription.iconColor,
        });
        mapController.flyTo([lng, lat], 18);
      }
    }
  };

  const eventDescription = getEventDescription(
    event.EventType.toString(),
    event.EventSubType.toString()
  );
  return (
    <Card
      data-active={activeEvent === event.EventID}
      sx={(theme) => ({
        boxShadow: "none",
        borderBottom: "1px solid #e0e0e0",
        borderRadius: 0,
        "&[data-active='true']": {
          backgroundColor: theme.palette.primary.light,
        },
      })}
      component="div"
      {...props}
    >
      <CardActionArea onClick={handleFlyTo}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {eventDescription.Icon && <Box sx={{ width: 40, height: 40, flex: "0 0 40px", display: "grid", placeItems: "center", borderRadius: 2, bgcolor: eventDescription.iconBackground, color: eventDescription.iconColor }}><eventDescription.Icon sx={{ fontSize: 24 }} /></Box>}
          <Box
            sx={{ display: "flex", flexDirection: "column" }}
            component="span"
          >
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              事件: {event.EventTitle}
            </Typography>

            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              地點: {event.Location.Other}
            </Typography>
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              發佈時間: {event.PublishTime}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function filterFormat<T extends PreviewRoadEvent | LiveRoadEvent>(
  events: T[],
  type: T extends PreviewRoadEvent ? "EventPreview" : "LiveEvent"
): T[] {
  if (type === "EventPreview") {
    return (events as PreviewRoadEvent[]).map((event) => ({
      ...event,
      PublishTime: format(new Date(event.PublishTime), "yyyy-MM-dd HH:mm:ss"),
      EffectiveTime: format(
        new Date(event.EffectiveTime),
        "yyyy-MM-dd HH:mm:ss"
      ),
      ExpireTime: format(new Date(event.ExpireTime), "yyyy-MM-dd HH:mm:ss"),
      LastUpdateTime: format(
        new Date(event.LastUpdateTime),
        "yyyy-MM-dd HH:mm:ss"
      ),
    })) as T[];
  } else {
    return events.map((event) => ({
      ...event,
      PublishTime: format(new Date(event.PublishTime), "yyyy-MM-dd HH:mm:ss"),
    })) as T[];
  }
}

function EventStatus({ message }: { message: string }) {
  return <Typography color="text.secondary" sx={{ px: 2, py: 3, textAlign: "center" }}>{message}</Typography>;
}

export default memo(RoadEventList);
