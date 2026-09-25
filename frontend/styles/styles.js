import theme from "../Themes/theme.jsx";



// Table header cell styles
export const headerCellSx = {
  backgroundColor: theme.table.headerBg,
  color: theme.table.headerText,
  fontWeight: 'bold',
  fontSize: '13px',
  padding: '10px 12px',
  borderBottom: 'none'
};

// Standard table cell styles
export const cellSx = {
  padding: '8px 12px',
  fontSize: '12px',
  borderBottom: `1px solid ${theme.colors.secondaryLight}`
};

// Row background style generator based on index
export const getRowSx = (index) => ({
  backgroundColor: index % 2 === 0 ? theme.table.rowEvenBg : theme.table.rowOddBg,
  '&:hover': {
    backgroundColor: theme.colors.primaryLight
  },
  transition: 'background-color 0.2s ease'
});

// Unit row background style (slightly different opacity)
export const getUnitRowSx = (index) => ({
  backgroundColor: index % 2 === 0 ? 'rgba(245, 130, 31, 0.05)' : 'rgba(35, 58, 118, 0.04)',
  '&:hover': {
    backgroundColor: theme.colors.primaryLight
  },
  transition: 'background-color 0.2s ease'
});

// Class row background style (even lighter opacity)
export const getClassRowSx = (index) => ({
  backgroundColor: index % 2 === 0 ? 'rgba(245, 130, 31, 0.03)' : 'rgba(35, 58, 118, 0.02)',
  '&:hover': {
    backgroundColor: 'rgba(245, 130, 31, 0.1)'
  },
  transition: 'background-color 0.2s ease'
});

// Checkbox styles
export const checkboxSx = {
  padding: '2px',
  color: theme.colors.secondary,
  '&.Mui-checked': { color: theme.colors.primary },
  '&.MuiCheckbox-indeterminate': { color: theme.colors.primary }
};

export const primaryCheckboxSx = {
  padding: '2px',
  color: theme.colors.primary,
  '&.Mui-checked': { color: theme.colors.primary },
  '&.MuiCheckbox-indeterminate': { color: theme.colors.primary }
};

// Expand/collapse button styles
export const expandButtonSx = {
  padding: '2px'
};

// Dialog button styles
export const primaryButtonSx = {
  backgroundColor: theme.colors.primary,
  fontSize: '12px',
  textTransform: 'none',
  '&:hover': { backgroundColor: theme.colors.primaryHover },
  '&.Mui-disabled': { backgroundColor: theme.colors.secondaryLight, color: '#999' }
};

export const secondaryButtonSx = {
  backgroundColor: theme.colors.secondary,
  borderColor: theme.colors.secondaryLight,
  color: "white",
  fontSize: '12px',
  textTransform: 'none',
  '&:hover': { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondaryHover }
};

// Search input styles
export const searchInputSx = {
  flex: 1,
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: '13px',
    '& fieldset': {
      borderColor: theme.colors.secondaryLight
    },
    '&:hover fieldset': {
      borderColor: theme.colors.secondary
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.colors.primary
    }
  }
};

// Select dropdown styles
export const selectSx = {
  borderRadius: '8px',
  fontSize: '13px',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.secondaryLight
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.secondary
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.primary
  }
};

// Download button styles
export const downloadButtonSx = {
  backgroundColor: theme.colors.primary,
  borderRadius: '8px',
  fontSize: '12px',
  textTransform: 'none',
  padding: '6px 12px',
  minWidth: 'auto',
  '&:hover': {
    backgroundColor: theme.colors.primaryHover
  },
  '&.Mui-disabled': {
    backgroundColor: theme.colors.secondaryLight,
    color: '#999'
  }
};

// Table container styles
export const tableContainerSx = {
  flex: 1,
  overflow: 'auto',
  borderRadius: '8px',
  border: `1px solid ${theme.colors.secondaryLight}`
};

// Pagination styles
export const paginationSx = {
  borderTop: `1px solid ${theme.colors.secondaryLight}`,
  '& .MuiTablePagination-toolbar': {
    minHeight: '48px',
    padding: '0 16px',
    gap: '12px',
    alignItems: 'center'
  },
  '& .MuiTablePagination-spacer': {
    display: 'none'
  },
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    fontSize: '12px',
    color: theme.colors.secondary,
    margin: 0,
    whiteSpace: 'nowrap'
  },
  '& .MuiTablePagination-select': {
    fontSize: '12px',
    margin: 0
  },
  '& .MuiTablePagination-actions': {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

// Dialog paper styles
export const dialogPaperSx = {
  borderRadius: '12px',
  padding: '8px'
};

// Dialog title styles
export const dialogTitleSx = {
  color: theme.colors.secondary,
  fontWeight: 'bold',
  fontSize: '16px',
  paddingBottom: '8px'
};

// Progress bar styles
export const progressBarSx = {
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.colors.secondaryLight,
  '& .MuiLinearProgress-bar': {
    backgroundColor: theme.colors.primary,
    borderRadius: 4
  }
};

// Alert styles for download results
export const successAlertSx = {
  fontSize: '13px',
  backgroundColor: theme.colors.secondary,
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  '& .MuiAlert-icon': {
    color: '#ffffff'
  }
};

export const errorAlertSx = {
  fontSize: '13px',
  backgroundColor: theme.colors.secondary,
  color: '#ffffff',
  '& .MuiAlert-icon': {
    color: '#ffffff'
  }
};

// Settings switch
export const switchSx = {
  width: 46,
  height: 26,
  padding: 0,
  "& .MuiSwitch-switchBase": {
    padding: "3px",
    transitionDuration: "200ms",
    "&.Mui-checked": {
      transform: "translateX(20px)",
      "& + .MuiSwitch-track": {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        opacity: 1,
      },
    },
    "&.Mui-focusVisible .MuiSwitch-thumb": {
      boxShadow: `0 0 0 4px ${theme.colors.primaryLight}`,
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    boxShadow: "none",
    backgroundColor: "rgba(35, 58, 118, 0.35)",
  },
  "& .Mui-checked .MuiSwitch-thumb": {
    backgroundColor: "#ffffff",
  },
  "& .MuiSwitch-track": {
    borderRadius: 999,
    border: "1.5px solid rgba(35, 58, 118, 0.25)",
    backgroundColor: "#ffffff",
    opacity: 1,
  },
};

// Settings row card
export const settingsRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '14px',
  border: `1.5px solid ${theme.colors.secondaryBorder}`,
  borderRadius: '12px',
};

// Row text column
export const settingsRowTextSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export const settingsRowTitleSx = {
  color: theme.colors.secondary,
  fontWeight: 600,
  fontSize: '15px',
};

export const settingsRowDescriptionSx = {
  color: theme.colors.textMuted,
  fontSize: '12.5px',
};

// Row action button
export const settingsActionButtonSx = {
  backgroundColor: theme.colors.primary,
  color: '#ffffff',
  textTransform: 'none',
  fontSize: '13px',
  fontWeight: 500,
  padding: '8px 14px',
  minWidth: 'auto',
  borderRadius: '8px',
  whiteSpace: 'nowrap',
  '&:hover': { backgroundColor: theme.colors.primaryHover },
  '&.Mui-disabled': {
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    opacity: 0.55,
  },
};

// Row hint and warning
export const settingsHintSx = {
  color: theme.colors.secondary,
};

export const settingsWarningSx = {
  color: theme.colors.error,
};
