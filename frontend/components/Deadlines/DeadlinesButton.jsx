import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Badge, IconButton, Tooltip } from "@mui/material";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { setCurrentPage } from "../../redux/sidebarSlice.js";
import { selectDeadlinesSummary } from "../../redux/deadlinesSlice.js";
import theme from "../../Themes/theme.jsx";

const DeadlinesButton = () => {
  const dispatch = useDispatch();
  const summary = useSelector(selectDeadlinesSummary);
  const count = summary.badgeCount;

  const tooltip =
    summary.overdueCount > 0 || summary.due48hCount > 0
      ? `Deadlines (${summary.overdueCount} overdue, ${summary.due48hCount} due within 48h)`
      : summary.activeTotal > 0
        ? `Deadlines (${summary.activeTotal} active)`
        : "Assignment Deadlines";

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={() => dispatch(setCurrentPage("deadlines"))}
        aria-label={tooltip}
        size="large"
        sx={{ color: theme.colors.secondary }}
      >
        <Badge
          badgeContent={count > 99 ? "99+" : count}
          invisible={count === 0}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor:
                summary.overdueCount > 0 ? theme.colors.danger : theme.colors.primary,
              color: theme.colors.onPrimary,
              fontSize: "10px",
              fontWeight: 700,
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
            },
          }}
        >
          <EventNoteIcon fontSize="large" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default DeadlinesButton;

