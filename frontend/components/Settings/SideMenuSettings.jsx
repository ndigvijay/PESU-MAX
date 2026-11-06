import React, { useState, useSyncExternalStore } from "react";
import { useDispatch } from "react-redux";
import { Typography } from "@mui/material";
import { closeSidebar } from "../../redux/sidebarSlice.js";
import SettingsSelectRow from "./SettingsSelectRow.jsx";
import SettingsToggleRow from "./SettingsToggleRow.jsx";
import SettingsEditRow from "./SettingsEditRow.jsx";
import DockSectionsDialog from "../SideMenuDock/DockSectionsDialog.jsx";
import useStoredSetting from "./useStoredSetting.js";
import { settingsHintSx, settingsWarningSx } from "../../styles/styles.js";
import {
  getMenuReorderSnapshot,
  startMenuEdit,
  subscribeToMenuReorder,
} from "../../../src/content/menuReorder";
import {
  MENU_ICONS_KEY,
  SIDE_MENU_DOCK_KEY,
  SIDE_MENU_STATE_KEY,
} from "../../../src/utils/storageKeys.js";

const SIDE_MENU_STYLE_OPTIONS = [
  { value: false, label: "Classic" },
  { value: true, label: "Minimal" },
];

const SideMenuSettings = () => {
  const dispatch = useDispatch();
  const [dockSectionsOpen, setDockSectionsOpen] = useState(false);
  const dock = useStoredSetting(SIDE_MENU_DOCK_KEY, false, "Side menu style");
  const dockOn = dock.ready && dock.value === true;
  const classicOn = dock.ready && dock.value !== true;
  const { canReorder, isEditing } = useSyncExternalStore(
    subscribeToMenuReorder,
    getMenuReorderSnapshot,
    getMenuReorderSnapshot
  );

  const handleMenuEdit = () => {
    if (startMenuEdit()) {
      dispatch(closeSidebar());
    }
  };

  return (
    <>
      <SettingsSelectRow
        storageKey={SIDE_MENU_DOCK_KEY}
        title="Side menu style"
        description="Minimal swaps the side menu for a dock of your sections and an All sections panel."
        options={SIDE_MENU_STYLE_OPTIONS}
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

      <DockSectionsDialog
        open={dockSectionsOpen}
        onClose={() => setDockSectionsOpen(false)}
      />
    </>
  );
};

export default SideMenuSettings;
