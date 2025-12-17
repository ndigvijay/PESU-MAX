import React, { useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalculateIcon from "@mui/icons-material/Calculate";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import {
  fetchAttendanceData,
  fetchSemestersList,
  fetchUserProfile,
  setCurrentSemester,
  openCalculator,
  resetAttendanceState,
} from "../redux/attendanceSlice.js";
import { AttendanceCalculator } from "../components/Attendance";
import theme from "../Themes/theme.jsx";
import { selectSx } from "../styles/styles.js";

const getPercentageColor = (percentage) => {
  if (percentage === null) return "#999";
  if (percentage < 75) return "#e53935";
  if (percentage <= 85) return "#ffa000";
  return "#43a047";
};

const getProgressBarColor = (percentage) => {
  if (percentage === null) return "#e0e0e0";
  if (percentage < 75) return "#e53935";
  if (percentage <= 85) return "#ffa000";
  return "#43a047";
};

const Attendance = () => {
  const dispatch = useDispatch();
  const {
    attendance,
    semesters,
    currentSemester,
    userProfile,
    loading,
    semestersLoading,
    error,
  } = useSelector((state) => state.attendance);

  useEffect(() => {
    dispatch(fetchSemestersList());
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (semesters.length > 0 && userProfile && !currentSemester) {
      const userSemesterNumber = parseInt(userProfile.semester, 10);
      const matchingSemester = semesters.find(
        (sem) => sem.number === userSemesterNumber
      );
      if (matchingSemester) {
        dispatch(setCurrentSemester(matchingSemester.value));
      } else if (semesters.length > 0) {
        dispatch(setCurrentSemester(semesters[0].value));
      }
    }
  }, [semesters, userProfile, currentSemester, dispatch]);

  useEffect(() => {
    if (currentSemester) {
      dispatch(fetchAttendanceData(currentSemester));
    }
  }, [currentSemester, dispatch]);

  const handleBack = () => {
    dispatch(resetAttendanceState());
    dispatch(setCurrentPage("home"));
  };

  const handleSemesterChange = (event) => {
    dispatch(setCurrentSemester(event.target.value));
  };

  const handleOpenCalculator = (course) => {
    dispatch(openCalculator(course));
  };

  const getCurrentSemesterLabel = () => {
    const sem = semesters.find((s) => s.value === currentSemester);
    return sem ? sem.semester : "";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 0",
        }}
      >
        <IconButton onClick={handleBack} sx={{ color: theme.colors.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", color: theme.colors.secondary }}
        >
          Attendance
        </Typography>
      </Box>

      {/* Semester Selector */}
      <Box sx={{ marginBottom: "16px" }}>
        <FormControl fullWidth size="small">
          <Select
            value={currentSemester || ""}
            onChange={handleSemesterChange}
            displayEmpty
            disabled={semestersLoading || semesters.length === 0}
            sx={selectSx}
          >
            {semesters.map((sem) => (
              <MenuItem key={sem.value} value={sem.value}>
                {sem.semester}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Loading State */}
      {(loading || semestersLoading) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <CircularProgress sx={{ color: theme.colors.primary }} />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Box sx={{ textAlign: "center", padding: "20px" }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Attendance Cards */}
      {!loading && !error && attendance.length > 0 && (
        <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
          {attendance.map((course, index) => (
            <Box
              key={course.courseCode || index}
              sx={{
                padding: "14px 16px",
                borderRadius: "12px",
                backgroundColor: theme.colors.secondaryLight,
                marginBottom: "12px",
                border: `1px solid rgba(35, 58, 118, 0.12)`,
              }}
            >
              {/* Course Code */}
              <Typography
                sx={{
                  fontSize: "11px",
                  color: theme.colors.primary,
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                {course.courseCode}
              </Typography>

              {/* Course Name */}
              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: theme.colors.secondary,
                  marginBottom: "8px",
                  lineHeight: 1.3,
                }}
              >
                {course.courseName}
              </Typography>

              {/* Classes and Calculator */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  {course.classesText === "NA"
                    ? "No attendance data"
                    : `${course.attended}/${course.total} classes`}
                </Typography>

                {course.attended !== null && course.total !== null && (
                  <IconButton
                    size="small"
                    onClick={() => handleOpenCalculator(course)}
                    sx={{
                      color: theme.colors.primary,
                      padding: "4px",
                      "&:hover": {
                        backgroundColor: theme.colors.primaryLight,
                      },
                    }}
                  >
                    <CalculateIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Progress Bar and Percentage */}
              {course.percentage !== null ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(course.percentage, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "rgba(0,0,0,0.08)",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: getProgressBarColor(course.percentage),
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: getPercentageColor(course.percentage),
                      minWidth: "45px",
                      textAlign: "right",
                    }}
                  >
                    {course.percentage}%
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  N/A
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && attendance.length === 0 && currentSemester && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            color: "#888",
          }}
        >
          <Typography>No attendance data available for this semester</Typography>
        </Box>
      )}

      {/* Calculator Dialog */}
      <AttendanceCalculator />
    </Box>
  );
};

export default Attendance;
