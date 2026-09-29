import React, { useState, useSyncExternalStore } from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { closeSidebar, setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import SettingsSelectRow from "../components/Settings/SettingsSelectRow.jsx";
import SettingsEditRow from "../components/Settings/SettingsEditRow.jsx";
import MaterialColumnsDialog from "../components/CourseMaterial/MaterialColumnsDialog.jsx";
import { settingsHintSx, settingsWarningSx } from "../styles/styles.js";
import {
  getMenuReorderSnapshot,
  startMenuEdit,
  subscribeToMenuReorder,
} from "../../src/content/menuReorder";
import { START_PAGE_OPTIONS } from "../../src/content/startPage";
import {
  BACK_NAVIGATION_KEY,
  SESSION_KEEPER_KEY,
  SIDE_MENU_STATE_KEY,
  START_PAGE_KEY,
  TOP_BAR_KEY,
} from "../../src/utils/storageKeys.js";
import { forgetStoredCredentials } from "../../src/helpers/academyCredentials.js";

const Settings = () => {
  const dispatch = useDispatch();
  const [materialColumnsOpen, setMaterialColumnsOpen] = useState(false);
  const { canReorder, isEditing } = useSyncExternalStore(
    subscribeToMenuReorder,
    getMenuReorderSnapshot,
    getMenuReorderSnapshot
  );

  const handleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  const handleMenuEdit = () => {
    if (startMenuEdit()) {
      dispatch(closeSidebar());
    }
  };

  return (
    <Box sx={{ padding: "12px" }}>
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

      <Stack spacing="8px">
        <SettingsToggleRow
          storageKey={SESSION_KEEPER_KEY}
          title="Keep me signed in"
          description="Automatically signs you in when PESU Academy logs you out. "
          onDisable={forgetStoredCredentials}
        />

        <SettingsSelectRow
          storageKey={START_PAGE_KEY}
          title="Set the start page"
          description="Opens this page instead of Home"
          options={START_PAGE_OPTIONS}
        />

        <SettingsToggleRow
          storageKey={BACK_NAVIGATION_KEY}
          title="disable back button"
          description="Back returns to your previous page instead of logging you out. persists on the next page load."
        />

        <SettingsEditRow
          title="Re-order material types"
          description="Move or hide the material columns of the Course Units table."
          onClick={() => setMaterialColumnsOpen(true)}
        />

        <SettingsEditRow
          title="Re-order side menu"
          description="Drag the side-menu into the order you want."
          onClick={handleMenuEdit}
          disabled={!canReorder || isEditing}
          label={isEditing ? "Editing" : "Edit"}
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

      <MaterialColumnsDialog
        open={materialColumnsOpen}
        onClose={() => setMaterialColumnsOpen(false)}
      />
    </Box>
  );
};

export default Settings;
