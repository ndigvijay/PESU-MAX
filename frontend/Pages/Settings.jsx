import React from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import SettingsSelectRow from "../components/Settings/SettingsSelectRow.jsx";
import SettingsEditRow from "../components/Settings/SettingsEditRow.jsx";
import SettingsSection from "../components/Settings/SettingsSection.jsx";
import useStoredSetting from "../components/Settings/useStoredSetting.js";
import { settingsHintSx } from "../styles/styles.js";
import { START_PAGE_OPTIONS } from "../../src/content/startPage";
import { MERGE_MODE_OPTIONS } from "../../src/helpers/mergeModes.js";
import {
  ACADEMY_CREDENTIAL_KEY,
  BACK_NAVIGATION_KEY,
  MERGE_MODE_KEY,
  SESSION_KEEPER_KEY,
  START_PAGE_KEY,
} from "../../src/utils/storageKeys.js";
import { forgetStoredCredentials } from "../../src/helpers/academyCredentials.js";

const Settings = () => {
  const dispatch = useDispatch();
  const sessionKeeper = useStoredSetting(SESSION_KEEPER_KEY, false, "Keep me signed in");
  const savedSignIn = useStoredSetting(ACADEMY_CREDENTIAL_KEY, null, "saved sign-in");
  const awaitingSignIn = sessionKeeper.ready && sessionKeeper.value === true &&
    savedSignIn.ready && !savedSignIn.value;

  const handleBack = () => {
    dispatch(setCurrentPage("home"));
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
          aria-label="Back to home"
          size="small"
          sx={{ color: theme.colors.secondary, padding: "2px" }}
        >
          <KeyboardBackspaceIcon sx={{ fontSize: "20px" }} />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ color: theme.colors.secondary, fontWeight: "bold", fontSize: "17px" }}
        >
          Settings
        </Typography>
      </Box>

      <Stack spacing="16px">
        <SettingsEditRow
          title="Appearance"
          description="Change the way PESU Academy looks"
          onClick={() => dispatch(setCurrentPage("appearance"))}
          label="Open"
        />

        <SettingsSection title="Sign-in & navigation">
          <SettingsToggleRow
            storageKey={SESSION_KEEPER_KEY}
            title="Keep me signed in"
            description="Automatically signs you in when PESU Academy logs you out. "
            onDisable={forgetStoredCredentials}
          />

          {awaitingSignIn && (
            <Typography variant="body2" sx={settingsHintSx}>
              Sign out and sign in to PESU Academy once to finish turning this on.
            </Typography>
          )}

          <SettingsToggleRow
            storageKey={BACK_NAVIGATION_KEY}
            title="Enable back button"
            description="Back returns to your previous page instead of logging you out. persists on the next page load."
          />

          <SettingsSelectRow
            storageKey={START_PAGE_KEY}
            title="Set the start page"
            description="Opens this page instead of Home after login"
            options={START_PAGE_OPTIONS}
          />
        </SettingsSection>

        <SettingsSection title="Downloads">
          <SettingsSelectRow
            storageKey={MERGE_MODE_KEY}
            title="Default merge mode"
            description="Groups merged PDFs per subject or per unit when downloading course materials."
            options={MERGE_MODE_OPTIONS}
          />
        </SettingsSection>

        <Typography variant="body2" sx={{ ...settingsHintSx, textAlign: "center" }}>
          Sidebar and courses config have been moved to Appearance.
        </Typography>
      </Stack>
    </Box>
  );
};

export default Settings;
