import theme from "../../Themes/theme.jsx";
import { snackbarAlertSx } from "../../styles/styles.js";

export const rowCardSx = {
  padding: "12px",
  borderRadius: "12px",
  backgroundColor: theme.colors.secondaryLight,
  border: `1px solid ${theme.colors.line}`,
  marginBottom: "10px"
};

export const clickableRowCardSx = {
  ...rowCardSx,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.colors.primaryLight
  }
};

export const errorAlertSx = {
  marginBottom: "10px",
  fontSize: "12px"
};

export const paginationButtonSx = {
  textTransform: "none",
  backgroundColor: theme.colors.solid,
  color: theme.colors.onSolidAccent,
  "&:hover": {
    backgroundColor: theme.colors.solidHover
  },
  "&.Mui-disabled": {
    backgroundColor: theme.colors.raised,
    color: theme.colors.textDisabled
  }
};

export const successSnackbarAlertSx = snackbarAlertSx.success;

export const stepHintSx = { fontSize: "13px", color: theme.colors.textMuted, marginBottom: "8px" };

export const emptyStateSx = {
  fontSize: "13px",
  color: theme.colors.textSoft,
  textAlign: "center",
  marginTop: "20px"
};

export const checkboxSx = {
  color: theme.colors.primary,
  "&.Mui-checked": { color: theme.colors.primary }
};

export const LOADING_TEXT = "fetching resources from library";
export const PYQ_YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: 5 }, (_, index) => {
    const year = String(new Date().getFullYear() - index);
    return { value: year, label: year };
  })
];
