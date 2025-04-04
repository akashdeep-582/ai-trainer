import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#000" },
    secondary: { main: "#666" },
    success: { main: "#444" },
    error: { main: "#444" },
    text: {
      primary: "#000",
      secondary: "#555",
    },
    background: {
      default: "#fff",
      paper: "#f9f9f9"
    }
  },
  typography: {
    fontFamily: '"SF Pro Display", "Roboto", "Helvetica Neue", Arial, sans-serif',
  },
});

export default theme;
