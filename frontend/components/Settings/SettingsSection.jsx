import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  newRibbonSx,
  settingsGroupSx,
  settingsGroupTitleSx,
  settingsSectionTitleSx,
} from "../../styles/styles.js";

const SettingsSection = ({ title, group = false, isNew = false, children }) => (
  <Box sx={group ? settingsGroupSx : undefined}>
    <Stack spacing="8px">
      <Typography component="h2" sx={group ? settingsGroupTitleSx : settingsSectionTitleSx}>
        {title}
      </Typography>
      {children}
    </Stack>
    {isNew && <Box aria-hidden="true" sx={newRibbonSx}>NEW</Box>}
  </Box>
);

export default SettingsSection;
