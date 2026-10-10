import React, { useState, useSyncExternalStore } from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { closeSidebar, setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import SettingsToggleRow from "../components/Settings/SettingsToggleRow.jsx";
import SettingsSelectRow from "../components/Settings/SettingsSelectRow.jsx";
import SettingsEditRow from "../components/Settings/SettingsEditRow.jsx";
import SettingsSection from "../components/Settings/SettingsSection.jsx";
import useStoredSetting from "../components/Settings/useStoredSetting.js";
import MaterialColumnsDialog from "../components/CourseMaterial/MaterialColumnsDialog.jsx";
import DockSectionsDialog from "../components/SideMenuDock/DockSectionsDialog.jsx";
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
  SIDE_MENU_DOCK_KEY,
  SIDE_MENU_STATE_KEY,
  START_PAGE_KEY,
} from "../../src/utils/storageKeys.js";
import { forgetStoredCredentials } from "../../src/helpers/academyCredentials.js";

const SIDE_MENU_STYLE_OPTIONS = [
  { value: false, label: "Classic" },
  { value: true, label: "Minimal" },
];

const Settings = () => {
  const dispatch = useDispatch();
  const [materialColumnsOpen, setMaterialColumnsOpen] = useState(false);
  const [dockSectionsOpen, setDockSectionsOpen] = useState(false);
  const dock = useStoredSetting(SIDE_MENU_DOCK_KEY, false, "Side menu style");
  const dockOn = dock.ready && dock.value === true;
  const classicOn = dock.ready && dock.value !== true;
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
    <Box sx={{ padding: "12px", boxSizing: "border-box", maxHeight: "100vh", overflowY: "auto" }}>
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
        <SettingsSection title="Sign-in & navigation">
          <SettingsToggleRow
            storageKey={SESSION_KEEPER_KEY}
            title="Keep me signed in"
            description="Automatically signs you in when PESU Academy logs you out. "
            onDisable={forgetStoredCredentials}
          />

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

        <SettingsSection title="Display">
          <SettingsEditRow
            title="Appearance"
            description="Change the way PESU Academy looks"
            onClick={() => dispatch(setCurrentPage("appearance"))}
            label="Open"
          />

          <SettingsEditRow
            title="Re-order material types"
            description="Move or hide the material columns of the Course Units table."
            onClick={() => setMaterialColumnsOpen(true)}
          />

          <SettingsSection title="Side menu" group isNew>
            <SettingsSelectRow
              storageKey={SIDE_MENU_DOCK_KEY}
              title="Side menu style"
              description="Minimal swaps the side menu for a dock of your sections and an All sections panel."
              options={SIDE_MENU_STYLE_OPTIONS}
            />

            {dockOn && (
              <SettingsEditRow
                title="Dock sections"
                description="Pick the sections that sit in the dock."
                onClick={() => setDockSectionsOpen(true)}
                label="Choose"
              />
            )}

            {classicOn && (
              <SettingsEditRow
                title="Re-order side menu"
                description="Drag the side-menu into the order you want."
                onClick={handleMenuEdit}
                disabled={!canReorder || isEditing}
                label={isEditing ? "Editing" : "Edit"}
              />
            )}

            {classicOn && (
              <SettingsToggleRow
                storageKey={SIDE_MENU_STATE_KEY}
                title="Keep side menu state"
                description="Puts the side menu back the way you left it, collapsed or open."
              />
            )}

            {classicOn && isEditing && (
              <Typography variant="body2" sx={settingsHintSx}>
                Edit mode is active on the page. Use Reset or the tick to lock the order in.
              </Typography>
            )}

            {classicOn && !canReorder && (
              <Typography variant="body2" sx={settingsWarningSx}>
                Open your PESU Academy profile page to re-order the menu.
              </Typography>
            )}
          </SettingsSection>
        </SettingsSection>
      </Stack>

      <MaterialColumnsDialog
        open={materialColumnsOpen}
        onClose={() => setMaterialColumnsOpen(false)}
      />

      <DockSectionsDialog open={dockSectionsOpen} onClose={() => setDockSectionsOpen(false)} />
    </Box>
  );
};

export default Settings;
