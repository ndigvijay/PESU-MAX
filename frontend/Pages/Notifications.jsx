import React, { useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, CircularProgress, IconButton, LinearProgress, Stack, Typography, Snackbar, Alert } from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";
import ResourceNotificationRow from "../components/Notifications/ResourceNotificationRow.jsx";
import {
  clearDownloadNotice,
  downloadNotificationResource,
  markNotificationsRead,
  selectReadIdSet,
  selectUnreadCount,
} from "../redux/notificationsSlice.js";
import {
  progressBarSx,
  settingsActionButtonSx,
  settingsRowDescriptionSx,
  settingsRowTitleSx,
  settingsWarningSx,
  snackbarAlertSx,
} from "../styles/styles.js";

const anchorOrigin = { vertical: "bottom", horizontal: "center" };

const groupByCourseAndUnit = (notifications) => {
  const groups = new Map();

  for (const notification of notifications) {
    const key = `${notification.subjectId}:${notification.unitId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        subjectCode: notification.subjectCode,
        subjectName: notification.subjectName,
        semester: notification.semester,
        unitName: notification.unitName,
        notifications: [],
      });
    }
    groups.get(key).notifications.push(notification);
  }

  return Array.from(groups.values());
};

const Notifications = () => {
  const dispatch = useDispatch();
  const { items: notifications, ready, error, marking, checking, downloadingIds, downloadNotice } = useSelector(
    (state) => state.notifications
  );
  const readIdSet = useSelector(selectReadIdSet);
  const unreadCount = useSelector(selectUnreadCount);
  const groups = useMemo(() => groupByCourseAndUnit(notifications), [notifications]);
  const closeDownloadNotice = () => dispatch(clearDownloadNotice());
  const lastNotice = useRef(null);
  if (downloadNotice) {
    lastNotice.current = downloadNotice;
  }
  const notice = downloadNotice || lastNotice.current;

  return (
    <Box sx={{ padding: "12px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <IconButton
          onClick={() => dispatch(setCurrentPage("home"))}
          aria-label="Back to home"
          size="small"
          sx={{ color: theme.colors.secondary, padding: "2px" }}
        >
          <KeyboardBackspaceIcon sx={{ fontSize: "20px" }} />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ color: theme.colors.secondary, fontWeight: "bold", fontSize: "17px", flex: 1 }}
        >
          Notifications
        </Typography>
        <Button
          onClick={() => dispatch(markNotificationsRead(notifications.map((notification) => notification.id)))}
          disabled={unreadCount === 0 || marking}
          startIcon={<DoneAllIcon sx={{ fontSize: "18px" }} />}
          sx={settingsActionButtonSx}
        >
          Mark all read
        </Button>
      </Box>

      {checking && (
        <Box sx={{ marginBottom: "10px" }}>
          <Typography variant="body2" sx={{ ...settingsRowDescriptionSx, marginBottom: "4px" }}>
            Checking this semester's courses for new resources…
          </Typography>
          <LinearProgress sx={progressBarSx} />
        </Box>
      )}

      {error && (
        <Typography variant="body2" sx={{ ...settingsWarningSx, marginBottom: "8px" }}>
          {error}
        </Typography>
      )}

      {!ready && !error && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: "24px" }}>
          <CircularProgress size={24} sx={{ color: theme.colors.primary }} />
        </Box>
      )}

      {ready && groups.length === 0 && (
        <Typography variant="body2" sx={{ ...settingsRowDescriptionSx, textAlign: "center", padding: "24px 8px" }}>
          No new resources added yet. PESU-MAX checks your slides, notes and other resources for any new files added
        </Typography>
      )}

      {ready && groups.length > 0 && (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "2px" }}>
          <Typography variant="body2" sx={{ ...settingsRowDescriptionSx, marginBottom: "8px" }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </Typography>
          <Stack spacing="14px">
            {groups.map((group) => (
              <Box key={group.key}>
                <Typography sx={settingsRowTitleSx}>
                  {group.subjectCode ? `${group.subjectCode} : ` : ""}{group.subjectName}
                </Typography>
                <Typography variant="body2" sx={{ ...settingsRowDescriptionSx, marginBottom: "6px" }}>
                  {group.semester != null ? `Sem ${group.semester} · ` : ""}{group.unitName}
                </Typography>
                <Stack spacing="8px">
                  {group.notifications.map((notification) => (
                    <ResourceNotificationRow
                      key={notification.id}
                      notification={notification}
                      read={readIdSet.has(notification.id)}
                      disabled={marking}
                      downloading={Boolean(downloadingIds?.[notification.id])}
                      onMarkRead={(id) => dispatch(markNotificationsRead([id]))}
                      onDownload={(item) => dispatch(downloadNotificationResource(item))}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Snackbar
        open={Boolean(downloadNotice)}
        autoHideDuration={6000}
        onClose={closeDownloadNotice}
        anchorOrigin={anchorOrigin}
      >
        {notice && (
          <Alert
            severity={notice.severity}
            onClose={closeDownloadNotice}
            sx={snackbarAlertSx[notice.severity] || snackbarAlertSx.success}
          >
            {notice.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default Notifications;
