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
  borderBottom: `1px solid ${theme.colors.line}`
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
  backgroundColor: index % 2 === 0 ? theme.table.rowEvenSoft : theme.table.rowOddSoft,
  '&:hover': {
    backgroundColor: theme.colors.primaryLight
  },
  transition: 'background-color 0.2s ease'
});

// Class row background style (even lighter opacity)
export const getClassRowSx = (index) => ({
  backgroundColor: index % 2 === 0 ? theme.table.rowEvenFaint : theme.table.rowOddFaint,
  '&:hover': {
    backgroundColor: theme.colors.primaryLight
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
  color: theme.colors.onPrimary,
  fontSize: '12px',
  textTransform: 'none',
  '&:hover': { backgroundColor: theme.colors.primaryHover },
  '&.Mui-disabled': { backgroundColor: theme.colors.raised, color: theme.colors.textDisabled }
};

export const secondaryButtonSx = {
  backgroundColor: theme.colors.solid,
  borderColor: theme.colors.line,
  color: theme.colors.onSolid,
  fontSize: '12px',
  textTransform: 'none',
  '&:hover': { borderColor: theme.colors.secondary, backgroundColor: theme.colors.solidHover }
};

// Search input styles
export const searchInputSx = {
  flex: 1,
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: '13px',
    '& fieldset': {
      borderColor: theme.colors.line
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
    borderColor: theme.colors.line
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
  color: theme.colors.onPrimary,
  borderRadius: '8px',
  fontSize: '12px',
  textTransform: 'none',
  padding: '6px 12px',
  minWidth: 'auto',
  '&:hover': {
    backgroundColor: theme.colors.primaryHover
  },
  '&.Mui-disabled': {
    backgroundColor: theme.colors.raised,
    color: theme.colors.textDisabled
  }
};

// Table container styles
export const tableContainerSx = {
  flex: 1,
  overflow: 'auto',
  borderRadius: '8px',
  border: `1px solid ${theme.colors.line}`
};

// Pagination styles
export const paginationSx = {
  borderTop: `1px solid ${theme.colors.line}`,
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
  padding: '8px',
  backgroundColor: theme.colors.surface,
  color: theme.colors.text
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
  backgroundColor: theme.colors.sunken,
  '& .MuiLinearProgress-bar': {
    backgroundColor: theme.colors.primary,
    borderRadius: 4
  }
};

// Alert styles for download results
export const successAlertSx = {
  fontSize: '13px',
  backgroundColor: theme.colors.solid,
  color: theme.colors.onSolid,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  '& .MuiAlert-icon': {
    color: theme.colors.onSolid
  }
};

export const errorAlertSx = {
  fontSize: '13px',
  backgroundColor: theme.colors.solid,
  color: theme.colors.onSolid,
  '& .MuiAlert-icon': {
    color: theme.colors.onSolid
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
    backgroundColor: theme.colors.switchThumb,
  },
  "& .Mui-checked .MuiSwitch-thumb": {
    backgroundColor: theme.colors.switchThumbOn,
  },
  "& .MuiSwitch-track": {
    borderRadius: 999,
    border: `1.5px solid ${theme.colors.switchBorder}`,
    backgroundColor: theme.colors.switchTrack,
    opacity: 1,
  },
};

// Settings row card
export const settingsRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '10px 12px',
  border: `1.5px solid ${theme.colors.secondaryBorder}`,
  borderRadius: '12px',
};

// Row text column
export const settingsRowTextSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

export const settingsRowTitleSx = {
  color: theme.colors.secondary,
  fontWeight: 600,
  fontSize: '14px',
};

export const settingsRowDescriptionSx = {
  color: theme.colors.textMuted,
  fontSize: '12px',
  lineHeight: 1.35,
};

// Row action button
export const settingsActionButtonSx = {
  backgroundColor: theme.colors.primary,
  color: theme.colors.onPrimary,
  textTransform: 'none',
  fontSize: '12.5px',
  fontWeight: 500,
  padding: '6px 12px',
  minWidth: 'auto',
  borderRadius: '8px',
  whiteSpace: 'nowrap',
  '&:hover': { backgroundColor: theme.colors.primaryHover },
  '&.Mui-disabled': {
    backgroundColor: theme.colors.raised,
    color: theme.colors.textDisabled,
  },
};

export const settingsSectionTitleSx = {
  color: theme.colors.secondary,
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  paddingLeft: '2px',
};

export const settingsGroupSx = {
  position: 'relative',
  overflow: 'hidden',
  padding: '8px',
  border: `1.5px solid ${theme.colors.secondaryBorder}`,
  borderRadius: '14px',
  backgroundColor: theme.colors.secondaryLight,
};

export const settingsGroupTitleSx = {
  color: theme.colors.secondary,
  fontWeight: 600,
  fontSize: '13px',
  paddingLeft: '4px',
};

// "NEW" corner ribbon and icon badge
export const newRibbonSx = {
  position: 'absolute',
  top: '8px',
  right: '-32px',
  transform: 'rotate(45deg)',
  backgroundColor: theme.colors.primary,
  color: theme.colors.onPrimary,
  fontSize: '8px',
  fontWeight: 800,
  letterSpacing: '1px',
  padding: '1px 32px',
  lineHeight: 1.4,
  zIndex: 1,
  pointerEvents: 'none',
  boxShadow: theme.colors.shadowSoft,
};

export const newBadgeSx = {
  '& .MuiBadge-badge': {
    backgroundColor: theme.colors.primary,
    color: theme.colors.onPrimary,
    fontSize: '8px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    height: '14px',
    minWidth: 'auto',
    padding: '0 4px',
    borderRadius: '7px',
    boxShadow: theme.colors.shadowSoft,
  },
};

// Row hint and warning
export const settingsHintSx = {
  color: theme.colors.textMuted,
};

export const settingsWarningSx = {
  color: theme.colors.error,
};

// Shared Snackbar alert styling per severity
export const snackbarAlertSx = {
  success: {
    width: '100%',
    fontSize: '12px',
    backgroundColor: theme.colors.solid,
    color: theme.colors.onSolid,
    '& .MuiAlert-icon': { color: theme.colors.onSolid },
    '& .MuiAlert-message': { color: theme.colors.onSolid },
    '& .MuiAlert-action': { color: theme.colors.onSolid },
    '& .MuiSvgIcon-root': { color: theme.colors.onSolid },
  },
  warning: {
    width: '100%',
    fontSize: '12px',
    backgroundColor: theme.colors.warningTint,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.warningBorder}`,
    '& .MuiAlert-icon': { color: theme.colors.warning },
    '& .MuiAlert-action': { color: theme.colors.text },
  },
  error: {
    width: '100%',
    fontSize: '12px',
    backgroundColor: theme.colors.dangerTint,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dangerBorder}`,
    '& .MuiAlert-icon': { color: theme.colors.danger },
    '& .MuiAlert-action': { color: theme.colors.text },
  },
};

const popupButtonSx = {
  borderRadius: '8px',
  padding: '6px 14px',
  fontWeight: 500,
  '&.Mui-focusVisible': {
    outline: `2px solid ${theme.colors.focusRing}`,
    outlineOffset: '2px',
  },
};

export const popupPrimaryButtonSx = {
  ...primaryButtonSx,
  ...popupButtonSx,
  '&.Mui-disabled': {
    backgroundColor: theme.colors.raised,
    color: theme.colors.textDisabled,
  },
};

export const popupSecondaryButtonSx = {
  ...secondaryButtonSx,
  ...popupButtonSx,
  '&.Mui-disabled': {
    backgroundColor: theme.colors.raised,
    color: theme.colors.textDisabled,
  },
};
