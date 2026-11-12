import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import {
  deleteDeadlineThunk,
  saveCustomDeadlineThunk,
  selectDeadlinesSummary,
  selectFilteredDeadlines,
  selectScopedDeadlines,
  setDeadlineFilter,
  setDeadlineSearch,
  setShowAllSemesters,
  syncDeadlinesThunk,
  testNotificationThunk,
  updateDeadlineSettingsThunk,
  updateDeadlineThunk,
} from "../redux/deadlinesSlice.js";
import { downloadDeadlineFile } from "../../src/services/deadlineService.js";
import { getDeadlineStatus } from "../../src/helpers/deadlineUtils.js";
import theme from "../Themes/theme.jsx";
import {
  popupPrimaryButtonSx,
  searchInputSx,
  settingsRowDescriptionSx,
  switchSx,
} from "../styles/styles.js";
import DeadlineCard from "../components/Deadlines/DeadlineCard.jsx";
import DeadlineFormDialog from "../components/Deadlines/DeadlineFormDialog.jsx";
import DeadlineSettingsDialog from "../components/Deadlines/DeadlineSettingsDialog.jsx";

const Deadlines = () => {
  const dispatch = useDispatch();
  const {
    items: allItems,
    courseOptions,
    settings,
    syncStatus,
    filter,
    search,
    showAllSemesters,
    ready,
    loading,
    syncing,
    saving,
    error,
    workerWarning,
  } = useSelector((state) => state.deadlines);

  const scopedItems = useSelector(selectScopedDeadlines);
  const filteredItems = useSelector(selectFilteredDeadlines);
  const summary = useSelector(selectDeadlinesSummary);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const hasPastSemesterItems = useMemo(
    () => allItems.some((item) => item.source === "pesu" && item.isCurrentSemester === false),
    [allItems]
  );

  const filterCounts = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let upcoming = 0;
    let needsDate = 0;
    let completed = 0;

    for (const item of scopedItems) {
      const status = getDeadlineStatus(item);
      if (item.completed) {
        completed++;
      } else {
        active++;
        if (status === "overdue") overdue++;
        else if (status === "no-date") needsDate++;
        else upcoming++;
      }
    }

    return { active, overdue, upcoming, needsDate, completed, all: scopedItems.length };
  }, [scopedItems]);

  const filterTabs = [
    { id: "active", label: `Active (${filterCounts.active})` },
    { id: "overdue", label: `Overdue (${filterCounts.overdue})`, urgent: filterCounts.overdue > 0 },
    { id: "upcoming", label: `Upcoming (${filterCounts.upcoming})` },
    { id: "needsDate", label: `Needs Date (${filterCounts.needsDate})` },
    { id: "completed", label: `Done (${filterCounts.completed})` },
  ];

  const handleSync = async () => {
    try {
      const result = await dispatch(syncDeadlinesThunk(true)).unwrap();
      if (result?.workerWarning) {
        setSnackbar({
          open: true,
          message: "Loaded cached assignments locally; reload the extension for full HTML scan",
          severity: "warning",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Synced assignments from PESU Academy",
          severity: "success",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err || "Sync failed — make sure you are signed in",
        severity: "error",
      });
    }
  };

  const handleSaveForm = async (payload) => {
    try {
      if (payload.mode === "edit") {
        await dispatch(updateDeadlineThunk({ id: payload.id, patch: payload.patch })).unwrap();
      } else {
        await dispatch(saveCustomDeadlineThunk(payload.deadline)).unwrap();
      }
      setFormOpen(false);
      setEditingItem(null);
      setSnackbar({ open: true, message: "Deadline saved", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err || "Failed to save deadline", severity: "error" });
    }
  };

  const handleToggleComplete = (item) => {
    dispatch(updateDeadlineThunk({ id: item.id, patch: { completed: !item.completed } }));
  };

  const handleDelete = (id) => {
    dispatch(deleteDeadlineThunk(id));
  };

  const handleDownloadFile = async (file) => {
    try {
      const result = await downloadDeadlineFile(file);
      setSnackbar({
        open: true,
        message: `Downloading ${result?.filename || "assignment"}`,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || "Could not download file",
        severity: "error",
      });
    }
  };

  const handleSaveSettings = async (nextSettings) => {
    await dispatch(updateDeadlineSettingsThunk(nextSettings));
    setSnackbar({ open: true, message: "Reminder settings saved", severity: "success" });
  };

  const handleTestNotification = () => dispatch(testNotificationThunk()).unwrap();

  return (
    <Box
      sx={{
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        gap: "10px",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
          Deadlines
        </Typography>

        <Tooltip title="Reminder notification settings">
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            aria-label="Deadline notification settings"
            sx={{
              color: settings?.notificationsEnabled ? theme.colors.primary : theme.colors.textMuted,
            }}
          >
            <NotificationsActiveOutlinedIcon sx={{ fontSize: "20px" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Scan PESU assignments for due dates">
          <span>
            <IconButton
              size="small"
              onClick={handleSync}
              disabled={syncing}
              aria-label="Sync assignments"
              sx={{ color: theme.colors.secondary }}
            >
              {syncing ? (
                <CircularProgress size={18} sx={{ color: theme.colors.primary }} />
              ) : (
                <RefreshIcon sx={{ fontSize: "20px" }} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: "16px" }} />}
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
          sx={{
            ...popupPrimaryButtonSx,
            padding: "4px 10px",
            fontSize: "12px",
          }}
        >
          Add
        </Button>
      </Box>

      {/* Urgency status banner */}
      {(summary.overdueCount > 0 || summary.due24hCount > 0) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            borderRadius: "8px",
            backgroundColor:
              summary.overdueCount > 0 ? theme.colors.dangerTint : theme.colors.warningTint,
            border: `1px solid ${
              summary.overdueCount > 0 ? theme.colors.dangerBorder : theme.colors.warningBorder
            }`,
          }}
        >
          <Typography
            sx={{
              fontSize: "11.5px",
              fontWeight: 600,
              color: summary.overdueCount > 0 ? theme.colors.danger : theme.colors.warning,
            }}
          >
            {summary.overdueCount > 0
              ? `${summary.overdueCount} overdue${summary.due24hCount > 0 ? ` · ${summary.due24hCount} due within 24h` : ""}`
              : `${summary.due24hCount} assignment${summary.due24hCount > 1 ? "s" : ""} due within 24h`}
          </Typography>
          {syncStatus?.lastSyncedAt && (
            <Typography sx={{ fontSize: "10.5px", color: theme.colors.textMuted }}>
              Synced {new Date(syncStatus.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </Typography>
          )}
        </Box>
      )}

      {/* Search + Optional past semester toggle */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <TextField
          size="small"
          placeholder="Search course or assignment..."
          value={search}
          onChange={(e) => dispatch(setDeadlineSearch(e.target.value))}
          sx={searchInputSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: "18px", color: theme.colors.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => dispatch(setDeadlineSearch(""))}
                  aria-label="Clear search"
                >
                  <ClearIcon sx={{ fontSize: "16px" }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* Filter Chips */}
      <Box
        sx={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {filterTabs.map((tab) => {
          const selected = filter === tab.id;
          return (
            <Chip
              key={tab.id}
              label={tab.label}
              size="small"
              onClick={() => dispatch(setDeadlineFilter(tab.id))}
              sx={{
                fontSize: "11px",
                fontWeight: 600,
                height: "24px",
                backgroundColor: selected
                  ? tab.urgent
                    ? theme.colors.danger
                    : theme.colors.primary
                  : theme.colors.secondaryLight,
                color: selected
                  ? theme.colors.onPrimary
                  : tab.urgent
                    ? theme.colors.danger
                    : theme.colors.secondary,
                border: `1px solid ${
                  selected
                    ? "transparent"
                    : tab.urgent
                      ? theme.colors.dangerBorder
                      : theme.colors.line
                }`,
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            />
          );
        })}

        {hasPastSemesterItems && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showAllSemesters}
                onChange={(e) => dispatch(setShowAllSemesters(e.target.checked))}
                sx={{ ...switchSx, transform: "scale(0.8)" }}
              />
            }
            label={
              <Typography sx={{ fontSize: "11px", color: theme.colors.textMuted }}>
                All sems
              </Typography>
            }
            sx={{ marginLeft: "auto", marginRight: 0 }}
          />
        )}
      </Box>

      {workerWarning && (
        <Alert severity="warning" sx={{ fontSize: "11.5px", padding: "2px 10px" }}>
          {workerWarning}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ fontSize: "12px", padding: "2px 10px" }}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading && !ready ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: "28px" }}>
          <CircularProgress size={26} sx={{ color: theme.colors.primary }} />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Box sx={{ textAlign: "center", padding: "24px 12px" }}>
          <Typography sx={{ ...settingsRowDescriptionSx, fontSize: "13px", marginBottom: "8px" }}>
            {search
              ? "No deadlines match your search."
              : filter === "overdue"
                ? "Nothing overdue — great work!"
                : filter === "completed"
                  ? "No completed deadlines yet."
                  : "No deadlines in this view."}
          </Typography>
          <Typography sx={{ ...settingsRowDescriptionSx, fontSize: "11.5px" }}>
            PESU-MAX automatically detects assignments from your synced PESU Academy courses.
            Click Sync to scan PESU Academy or Add to track custom deadlines.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "2px" }}>
          <Stack spacing="10px" sx={{ paddingBottom: "12px" }}>
            {filteredItems.map((item) => (
              <DeadlineCard
                key={item.id}
                item={item}
                onToggleComplete={handleToggleComplete}
                onEdit={(target) => {
                  setEditingItem(target);
                  setFormOpen(true);
                }}
                onDelete={handleDelete}
                onDownloadFile={handleDownloadFile}
              />
            ))}
          </Stack>
        </Box>
      )}

      <DeadlineFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveForm}
        editingItem={editingItem}
        courseOptions={courseOptions}
        saving={saving}
      />

      <DeadlineSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestNotification={handleTestNotification}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", fontSize: "12.5px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Deadlines;
