import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsAccentRow from "../components/Settings/SettingsAccentRow.jsx";
import SettingsSelectRow from "../components/Settings/SettingsSelectRow.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import SettingsEditRow from "../components/Settings/SettingsEditRow.jsx";
import SettingsSection from "../components/Settings/SettingsSection.jsx";
import SideMenuSettings from "../components/Settings/SideMenuSettings.jsx";
import MaterialColumnsDialog from "../components/CourseMaterial/MaterialColumnsDialog.jsx";
import useStoredSetting from "../components/Settings/useStoredSetting.js";
import {
  DARK_ACCENT_OPTIONS,
  DEFAULT_DARK_ACCENT,
  FONT_OPTIONS,
  THEME_OPTIONS,
} from "../../src/content/theme";
import {
  MATERIAL_TABLE_KEY,
  THEME_DARK_ACCENT_KEY,
  THEME_DARK_KEY,
  THEME_FONT_KEY,
  THEME_PALETTE_KEY,
  TOP_BAR_KEY,
} from "../../src/utils/storageKeys.js";

const Appearance = () => {
  const dispatch = useDispatch();
  const [materialColumnsOpen, setMaterialColumnsOpen] = useState(false);
  const dark = useStoredSetting(THEME_DARK_KEY, false, "Dark mode");
  const darkOn = dark.ready && dark.value === true;

  const handleBack = () => {
    dispatch(setCurrentPage("settings"));
  };

  return (
    <Box sx={{
      padding: "12px",
      boxSizing: "border-box",
      height: "100%",
      minHeight: 0,
      overflowY: "auto",
    }}>
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

      <Stack spacing="16px">
        <SettingsSection title="Theme" group>
          {darkOn ? (
            <SettingsAccentRow
              storageKey={THEME_DARK_ACCENT_KEY}
              title="Dark Mode Accent"
              options={DARK_ACCENT_OPTIONS}
              fallback={DEFAULT_DARK_ACCENT}
              tone="dark"
              columns={4}
            />
          ) : (
            <SettingsAccentRow
              storageKey={THEME_PALETTE_KEY}
              title="Theme colour"
              options={THEME_OPTIONS}
            />
          )}

          <SettingsSelectRow
            storageKey={THEME_FONT_KEY}
            title="Font"
            description="Typeface used across the site"
            options={FONT_OPTIONS}
          />
        </SettingsSection>

        <SettingsSection title="Page" group>
          <SettingsToggleRow
            storageKey={TOP_BAR_KEY}
            title="Remove top bar"
            description="Hides the PESU Academy header bar"
          />
        </SettingsSection>

        <SettingsSection title="Side menu" group>
          <SideMenuSettings />
        </SettingsSection>

        <SettingsSection title="Course material" group>
          <SettingsToggleRow
            storageKey={MATERIAL_TABLE_KEY}
            title="Improved Material table"
            description="Shows course material table using better icons, pills, flag dots."
          />

          <SettingsEditRow
            title="Re-order material types"
            description="Move or hide the material columns of the Course Units table."
            onClick={() => setMaterialColumnsOpen(true)}
          />
        </SettingsSection>
      </Stack>

      <MaterialColumnsDialog
        open={materialColumnsOpen}
        onClose={() => setMaterialColumnsOpen(false)}
      />
    </Box>
  );
};

export default Appearance;
