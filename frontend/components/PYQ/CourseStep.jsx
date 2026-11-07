import React, { useMemo } from "react";
import { Box, Paper, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  ALL_PYQ_YEARS,
  searchPyqs,
  setCourseSearch,
  setCurrentStep,
  setSelectedCourse
} from "../../redux/pyqSlice.js";
import PyqCourseLabel from "./PyqCourseLabel.jsx";
import { clickableRowCardSx, emptyStateSx, stepHintSx } from "./pyqStyles.js";

const CourseStep = () => {
  const dispatch = useDispatch();
  const { courses, selectedSemester, courseSearch } = useSelector((state) => state.pyq);

  const semesterCourses = useMemo(() => {
    if (!selectedSemester) {
      return [];
    }

    const selected = courses.filter(
      (course) => String(course.semester) === String(selectedSemester)
    );

    if (!courseSearch.trim()) {
      return selected;
    }

    const query = courseSearch.toLowerCase().trim();
    return selected.filter(
      (course) =>
        course.subjectCode.toLowerCase().includes(query) ||
        course.subjectName.toLowerCase().includes(query)
    );
  }, [courses, selectedSemester, courseSearch]);

  const handleSelectCourse = (course) => {
    dispatch(setSelectedCourse(course));
    dispatch(setCurrentStep("results"));
    dispatch(searchPyqs({
      query: course.searchCode || course.subjectName,
      year: ALL_PYQ_YEARS,
      subjectName: course.subjectName
    }));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography sx={stepHintSx}>Select course from Semester {selectedSemester}</Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Search course by code or name"
        value={courseSearch}
        onChange={(event) => dispatch(setCourseSearch(event.target.value))}
        sx={{ marginBottom: "12px" }}
      />

      <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
        {semesterCourses.map((course) => (
          <Paper
            key={course.id}
            elevation={0}
            onClick={() => handleSelectCourse(course)}
            sx={clickableRowCardSx}
          >
            <PyqCourseLabel course={course} />
          </Paper>
        ))}

        {semesterCourses.length === 0 && (
          <Typography sx={emptyStateSx}>No courses found for this semester.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default CourseStep;
