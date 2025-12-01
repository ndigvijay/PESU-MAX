import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import IconButton from "@mui/material/IconButton";
import { toggleSidebar } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";

const logoUrl = chrome.runtime.getURL("icons/Pes_logo_square.png");

const CircularButton = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.sidebar.isOpen);
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
                boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15)`,
              },
              "&:active": {
                transform: "scale(1.1)",
              },
            }}
          >
            <img
              src={logoUrl}
              alt="PESU Logo"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          </IconButton>
        </>
      )}
    </>
  );
};

export default CircularButton;
