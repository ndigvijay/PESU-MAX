import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, Checkbox, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { setCurrentPage } from "../../redux/sidebarSlice.js";
import {
  saveCustomDeadlineThunk,
  selectDeadlinesSummary,
  selectUrgentPreviewDeadlines,
  updateDeadlineThunk,
} from "../../redux/deadlinesSlice.js";
import theme from "../../Themes/theme.jsx";
import { checkboxSx } from "../../styles/styles.js";
import { getDeadlineStatus } from "../../../src/helpers/deadlineUtils.js";
import DeadlineFormDialog from "./DeadlineFormDialog.jsx";
import {
  formatDeadlineCountdown,
  getDeadlineStatusColors,
} from "./deadlineDisplayUtils.js";

const DeadlinesWidget = () => {
  const dispatch = useDispatch();
  const summary = useSelector(selectDeadlinesSummary);
  const previewItems = useSelector(selectUrgentPreviewDeadlines);
  const { courseOptions, saving } = useSelector((state) => state.deadlines);
  const [addOpen, setAddOpen] = useState(false);

  const hasUrgent = summary.overdueCount > 0 || summary.due48hCount > 0;

  const handleToggle = (e, item) => {
    e.stopPropagation();
    dispatch(updateDeadlineThunk({ id: item.id, patch: { completed: !item.completed } }));
  };

  const handleSave = async (payload) => {
    if (payload.mode === "create") {
      try {
        await dispatch(saveCustomDeadlineThunk(payload.deadline)).unwrap();
        setAddOpen(false);
      } catch {
        // Keep dialog open if saving fails; error is surfaced via slice state.
      }
    } else {
      setAddOpen(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          padding: "12px",
          borderRadius: "12px",
          border: `1.5px solid ${
            summary.overdueCount > 0
              ? theme.colors.dangerBorder
              : hasUrgent
                ? theme.colors.primary
                : theme.colors.secondaryBorder
          }`,
          backgroundColor: theme.colors.secondaryLight,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px",
            marginBottom: "8px",
          }}
        >
          <Box
            onClick={() => dispatch(setCurrentPage("deadlines"))}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              minWidth: 0,
            }}
          >
            <EventNoteIcon sx={{ fontSize: "19px", color: theme.colors.primary }} />
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "14px",
                color: theme.colors.secondary,
              }}
            >
              Deadlines
            </Typography>

            {summary.overdueCount > 0 && (
              <Chip
                label={`${summary.overdueCount} overdue`}
                size="small"
                sx={{
                  height: "18px",
                  fontSize: "10px",
                  fontWeight: 700,
                  backgroundColor: theme.colors.dangerTint,
                  color: theme.colors.danger,
                  border: `1px solid ${theme.colors.dangerBorder}`,
                  "& .MuiChip-label": { padding: "0 6px" },
                }}
              />
            )}
            {summary.due48hCount > 0 && (
              <Chip
                label={`${summary.due48hCount} due soon`}
                size="small"
                sx={{
                  height: "18px",
                  fontSize: "10px",
                  fontWeight: 700,
                  backgroundColor: theme.colors.primaryLight,
                  color: theme.colors.primary,
                  border: `1px solid ${theme.colors.primary}`,
                  "& .MuiChip-label": { padding: "0 6px" },
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <Tooltip title="Quick add deadline">
              <IconButton
                size="small"
                onClick={() => setAddOpen(true)}
                aria-label="Quick add deadline"
                sx={{ color: theme.colors.primary, padding: "4px" }}
              >
                <AddIcon sx={{ fontSize: "18px" }} />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              endIcon={<ArrowForwardIosIcon sx={{ fontSize: "11px !important" }} />}
              onClick={() => dispatch(setCurrentPage("deadlines"))}
              sx={{
                textTransform: "none",
                fontSize: "11.5px",
                fontWeight: 600,
                color: theme.colors.secondary,
                minWidth: "auto",
                padding: "2px 6px",
              }}
            >
              All ({summary.activeTotal})
            </Button>
          </Box>
        </Box>

        {/* Preview Items */}
        {previewItems.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {previewItems.map((item) => {
              const status = getDeadlineStatus(item);
              const colors = getDeadlineStatusColors(status);
              return (
                <Box
                  key={item.id}
                  onClick={() => dispatch(setCurrentPage("deadlines"))}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.line}`,
                    cursor: "pointer",
                    "&:hover": { borderColor: theme.colors.primary },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={Boolean(item.completed)}
                    onClick={(e) => handleToggle(e, item)}
                    sx={checkboxSx}
                    inputProps={{ "aria-label": `Complete ${item.title}` }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: theme.colors.secondary,
                      }}
                    >
                      {item.subjectCode ? `${item.subjectCode} · ` : ""}
                      {item.title}
                    </Typography>
                  </Box>
                  <Chip
                    label={formatDeadlineCountdown(item)}
                    size="small"
                    sx={{
                      height: "18px",
                      fontSize: "10px",
                      fontWeight: 700,
                      backgroundColor: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                      "& .MuiChip-label": { padding: "0 6px" },
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography
            onClick={() => dispatch(setCurrentPage("deadlines"))}
            sx={{
              fontSize: "12px",
              color: theme.colors.textMuted,
              cursor: "pointer",
              padding: "4px 2px",
            }}
          >
            No active deadlines right now. Click + to add one or open Deadlines to sync.
          </Typography>
        )}
      </Box>

      <DeadlineFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        courseOptions={courseOptions}
        saving={saving}
      />
    </>
  );
};

export default DeadlinesWidget;
