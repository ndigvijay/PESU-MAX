import React, { useState } from "react";
import { Alert, Button, Stack, Switch } from "@mui/material";
import SettingsRow from "./SettingsRow.jsx";
import useStoredSetting from "./useStoredSetting.js";
import { switchSx, popupSecondaryButtonSx } from "../../styles/styles.js";

const SettingsToggleRow = ({ storageKey, title, description, onDisable, disabled }) => {
  const setting = useStoredSetting(storageKey, false, title);
  const [clearing, setClearing] = useState(false);
  const [cleanupError, setCleanupError] = useState("");

  const clearCredentials = async () => {
    setClearing(true);
    try {
      await onDisable();
      setCleanupError("");
    } catch (error) {
      setCleanupError("The setting is off, but saved credentials could not be removed. Please retry.");
    } finally {
      setClearing(false);
    }
  };

  const handleChange = async (event) => {
    const next = event.target.checked;
    if (await setting.update(next)) {
      if (!next && onDisable) await clearCredentials();
    }
  };

  return (
    <Stack spacing={1}>
      <SettingsRow title={title} description={description}>
        <Switch
          checked={setting.value === true}
          onChange={handleChange}
          disabled={!setting.ready || setting.saving || clearing || Boolean(cleanupError) || disabled}
          sx={switchSx}
          slotProps={{ input: { "aria-label": title } }}
        />
      </SettingsRow>
      {(cleanupError || setting.error) && (
        <Alert severity="error" action={
          (cleanupError || !setting.ready) && (
            <Button variant="contained" disableElevation sx={popupSecondaryButtonSx} size="small" disabled={clearing}
              onClick={cleanupError ? clearCredentials : setting.retry}>
              Retry
            </Button>
          )
        }>
          {cleanupError || setting.error}
        </Alert>
      )}
    </Stack>
  );
};

export default SettingsToggleRow;
