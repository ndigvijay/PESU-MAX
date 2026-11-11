import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { toggleSidebar } from "../redux/sidebarSlice.js";
import { selectDeadlinesSummary } from "../redux/deadlinesSlice.js";
import theme from "../Themes/theme.jsx";
import PesuMaxMark from "./PesuMaxMark.jsx";

const CircularButton = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.sidebar.isOpen);
  const deadlineSummary = useSelector(selectDeadlinesSummary);
  const urgentCount = deadlineSummary?.badgeCount || 0;
  const [topPosition, setTopPosition] = useState(20);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const initialTop = useRef(0);

  const handleClick = () => {
    if (!isDragging.current) {
      dispatch(toggleSidebar());
    }
  };

  const handleMouseDown = (e) => {
    isDragging.current = false;
    dragStartY.current = e.clientY;
    initialTop.current = topPosition;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const deltaY = e.clientY - dragStartY.current;
    if (Math.abs(deltaY) > 5) {
      isDragging.current = true;
    }
    const newTop = Math.max(20, Math.min(window.innerHeight - 80, initialTop.current + deltaY));
    setTopPosition(newTop);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    setTimeout(() => {
      isDragging.current = false;
    }, 0);
  };

  return (
    <>
      {!isOpen && (
        <>
          <IconButton
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            disableRipple
            sx={{
              position: "fixed",
              top: `${topPosition}px`,
              right: isOpen ? "400px" : "20px",
              transition: "right 0.3s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              zIndex: 9999,
              width: "60px",
              height: "60px",
              backgroundColor: "transparent",
              borderRadius: "50%",
              border: `2px solid ${theme.colors.primary}`,
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
              "&:hover": {
                transform: "scale(1.15)",
                boxShadow: theme.colors.shadow,
              },
              "&:active": {
                transform: "scale(1.1)",
              },
            }}
          >
            <PesuMaxMark size="100%" />
            {urgentCount > 0 && (
              <Box
                aria-label={`${urgentCount} urgent deadline${urgentCount > 1 ? "s" : ""}`}
                sx={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 5px",
                  borderRadius: "999px",
                  backgroundColor:
                    deadlineSummary.overdueCount > 0 ? theme.colors.danger : theme.colors.primary,
                  color: theme.colors.onPrimary,
                  border: `2px solid ${theme.colors.surface}`,
                  fontSize: "11px",
                  fontWeight: 800,
                  lineHeight: "16px",
                  textAlign: "center",
                  pointerEvents: "none",
                  boxShadow: theme.colors.shadowSoft,
                }}
              >
                {urgentCount > 99 ? "99+" : urgentCount}
              </Box>
            )}
          </IconButton>
        </>
      )}
    </>
  );
};

export default CircularButton;
