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
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    fontSize: '12px',
    color: theme.colors.secondary
  },
  '& .MuiTablePagination-select': {
    fontSize: '12px'
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
