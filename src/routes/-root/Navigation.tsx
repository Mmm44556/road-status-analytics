import React from "react";
import Tabs from "@mui/material/Tabs";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import { navigationItems } from "@/data/navigationItems";
import { useNavigate } from "@tanstack/react-router";

export default function Navigation() {
  const [value, setValue] = React.useState(0);
  const navigate = useNavigate();
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // event.type can be equal to focus with selectionFollowsFocus.
    if (
      event.type !== "click" ||
      (event.type === "click" &&
        samePageLinkNavigation(
          event as React.MouseEvent<HTMLAnchorElement, MouseEvent>
        ))
    ) {
      setValue(newValue);
      navigate({ to: navigationItems[newValue].href });
    }
  };

  return (
    <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="nav tabs example"
        role="navigation"
      >
        {navigationItems.map((item, index) => (
          <NavItem
            key={index}
            label={
              <>
                <item.icon />
                <span>{item.label}</span>
              </>
            }
            href={item.href}
          />
        ))}
      </Tabs>
    </Box>
  );
}

interface NavItemProps {
  label?: React.ReactNode;
  href?: string;
  selected?: boolean;
}

function NavItem(props: NavItemProps) {
  return (
    <Tab
      component="a"
      sx={{
        height: "76px",
        flexDirection: "row",
        gap: "5px",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        // Routing libraries handle this, you can remove the onClick handle when using them.
        if (samePageLinkNavigation(event)) {
          event.preventDefault();
        }
      }}
      aria-current={props.selected && "page"}
      {...props}
    />
  );
}

function samePageLinkNavigation(
  event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 || // ignore everything but left-click
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }
  return true;
}
