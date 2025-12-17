import React, { useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useDispatch, useSelector } from "react-redux";
import {
  addCourse,
  updateCourse,
  removeCourse,
  GRADE_VALUES,
} from "../../redux/gpaSlice.js";
import GradeSelect from "./GradeSelect.jsx";
import theme from "../../Themes/theme.jsx";
import { primaryButtonSx } from "../../styles/styles.js";

const SGPACalculator = () => {
  const dispatch = useDispatch();
  const { courses } = useSelector((state) => state.gpa);

  const validateCourse = (course) => {
    const errors = {};
    
    if (course.credits === '') {
      errors.credits = 'Required';
    } else {
      const credits = parseFloat(course.credits);
      if (isNaN(credits) || credits < 1) {
        errors.credits = 'Min 1';
      } else if (credits > 12) {
        errors.credits = 'Max 12';
      }
    }
    
    if (!course.grade) {
      errors.grade = 'Required';
    }
    
    return errors;
  };

  const { sgpa, totalCredits, isValid, courseErrors } = useMemo(() => {
    const errors = {};
    let valid = true;
    let validCourses = [];

    courses.forEach((course) => {
      const courseError = validateCourse(course);
      errors[course.id] = courseError;
      
      if (Object.keys(courseError).length > 0) {
        valid = false;
      } else {
        validCourses.push(course);
      }
    });

    if (!valid || validCourses.length === 0) {
      return { sgpa: null, totalCredits: 0, isValid: false, courseErrors: errors };
    }

    const totalCreds = validCourses.reduce(
      (sum, c) => sum + parseFloat(c.credits),
      0
    );
    const weightedSum = validCourses.reduce(
      (sum, c) => sum + parseFloat(c.credits) * GRADE_VALUES[c.grade],
      0
    );
    const calculatedSgpa = totalCreds > 0 ? (weightedSum / totalCreds).toFixed(2) : null;

    return {
      sgpa: calculatedSgpa,
      totalCredits: totalCreds,
      isValid: true,
      courseErrors: errors,
    };
  }, [courses]);

  const handleCreditsChange = (id, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      dispatch(updateCourse({ id, field: 'credits', value }));
    }
  };

  const handleGradeChange = (id, value) => {
    dispatch(updateCourse({ id, field: 'grade', value }));
  };

  const handleRemoveCourse = (id) => {
    dispatch(removeCourse(id));
  };

  const handleAddCourse = () => {
    dispatch(addCourse());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 40px',
          gap: '12px',
          padding: '8px 0',
          borderBottom: `1px solid ${theme.colors.secondaryLight}`,
          marginBottom: '8px',
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 600,
            color: theme.colors.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Credits
        </Typography>
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 600,
            color: theme.colors.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Grade
        </Typography>
        <Box /> {/* Spacer for delete button column */}
      </Box>

      {/* Course Rows */}
      <Box sx={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {courses.map((course) => {
          const errors = courseErrors[course.id] || {};
          return (
            <Box
              key={course.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 40px',
                gap: '12px',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              {/* Credits Input */}
              <Box>
                <TextField
                  size="small"
                  value={course.credits}
                  onChange={(e) => handleCreditsChange(course.id, e.target.value)}
                  placeholder="Credits"
                  error={!!errors.credits}
                  fullWidth
                  inputProps={{
                    inputMode: 'numeric',
                    style: { fontSize: '13px' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '& fieldset': {
                        borderColor: errors.credits ? '#e53935' : theme.colors.secondaryLight,
                      },
                      '&:hover fieldset': {
                        borderColor: errors.credits ? '#e53935' : theme.colors.secondary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: errors.credits ? '#e53935' : theme.colors.primary,
                      },
                    },
                  }}
                />
                {errors.credits && (
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: '#e53935',
                      marginTop: '2px',
                      marginLeft: '4px',
                    }}
                  >
                    {errors.credits}
                  </Typography>
                )}
              </Box>

              {/* Grade Select */}
              <Box>
                <GradeSelect
                  value={course.grade}
                  onChange={(value) => handleGradeChange(course.id, value)}
                  error={!!errors.grade}
                />
                {errors.grade && (
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: '#e53935',
                      marginTop: '2px',
                      marginLeft: '4px',
                    }}
                  >
                    {errors.grade}
                  </Typography>
                )}
              </Box>

              {/* Delete Button */}
              <IconButton
                size="small"
                onClick={() => handleRemoveCourse(course.id)}
                disabled={courses.length === 1}
                sx={{
                  color: courses.length === 1 ? '#ccc' : '#e53935',
                  padding: '8px',
                  '&:hover': {
                    backgroundColor: courses.length === 1 ? 'transparent' : 'rgba(229, 57, 53, 0.1)',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      {/* Add Course Button */}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddCourse}
        sx={{
          ...primaryButtonSx,
          marginBottom: '16px',
        }}
        variant="contained"
      >
        Add Course
      </Button>

      {/* Result Section - Minimal Style */}
      <Box
        sx={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: theme.colors.secondaryLight,
          borderRadius: '12px',
        }}
      >
        <Typography
          sx={{
            color: '#999',
            fontSize: '14px',
            marginBottom: '4px',
          }}
        >
          SGPA
        </Typography>
        <Typography
          sx={{
            fontSize: '32px',
            fontWeight: 600,
            color: isValid ? theme.colors.secondary : '#ccc',
            lineHeight: 1.2,
          }}
        >
          {isValid && sgpa ? sgpa : '—'}
        </Typography>
        <Typography
          sx={{
            color: '#666',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          Total Credits: {isValid ? totalCredits : '—'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SGPACalculator;
