import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
const MyPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles("dark", {
    backgroundColor: "#1A2027",
  }),
  [theme.breakpoints.down("xl")]: {
    flexDirection: "column-reverse",
  },
}));
export default MyPaper;
