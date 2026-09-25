import React, { useSyncExternalStore } from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Button, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import EditIcon from "@mui/icons-material/Edit";
import { closeSidebar, setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsRow from "../components/Settings/SettingsRow.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import { settingsActionButtonSx, settingsHintSx, settingsWarningSx } from "../styles/styles.js";
import {
  getMenuReorderSnapshot,
  startMenuEdit,
  subscribeToMenuReorder,
} from "../../src/content/menuReorder.js";
import {
  SESSION_KEEPER_KEY,
  SIDE_MENU_STATE_KEY,
  TOP_BAR_KEY,
} from "../../src/utils/storageKeys.js";
import { forgetStoredCredentials } from "../../src/helpers/academyCredentials.js";

const Settings = () => {
  const dispatch = useDispatch();
  const { canReorder, isEditing } = useSyncExternalStore(
    subscribeToMenuReorder,
    getMenuReorderSnapshot,
    getMenuReorderSnapshot
  );

  const handleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  const handleEdit = () => {
    if (startMenuEdit()) {
      dispatch(closeSidebar());
    }
  };

  return (
    <Box sx={{ padding: "16px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <IconButton
          onClick={handleBack}
          aria-label="Back to home"
          sx={{ color: theme.colors.secondary, padding: "4px" }}
        >
          <KeyboardBackspaceIcon />
        </IconButton>
        <Typography variant="h6" sx={{ color: theme.colors.secondary, fontWeight: "bold" }}>
          Settings
        </Typography>
      </Box>

      <Stack spacing="12px">
        <SettingsRow
          title="Re-order side menu"
          description={
            "Drag the PESU Academy side-menu into the order you want. " +
            "Home always stays first."
          }
        >
          <Button
            onClick={handleEdit}
            disabled={!canReorder || isEditing}
            startIcon={<EditIcon sx={{ fontSize: "18px" }} />}
            sx={settingsActionButtonSx}
          >
            {isEditing ? "Editing" : "Edit"}
          </Button>
        </SettingsRow>

        <SettingsToggleRow
          storageKey={SESSION_KEEPER_KEY}
          title="Keep me signed in"
          description={
            "Automatically signs you in when PESU Academy logs you out. " +
            "Silently, in the background"
          }
          onDisable={forgetStoredCredentials}
        />

        <SettingsToggleRow
          storageKey={TOP_BAR_KEY}
          title="Remove top bar"
          description="Hides the PESU Academy header bar"
        />

        <SettingsToggleRow
          storageKey={SIDE_MENU_STATE_KEY}
          title="Keep side menu state"
          description="Puts the side menu back the way you left it, collapsed or open."
        />

        {isEditing && (
          <Typography variant="body2" sx={settingsHintSx}>
            Edit mode is active on the page. Use Reset or the tick to lock the order in.
          </Typography>
        )}

        {!canReorder && (
          <Typography variant="body2" sx={settingsWarningSx}>
            Open your PESU Academy profile page to re-order the menu.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default Settings;
