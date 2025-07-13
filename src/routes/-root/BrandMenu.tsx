import * as React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Box } from "@mui/material";
interface BrandMenuProps {
  title: React.ReactNode;
  subTitle: React.ReactNode;
}
export default function BrandMenu({ title, subTitle }: BrandMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        sx={{
          textTransform: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "start",
          justifyContent: "center",
          pt: 1.5,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "#000",

            fontWeight: 600,
            fontSize: '1.6rem',
          }}
        >
          {title}
        </Typography>
        {subTitle && (
          <Typography
            sx={{
              fontSize: "0.8rem",
              color: "#000",
              fontWeight: 600,
            }}
          >
            {subTitle}
          </Typography>
        )}
      </Button>
    </Box>
  );
}
