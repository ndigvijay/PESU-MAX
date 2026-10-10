import React from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsAccentRow from "../components/Settings/SettingsAccentRow.jsx";
import SettingsSelectRow from "../components/Settings/SettingsSelectRow.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import useStoredSetting from "../components/Settings/useStoredSetting.js";
import { settingsHintSx } from "../styles/styles.js";
import { FONT_OPTIONS, THEME_OPTIONS } from "../../src/content/theme";
import {
  MATERIAL_TABLE_KEY,
  MENU_ICONS_KEY,
  SIDE_MENU_DOCK_KEY,
  THEME_FONT_KEY,
  THEME_PALETTE_KEY,
  TOP_BAR_KEY,
} from "../../src/utils/storageKeys.js";

const Appearance = () => {
  const dispatch = useDispatch();
  const dock = useStoredSetting(SIDE_MENU_DOCK_KEY, false, "Side menu style");
  const dockOn = dock.ready && dock.value === true;

  const handleBack = () => {
    dispatch(setCurrentPage("settings"));
  };

  return (
    <Box sx={{ padding: "12px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <IconButton
          onClick={handleBack}
          aria-label="Back to settings"
          size="small"
          sx={{ color: theme.colors.secondary, padding: "2px" }}
        >
          <KeyboardBackspaceIcon sx={{ fontSize: "20px" }} />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ color: theme.colors.secondary, fontWeight: "bold", fontSize: "17px" }}
        >
          Appearance
        </Typography>
      </Box>

      <Stack spacing="8px">
        <SettingsAccentRow
          storageKey={THEME_PALETTE_KEY}
          title="Accent"
          description="Accent colour of the site, with a matching background."
          options={THEME_OPTIONS}
        />

        <SettingsSelectRow
          storageKey={THEME_FONT_KEY}
          title="Font"
          description="Typeface used across the site."
          options={FONT_OPTIONS}
        />

        <SettingsToggleRow
          storageKey={TOP_BAR_KEY}
          title="Remove top bar"
          description="Hides the PESU Academy header bar"
        />

        <SettingsToggleRow
          storageKey={MENU_ICONS_KEY}
          title="Better icons"
          description="Replaces the side-menu icons with better and bolder icons."
          disabled={dockOn}
        />

        {dockOn && (
          <Typography variant="body2" sx={settingsHintSx}>
            The minimal side menu always uses better icons.
          </Typography>
        )}

        <SettingsToggleRow
          storageKey={MATERIAL_TABLE_KEY}
          title="Improved Material table"
          description="Shows course material table using better icons, pills, flag dots."
        />
      </Stack>
    </Box>
  );
};

export default Appearance;
