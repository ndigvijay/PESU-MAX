import React, { useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import theme from "../../Themes/theme.jsx";
import { checkboxSx } from "../../styles/styles.js";
import { getDeadlineStatus } from "../../../src/helpers/deadlineUtils.js";
import {
  formatDeadlineCountdown,
  formatDueDateDisplay,
  getDeadlineStatusColors,
} from "./deadlineDisplayUtils.js";

const DeadlineCard = ({
  item,
  onToggleComplete,
  onEdit,
  onDelete,
  onDownloadFile,
}) => {
  const [downloading, setDownloading] = useState(false);
  const status = getDeadlineStatus(item);
  const statusColors = getDeadlineStatusColors(status);
  const countdown = formatDeadlineCountdown(item);
  const isPesu = item.source === "pesu";

  const handleDownload = async (file) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await onDownloadFile({
        url: file?.url || null,
        filename: file?.name || item.title,
        subjectId: item.subjectId,
        unitId: item.unitId,
        classId: item.classId,
        classNo: item.classNo,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box
      sx={{
        padding: "10px 12px",
        borderRadius: "12px",
        border: `1.5px solid ${
          status === "overdue" || status === "urgent"
            ? statusColors.border
            : theme.colors.secondaryBorder
        }`,
        backgroundColor:
          status === "overdue"
            ? theme.colors.dangerTint
            : item.completed
              ? theme.colors.sunken
              : theme.colors.surface,
        opacity: item.completed ? 0.72 : 1,
      }}
    >
      {/* Top metadata row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        <Checkbox
          size="small"
          checked={Boolean(item.completed)}
          onChange={() => onToggleComplete(item)}
          sx={{ ...checkboxSx, marginTop: "-2px" }}
          inputProps={{ "aria-label": `Mark ${item.title} completed` }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "3px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
              {item.subjectCode && (
                <Typography
                  sx={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: theme.colors.primary,
                    letterSpacing: "0.4px",
                  }}
                >
                  {item.subjectCode}
                </Typography>
              )}
              <Chip
                label={isPesu ? "PESU" : "Custom"}
                size="small"
                sx={{
                  height: "17px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  backgroundColor: isPesu ? theme.colors.secondaryLight : theme.colors.primaryLight,
                  color: isPesu ? theme.colors.secondary : theme.colors.primary,
                  "& .MuiChip-label": { padding: "0 6px" },
                }}
              />
              {isPesu && item.semester != null && item.isCurrentSemester === false && (
                <Chip
                  label={`Sem ${item.semester}`}
                  size="small"
                  sx={{
                    height: "17px",
                    fontSize: "9.5px",
                    backgroundColor: theme.colors.sunken,
                    color: theme.colors.textMuted,
                    "& .MuiChip-label": { padding: "0 5px" },
                  }}
                />
              )}
            </Box>

            <Chip
              label={countdown}
              size="small"
              sx={{
                height: "19px",
                fontSize: "10.5px",
                fontWeight: 700,
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                border: `1px solid ${statusColors.border}`,
                "& .MuiChip-label": { padding: "0 7px" },
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 600,
              color: theme.colors.secondary,
              textDecoration: item.completed ? "line-through" : "none",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {item.title}
          </Typography>

          {/* Course / Unit / Class context */}
          {(item.subjectName || item.unitName) && (
            <Typography
              sx={{
                fontSize: "11px",
                color: theme.colors.textMuted,
                marginTop: "2px",
                lineHeight: 1.3,
              }}
            >
              {item.subjectName}
              {item.unitName ? ` · ${item.unitName}` : ""}
              {item.className && item.className !== item.title ? ` · ${item.className}` : ""}
            </Typography>
          )}

          {/* Due Date line */}
          <Typography
            sx={{
              fontSize: "11.5px",
              fontWeight: item.dueAt != null ? 600 : 500,
              color: item.dueAt != null ? statusColors.color : theme.colors.info,
              marginTop: "4px",
            }}
          >
            {item.dueAt != null
              ? `Due: ${formatDueDateDisplay(item.dueAt, item.hasTime)}`
              : "Due date not found in portal — click Edit to set"}
          </Typography>

          {item.rawDateText && item.dueDateSource === "parsed" && (
            <Typography sx={{ fontSize: "10.5px", color: theme.colors.textSoft, fontStyle: "italic" }}>
              Detected from: “{item.rawDateText}”
            </Typography>
          )}

          {item.notes && (
            <Typography
              sx={{
                fontSize: "11px",
                color: theme.colors.text,
                backgroundColor: theme.colors.secondaryLight,
                padding: "4px 8px",
                borderRadius: "6px",
                marginTop: "5px",
                whiteSpace: "pre-wrap",
              }}
            >
              {item.notes}
            </Typography>
          )}

          {/* Action bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "4px",
              marginTop: "6px",
            }}
          >
            {isPesu && (
              <Tooltip
                title={
                  item.files?.length > 0
                    ? `Download ${item.files[0]?.name || "assignment"}`
                    : "Download assignment"
                }
              >
                <IconButton
                  size="small"
                  onClick={() => handleDownload(item.files?.[0])}
                  disabled={downloading}
                  aria-label="Download assignment file"
                  sx={{ color: theme.colors.primary, padding: "4px" }}
                >
                  {downloading ? (
                    <CircularProgress size={16} sx={{ color: theme.colors.primary }} />
                  ) : (
                    <DownloadIcon sx={{ fontSize: "18px" }} />
                  )}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={item.dueAt == null ? "Set due date" : "Edit deadline"}>
              <IconButton
                size="small"
                onClick={() => onEdit(item)}
                aria-label="Edit deadline"
                sx={{ color: theme.colors.secondary, padding: "4px" }}
              >
                <EditCalendarIcon sx={{ fontSize: "18px" }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isPesu ? "Hide assignment" : "Delete deadline"}>
              <IconButton
                size="small"
                onClick={() => onDelete(item.id)}
                aria-label={isPesu ? "Hide assignment" : "Delete deadline"}
                sx={{ color: theme.colors.textMuted, padding: "4px", "&:hover": { color: theme.colors.danger } }}
              >
                {isPesu ? (
                  <VisibilityOffOutlinedIcon sx={{ fontSize: "18px" }} />
                ) : (
                  <DeleteOutlineIcon sx={{ fontSize: "18px" }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DeadlineCard;
