import React from "react";
import { Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DownloadIcon from "@mui/icons-material/Download";
import theme from "../../Themes/theme.jsx";
import {
  settingsRowSx,
  settingsRowTextSx,
  settingsRowTitleSx,
  settingsRowDescriptionSx,
} from "../../styles/styles.js";

const formatDetectedAt = (timestamp) => new Date(timestamp).toLocaleString(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const ResourceItems = ({ resource }) => {
  if (resource.items?.length > 0) {
    return resource.items.map((item) => (
      <Typography key={item.docId} variant="body2" sx={{ ...settingsRowDescriptionSx, color: theme.colors.secondary }}>
        • {item.name}
      </Typography>
    ));
  }

  return (
    <Typography variant="body2" sx={settingsRowDescriptionSx}>
      • {resource.added} new {resource.added === 1 ? "file" : "files"}
    </Typography>
  );
};

// Notification card: class, added resources and time left, mark-read and download actions right.
const ResourceNotificationRow = ({
  notification,
  read,
  disabled,
  downloading = false,
  onMarkRead,
  onDownload,
}) => (
  <Box
    sx={{
      ...settingsRowSx,
      alignItems: "flex-start",
      borderColor: read ? theme.colors.secondaryBorder : theme.colors.primary,
      backgroundColor: read ? "transparent" : theme.colors.primaryLight,
    }}
  >
    <Box sx={{ ...settingsRowTextSx, minWidth: 0 }}>
      <Typography sx={{ ...settingsRowTitleSx, fontSize: "13px" }}>
        {notification.className || "Untitled class"}
      </Typography>
      {notification.resources.map((resource) => (
        <Box key={resource.type}>
          <Typography sx={{ color: theme.colors.primary, fontWeight: 600, fontSize: "12px" }}>
            {resource.label} +{resource.added}
          </Typography>
          <ResourceItems resource={resource} />
        </Box>
      ))}
      <Typography variant="body2" sx={{ ...settingsRowDescriptionSx, fontSize: "11px" }}>
        {formatDetectedAt(notification.detectedAt)}
      </Typography>
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "stretch",
        gap: "4px",
      }}
    >
      {!read && (
        <Tooltip title="Mark as read">
          <IconButton
            onClick={() => onMarkRead(notification.id)}
            disabled={disabled}
            aria-label="Mark as read"
            size="small"
            sx={{ color: theme.colors.primary }}
          >
            <DoneIcon sx={{ fontSize: "20px" }} />
          </IconButton>
        </Tooltip>
      )}
      {onDownload && (
        <Tooltip title={downloading ? "Downloading…" : "Download"}>
          <Box component="span" sx={{ marginTop: "auto", display: "inline-flex" }}>
            <IconButton
              onClick={() => onDownload(notification)}
              disabled={downloading}
              aria-label={downloading ? "Downloading resource" : "Download resource"}
              size="small"
              sx={{ color: theme.colors.primary }}
            >
              {downloading ? (
                <CircularProgress size={18} sx={{ color: theme.colors.primary }} />
              ) : (
                <DownloadIcon sx={{ fontSize: "20px" }} />
              )}
            </IconButton>
          </Box>
        </Tooltip>
      )}
    </Box>
  </Box>
);

export default ResourceNotificationRow;
