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
import LockIcon from "@mui/icons-material/Lock";
import { useDispatch, useSelector } from "react-redux";
import {
  addManualSemester,
  updateManualSemester,
  removeManualSemester,
} from "../../redux/gpaSlice.js";
import theme from "../../Themes/theme.jsx";
import { primaryButtonSx } from "../../styles/styles.js";

const CGPACalculator = () => {
  const dispatch = useDispatch();
  const { gpaData, manualSemesters, currentCgpa, loading } = useSelector(
    (state) => state.gpa
  );

  const validateSemester = (semester) => {
    const errors = {};

    if (semester.credits === '') {
      errors.credits = 'Required';
    } else {
      const credits = parseFloat(semester.credits);
      if (isNaN(credits) || credits < 1) {
        errors.credits = 'Min 1';
      } else if (credits > 30) {
        errors.credits = 'Max 30';
      }
    }

    if (semester.sgpa === '') {
      errors.sgpa = 'Required';
    } else {
      const sgpa = parseFloat(semester.sgpa);
      if (isNaN(sgpa) || sgpa < 0) {
        errors.sgpa = 'Min 0';
      } else if (sgpa > 10) {
        errors.sgpa = 'Max 10';
      }
    }

    return errors;
  };

  // Calculate projected CGPA
  const { projectedCgpa, totalCredits, isValid, semesterErrors } = useMemo(() => {
    const errors = {};
    let valid = true;
    let validManualSems = [];

    // semesters
    manualSemesters.forEach((sem) => {
      const semError = validateSemester(sem);
      errors[sem.id] = semError;

      if (Object.keys(semError).length > 0) {
        valid = false;
      } else {
        validManualSems.push(sem);
      }
    });

    const apiSemesters = gpaData.filter((s) => s.credits > 0);

    const allSemesters = [...apiSemesters, ...validManualSems];

    if (allSemesters.length === 0) {
      return {
        projectedCgpa: null,
        totalCredits: 0,
        isValid: false,
        semesterErrors: errors,
      };
    }

    const totalCreds = allSemesters.reduce(
      (sum, s) => sum + parseFloat(s.credits),
      0
    );
    const weightedSum = allSemesters.reduce(
      (sum, s) => sum + parseFloat(s.credits) * parseFloat(s.sgpa),
      0
    );
    const calculatedCgpa =
      totalCreds > 0 ? (weightedSum / totalCreds).toFixed(2) : null;

    return {
      projectedCgpa: calculatedCgpa,
      totalCredits: totalCreds,
      isValid: valid,
      semesterErrors: errors,
    };
  }, [gpaData, manualSemesters]);

  const handleCreditsChange = (id, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      dispatch(updateManualSemester({ id, field: 'credits', value }));
    }
  };

  const handleSgpaChange = (id, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      dispatch(updateManualSemester({ id, field: 'sgpa', value }));
    }
  };

  const handleRemoveSemester = (id) => {
    dispatch(removeManualSemester(id));
  };

  const handleAddSemester = () => {
    dispatch(addManualSemester());
  };

  const hasApiData = gpaData.length > 0;
  const hasDataInApi = gpaData.some((s) => s.credits > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {hasDataInApi && currentCgpa && (
        <Box
          sx={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: theme.colors.secondaryLight,
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          <Typography
            sx={{
              color: '#999',
              fontSize: '14px',
              marginBottom: '4px',
            }}
          >
            Current CGPA
          </Typography>
          <Typography
            sx={{
              fontSize: '32px',
              fontWeight: 600,
              color: theme.colors.secondary,
              lineHeight: 1.2,
            }}
          >
            {currentCgpa.toFixed(2)}
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && !hasDataInApi && (
        <Box
          sx={{
            textAlign: 'center',
            padding: '24px 16px',
            color: '#999',
            marginBottom: '16px',
          }}
        >
          <Typography sx={{ fontSize: '14px', marginBottom: '8px' }}>
            No GPA data available yet
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#bbb' }}>
            Add semesters below to calculate your projected CGPA
          </Typography>
        </Box>
      )}

      {/* Header Row */}
      {(hasApiData || manualSemesters.length > 0) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 1fr 40px',
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
            Semester
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
            SGPA
          </Typography>
          <Box />
        </Box>
      )}

      {/* Semester Rows */}
      <Box sx={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {/* API Data Rows (Read-only) */}
        {gpaData.map((sem) => {
          const hasData = sem.credits > 0;
          return (
            <Box
              key={`api-${sem.semester}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 40px',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: hasData
                  ? 'rgba(67, 160, 71, 0.12)'
                  : 'rgba(0, 0, 0, 0.04)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: hasData ? theme.colors.secondary : '#999',
                }}
              >
                Sem {sem.semester}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: hasData ? theme.colors.secondary : '#999',
                }}
              >
                {sem.credits || 0}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: hasData ? theme.colors.secondary : '#999',
                }}
              >
                {sem.sgpa ? sem.sgpa.toFixed(2) : '0'}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <LockIcon sx={{ fontSize: '16px', color: '#999' }} />
              </Box>
            </Box>
          );
        })}

        {/* Manual Semester Rows (Editable) */}
        {manualSemesters.map((sem) => {
          const errors = semesterErrors[sem.id] || {};
          return (
            <Box
              key={sem.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 40px',
                gap: '12px',
                alignItems: 'flex-start',
                marginBottom: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'white',
                border: `1px solid ${theme.colors.secondaryLight}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.colors.secondary,
                  paddingTop: '8px',
                }}
              >
                Sem {sem.semester}
              </Typography>

              {/* Credits Input */}
              <Box>
                <TextField
                  size="small"
                  value={sem.credits}
                  onChange={(e) => handleCreditsChange(sem.id, e.target.value)}
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
                        borderColor: errors.credits
                          ? '#e53935'
                          : theme.colors.secondaryLight,
                      },
                      '&:hover fieldset': {
                        borderColor: errors.credits
                          ? '#e53935'
                          : theme.colors.secondary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: errors.credits
                          ? '#e53935'
                          : theme.colors.primary,
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

              {/* SGPA Input */}
              <Box>
                <TextField
                  size="small"
                  value={sem.sgpa}
                  onChange={(e) => handleSgpaChange(sem.id, e.target.value)}
                  placeholder="SGPA"
                  error={!!errors.sgpa}
                  fullWidth
                  inputProps={{
                    inputMode: 'decimal',
                    style: { fontSize: '13px' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '& fieldset': {
                        borderColor: errors.sgpa
                          ? '#e53935'
                          : theme.colors.secondaryLight,
                      },
                      '&:hover fieldset': {
                        borderColor: errors.sgpa
                          ? '#e53935'
                          : theme.colors.secondary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: errors.sgpa
                          ? '#e53935'
                          : theme.colors.primary,
                      },
                    },
                  }}
                />
                {errors.sgpa && (
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: '#e53935',
                      marginTop: '2px',
                      marginLeft: '4px',
                    }}
                  >
                    {errors.sgpa}
                  </Typography>
                )}
              </Box>

              {/* Delete Button */}
              <IconButton
                size="small"
                onClick={() => handleRemoveSemester(sem.id)}
                sx={{
                  color: '#e53935',
                  padding: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(229, 57, 53, 0.1)',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      {/* Add Semester Button */}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddSemester}
        sx={{
          ...primaryButtonSx,
          marginBottom: '16px',
        }}
        variant="contained"
      >
        Add Semester
      </Button>

      {/* Projected CGPA Result - Minimal Style */}
      {manualSemesters.length > 0 && (
        <Box
          sx={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: theme.colors.primaryLight,
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
            Projected CGPA
          </Typography>
          <Typography
            sx={{
              fontSize: '32px',
              fontWeight: 600,
              color: isValid ? theme.colors.primary : '#ccc',
              lineHeight: 1.2,
            }}
          >
            {isValid && projectedCgpa ? projectedCgpa : '—'}
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
      )}
    </Box>
  );
};

export default CGPACalculator;
