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
  type Theme,
} from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { format } from "date-fns";
import getEventDescription from "@/config/eventType";
import mockLiveRoadEvents from "@/mock/liveRoadEvents.json";
import mockPreviewEvents from "@/mock/previewEvents.json";
import debounce from "@/utils/debounce";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import { parseWKTPolygon } from "@/service/arcGIS/parser";
import { Point, Polygon } from "@arcgis/core/geometry";
import Graphic from "@arcgis/core/Graphic";
import locationIcon from "@/assets/location-fill.svg";
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

function RoadEventList() {
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = debounce(setSearchValue, 500);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value);
  };
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    startTransition(() => {
      setValue(newValue);
    });
  };

  const previewEvents = useMemo<EventPreview[]>(
    () => filterFormat(mockPreviewEvents.Events, "EventPreview"),
    []
  );
  const liveEvents = useMemo<LiveEvent[]>(
    () => filterFormat(mockLiveRoadEvents.LiveEvents, "LiveEvent"),
    []
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

type EventBase = {
  EventID: string;
  EventTitle: string;
  Description: string;
  EventType: number;
  EventSubType: number;
  EventStep: number;
  EffectiveTime: string;
  LocationType: number;
  Location: {
    Other: string;
  };
  Source: string;
  PublishTime: string;
  LastUpdateTime: string;
};

type EventPreview = EventBase & {
  ExpireTime: string;
  Geometry: string;
};

type CardProps = React.ComponentProps<typeof Card>;

type EventCardProps = {
  event: EventPreview;
  setActiveEvent: React.Dispatch<React.SetStateAction<string | null>>;
  activeEvent: string | null;
} & CardProps;

const eventSet = new Set<string>();

function EventCard({
  event,
  setActiveEvent,
  activeEvent,
  ...props
}: EventCardProps) {
  const { view } = useTrafficMapContext();

  const eventDescription = getEventDescription(
    event.EventType.toString(),
    event.EventSubType.toString()
  );
  const handleFlyTo = () => {
    const points = parseWKTPolygon(event.Geometry);
    if (!points) return;

    const polygon = new Polygon({
      rings: [points],
      spatialReference: { wkid: 4326 },
    });
    console.log({ eventDescription, event });

    setActiveEvent(event.EventID);
    if (!eventSet.has(event.EventID)) {
      eventSet.add(event.EventID);

      // 設定圖層
      view?.current?.graphics.add(
        new Graphic({
          geometry: polygon,
          symbol: {
            type: "simple-fill",
            color: [255, 0, 0, 0.3],
            outline: {
              color: [255, 0, 0],
              width: 2,
            },
          },
        })
      );
      console.log(eventDescription.iconDataUri);
      // 設定地點標示
      view?.current?.graphics.add(
        new Graphic({
          geometry: polygon,

          symbol: {
            type: "picture-marker",
            yoffset: 20,
            url: eventDescription.iconDataUri,
            width: 28,
            height: 28,
          },
        })
      );
    }

    view?.current?.goTo({
      target: polygon.rings[0][0],
      zoom: 18,
    });
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
          {eventDescription.Icon && (
            <eventDescription.Icon
              sx={{
                fontSize: {
                  xs: 24,
                  sm: 28,
                  md: 32,
                  lg: 36,
                  xl: 40,
                },
                color: eventDescription.iconColor,
              }}
            />
          )}
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

type LiveEvent = EventBase & {
  Positions: string;
};
type LiveEventCardProps = {
  event: LiveEvent;
  setActiveEvent: React.Dispatch<React.SetStateAction<string | null>>;
  activeEvent: string | null;
} & CardProps;

function LiveEventCard({
  event,
  setActiveEvent,
  activeEvent,
  ...props
}: LiveEventCardProps) {
  const { view } = useTrafficMapContext();
  const handleFlyTo = () => {
    const match = event.Positions.match(/POINT\s*\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(" ").map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        const point = new Point({
          longitude: lng,
          latitude: lat,
          spatialReference: { wkid: 4326 },
        });

        setActiveEvent(event.EventID);

        if (!eventSet.has(event.EventID)) {
          eventSet.add(event.EventID);
          view?.current?.graphics.add(
            new Graphic({
              geometry: point,
              symbol: {
                type: "simple-marker",
                color: [255, 0, 0],
                size: "12px",
                outline: {
                  color: [255, 255, 255],
                  width: 1,
                },
              },
            })
          );

          view?.current?.graphics.add(
            new Graphic({
              geometry: point,
              symbol: {
                type: "picture-marker",
                url: eventDescription.iconDataUri,
                width: 28,
                height: 28,
              },
            })
          );
        }

        view?.current?.goTo({
          target: point,
          zoom: 18,
        });
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
          {eventDescription.Icon && (
            <eventDescription.Icon
              sx={{ fontSize: 32, color: eventDescription.iconColor }}
            />
          )}
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

function filterFormat<T extends EventPreview | LiveEvent>(
  events: T[],
  type: T extends EventPreview ? "EventPreview" : "LiveEvent"
): T[] {
  if (type === "EventPreview") {
    return (events as EventPreview[]).map((event) => ({
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

export default memo(RoadEventList);
