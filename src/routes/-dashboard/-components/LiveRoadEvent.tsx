import * as React from "react"
import { useTheme } from "@mui/material/styles"
import AppBar from "@mui/material/AppBar"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select, { type SelectChangeEvent } from "@mui/material/Select"
import { FormHelperText } from "@mui/material"

interface TabPanelProps {
  children?: React.ReactNode
  dir?: string
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
    sx: {
      fontSize: "1.1rem",
    },
  }
}

export default function LiveRoadEvent() {
  const theme = useTheme()
  const [value, setValue] = React.useState(0)

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  return (
    <Box sx={{ bgcolor: "background.paper" }}>
      <AppBar position='static'>
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor='secondary'
          textColor='inherit'
          variant='fullWidth'
          aria-label='full width tabs example'
        >
          <Tab label='道路預告事件' {...a11yProps(0)} />
          <Tab label='道路即時事件' {...a11yProps(1)} />
        </Tabs>
      </AppBar>

      {/* 過濾功能 */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, p: 1 }}>
        {/* 搜尋 */}
        <TextField
          id='standard-search'
          label='Search field'
          type='search'
          variant='standard'
          fullWidth
        />

        {/* 縣市選擇 */}
        <CitySelect />
      </Box>

      {/* 預告性事件 */}
      <TabPanel value={value} index={0} dir={theme.direction}>
        道路預告事件
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        道路即時事件
      </TabPanel>
    </Box>
  )
}

export function CitySelect() {
  const [age, setAge] = React.useState("")

  const handleChange = (event: SelectChangeEvent) => {
    setAge(event.target.value)
  }

  return (
    <FormControl sx={{ m: 1 }} size='small'>
      <Select
        value={age}
        onChange={handleChange}
        displayEmpty
        inputProps={{ "aria-label": "Without label" }}
      >
        <MenuItem value=''>
          <em>None</em>
        </MenuItem>
        <MenuItem value={10}>Ten</MenuItem>
        <MenuItem value={20}>Twenty</MenuItem>
        <MenuItem value={30}>Thirty</MenuItem>
      </Select>
      <FormHelperText></FormHelperText>
    </FormControl>
  )
}
