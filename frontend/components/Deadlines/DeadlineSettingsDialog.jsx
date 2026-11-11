import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import theme from "../../Themes/theme.jsx";
import {
  checkboxSx,
  dialogPaperSx,
  dialogTitleSx,
  popupPrimaryButtonSx,
  popupSecondaryButtonSx,
  settingsRowDescriptionSx,
  settingsRowSx,
  settingsRowTitleSx,
  switchSx,
} from "../../styles/styles.js";

const LEAD_HOUR_OPTIONS = [
  { hours: 48, label: "48 hours (2 days) before" },
  { hours: 24, label: "24 hours (1 day) before" },
  { hours: 6, label: "6 hours before" },
  { hours: 1, label: "1 hour before" },
];

const DeadlineSettingsDialog = ({
  open,
  onClose,
  settings,
  onSaveSettings,
  onTestNotification,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [leadHours, setLeadHours] = useState([24, 6, 1]);
  const [overdueReminder, setOverdueReminder] = useState(true);
  const [testFeedback, setTestFeedback] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotificationsEnabled(settings?.notificationsEnabled !== false);
    setLeadHours(Array.isArray(settings?.leadHours) ? settings.leadHours : [24, 6, 1]);
    setOverdueReminder(settings?.overdueReminder !== false);
    setTestFeedback(null);
  }, [open, settings]);

  const toggleLeadHour = (hours) => {
    setLeadHours((prev) =>
      prev.includes(hours) ? prev.filter((h) => h !== hours) : [...prev, hours].sort((a, b) => b - a)
    );
  };

  const handleTest = async () => {
    setTesting(true);
    setTestFeedback(null);
    try {
      await onTestNotification();
      setTestFeedback({ severity: "success", text: "Test notification sent! Check your browser notifications." });
    } catch (err) {
      setTestFeedback({ severity: "error", text: err?.message || "Could not trigger browser notification." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      notificationsEnabled,
      leadHours,
      overdueReminder,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>Deadline Reminder Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ paddingTop: "4px" }}>
          <Box sx={settingsRowSx}>
            <Box>
              <Typography sx={settingsRowTitleSx}>Browser notifications</Typography>
              <Typography sx={settingsRowDescriptionSx}>
                Alert via Chrome notifications using background alarms
              </Typography>
            </Box>
            <Switch
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              sx={switchSx}
            />
          </Box>

          <Box
            sx={{
              padding: "10px 12px",
              borderRadius: "12px",
              border: `1.5px solid ${theme.colors.secondaryBorder}`,
              opacity: notificationsEnabled ? 1 : 0.55,
            }}
          >
            <Typography sx={{ ...settingsRowTitleSx, fontSize: "13px", marginBottom: "4px" }}>
              Notify me before due date
            </Typography>
            <Stack>
              {LEAD_HOUR_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.hours}
                  control={
                    <Checkbox
                      size="small"
                      checked={leadHours.includes(opt.hours)}
                      onChange={() => toggleLeadHour(opt.hours)}
                      disabled={!notificationsEnabled}
                      sx={checkboxSx}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: "12.5px", color: theme.colors.text }}>
                      {opt.label}
                    </Typography>
                  }
                />
              ))}
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={overdueReminder}
                    onChange={(e) => setOverdueReminder(e.target.checked)}
                    disabled={!notificationsEnabled}
                    sx={checkboxSx}
                  />
                }
                label={
                  <Typography sx={{ fontSize: "12.5px", color: theme.colors.text }}>
                    Alert when an assignment becomes overdue
                  </Typography>
                }
              />
            </Stack>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<NotificationsActiveIcon />}
            onClick={handleTest}
            disabled={testing}
            sx={{
              ...popupSecondaryButtonSx,
              width: "100%",
            }}
          >
            {testing ? "Sending..." : "Send Test Notification"}
          </Button>

          {testFeedback && (
            <Alert severity={testFeedback.severity} sx={{ fontSize: "12px" }}>
              {testFeedback.text}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: "8px 16px 12px" }}>
        <Button onClick={onClose} sx={popupSecondaryButtonSx}>
          Cancel
        </Button>
        <Button onClick={handleSave} sx={popupPrimaryButtonSx}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeadlineSettingsDialog;

