import React from "react";
import { IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import theme from "../Themes/theme.jsx";
import useStoredSetting from "./Settings/useStoredSetting.js";
import { THEME_DARK_KEY } from "../../src/utils/storageKeys.js";

const ThemeModeButton = () => {
  const dark = useStoredSetting(THEME_DARK_KEY, false, "Dark mode");
  const darkOn = dark.ready && dark.value === true;
  const label = darkOn ? "Switch to light mode" : "Switch to dark mode";

  return (
    <IconButton
      onClick={() => dark.update(!darkOn)}
      disabled={!dark.ready || dark.saving}
      aria-label={label}
      title={label}
      size="large"
      sx={{ color: theme.colors.icon }}
    >
      {darkOn ? <LightModeIcon fontSize="large" /> : <DarkModeIcon fontSize="large" />}
    </IconButton>
  );
};

export default ThemeModeButton;
