import React from "react";
import { Stack, Typography } from "@mui/material";
import {
  settingsGroupSx,
  settingsGroupTitleSx,
  settingsSectionTitleSx,
} from "../../styles/styles.js";

const SettingsSection = ({ title, group = false, children }) => (
  <Stack spacing="8px" sx={group ? settingsGroupSx : undefined}>
    <Typography component="h2" sx={group ? settingsGroupTitleSx : settingsSectionTitleSx}>
      {title}
    </Typography>
    {children}
  </Stack>
);

export default SettingsSection;
