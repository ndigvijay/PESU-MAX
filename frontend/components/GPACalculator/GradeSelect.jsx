import React from "react";
import {
  Select,
  MenuItem,
  Box,
  FormControl,
} from "@mui/material";
import { GRADE_VALUES, GRADE_COLORS } from "../../redux/gpaSlice.js";
import theme from "../../Themes/theme.jsx";

const grades = Object.entries(GRADE_VALUES).map(([grade, points]) => ({
  value: grade,
  label: grade,
  points: points,
  color: GRADE_COLORS[grade]
}));

const GradeSelect = ({ value, onChange, error, size = "small" }) => {
  return (
    <FormControl size={size} fullWidth error={error}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Box sx={{ color: '#999', fontSize: '13px' }}>
                Grade
              </Box>
            );
          }
          const grade = grades.find(g => g.value === selected);
          return (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: grade?.color || '#ccc',
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 12px',
                fontWeight: 600,
                fontSize: '13px',
                minWidth: '28px',
              }}
            >
              {selected}
            </Box>
          );
        }}
        sx={{
          borderRadius: '8px',
          fontSize: '13px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#e53935' : theme.colors.secondaryLight
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#e53935' : theme.colors.secondary
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#e53935' : theme.colors.primary
          },
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: '8px',
              marginTop: '4px',
            }
          }
        }}
      >
        <MenuItem value="" disabled>
          <Box sx={{ color: '#999', fontSize: '13px' }}>Select Grade</Box>
        </MenuItem>
        {grades.map((grade) => (
          <MenuItem key={grade.value} value={grade.value}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: grade.color,
                  flexShrink: 0,
                }}
              />
              <Box
                sx={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: theme.colors.secondary,
                  minWidth: '20px',
                }}
              >
                {grade.label}
              </Box>
              <Box
                sx={{
                  fontSize: '12px',
                  color: '#888',
                  marginLeft: 'auto',
                }}
              >
                ({grade.points})
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default GradeSelect;
