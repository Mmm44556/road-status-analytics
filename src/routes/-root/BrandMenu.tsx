import * as React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Box } from "@mui/material";
interface BrandMenuProps {
  title: React.ReactNode;
}
export default function BrandMenu({ title }: BrandMenuProps) {
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
        sx={{ textTransform: "none" }}
      >
        <Typography
          variant="h5"
          sx={{
            my: 2,
            color: "#000",
            fontSize: {
              "2xl": "1.6rem",
              xl: "1.5rem",
              lg: "1.3rem",
            },
          }}
        >
          {title}
        </Typography>
      </Button>
    </Box>
  );
}
