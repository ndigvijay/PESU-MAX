import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  Checkbox,
  MenuItem,
  Select
} from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import theme from "../../Themes/theme.jsx";
import { DEFAULT_MERGE_SELECTION, MERGEABLE_CONTENT_TYPE_OPTIONS } from "../../constants/constants.js";
import { DEFAULT_MERGE_MODE, MERGE_MODE_OPTIONS, mergeScopeLabel } from "../../../src/helpers/mergeModes.js";
import { dialogPaperSx, dialogTitleSx, primaryButtonSx, secondaryButtonSx, selectSx } from "../../styles/styles.js";

const MERGE_OPTION_FOLDERS = {
  slides: "Slides",
  notes: "Notes",
  assignments: "Assignments",
  qb: "QB",
  qa: "QA"
};

const describeMergeOption = (key, mode) => {
  const scope = mergeScopeLabel(mode);
  const folder = MERGE_OPTION_FOLDERS[key] || "materials";
  const description = `Create one merged PDF per ${scope} inside the ${folder} folder.`;

  return key === "qb" || key === "qa"
    ? `${description} Repeated unit files are included once.`
    : description;
};

const MergeMaterialsDialog = ({ open, onClose, onConfirm, onBack, selectedContentTypes = [], mergeMode = DEFAULT_MERGE_MODE }) => {
  const [selectedMergeTypes, setSelectedMergeTypes] = useState(DEFAULT_MERGE_SELECTION);
  const [selectedMergeMode, setSelectedMergeMode] = useState(mergeMode);

  const availableMergeOptions = useMemo(
    () => MERGEABLE_CONTENT_TYPE_OPTIONS.filter((option) => selectedContentTypes.includes(option.id)),
    [selectedContentTypes]
  );

  useEffect(() => {
    if (open) {
      setSelectedMergeTypes({ ...DEFAULT_MERGE_SELECTION });
      setSelectedMergeMode(mergeMode);
    }
  }, [open, selectedContentTypes, mergeMode]);

  const selectedMergeCount = availableMergeOptions.filter((option) => selectedMergeTypes[option.key]).length;

  const handleToggle = (key) => {
    setSelectedMergeTypes((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={{ ...dialogTitleSx, paddingBottom: "4px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={onBack || onClose}
            sx={{ color: theme.colors.secondary, padding: "2px" }}
            aria-label="Back"
          >
            <KeyboardBackspaceIcon fontSize="small" />
          </IconButton>
          <Typography component="span" sx={{ fontSize: "16px", fontWeight: "bold", color: "inherit" }}>
            Merge Materials
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: theme.colors.textMuted, fontSize: "12px", lineHeight: 1.6 }}>
          Choose which selected material types to merge into one PDF per {mergeScopeLabel(selectedMergeMode)}.
        </Typography>
        <Typography variant="body2" sx={{ color: theme.colors.textSoft, fontSize: "11px", mt: 1 }}>
          PDF files are merged directly. PPT/PPTX and DOC/DOCX files are converted to PDF first. Unsupported files stay separate.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mt: 2 }}>
          <Typography sx={{ color: theme.colors.secondary, fontSize: "12px", fontWeight: 600 }}>
            Merge mode
          </Typography>
          <Select
            value={selectedMergeMode}
            onChange={(event) => setSelectedMergeMode(event.target.value)}
            size="small"
            sx={{ ...selectSx, minWidth: "140px" }}
            slotProps={{ input: { "aria-label": "Merge mode" } }}
          >
            {MERGE_MODE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mt: 2 }}>
          {availableMergeOptions.map((option) => {
            const selected = selectedMergeTypes[option.key];

            return (
              <Box
                key={option.key}
                onClick={() => handleToggle(option.key)}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${selected ? theme.colors.primary : theme.colors.secondaryLight}`,
                  backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.primaryLight
                  }
                }}
              >
                <Checkbox
                  size="small"
                  checked={selected}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => handleToggle(option.key)}
                  sx={{
                    padding: "2px",
                    marginTop: "2px",
                    color: theme.colors.primary,
                    "&.Mui-checked": { color: theme.colors.primary }
                  }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 600, color: theme.colors.secondary }}>
                    Merge {option.label}
                  </Typography>
                  <Typography sx={{ fontSize: "11px", color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    {describeMergeOption(option.key, selectedMergeMode)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: "8px 24px 16px", gap: 1 }}>
        <Button
          variant="contained"
          onClick={() => onConfirm({ ...DEFAULT_MERGE_SELECTION }, selectedMergeMode)}
          disabled={selectedMergeCount > 0}
          sx={secondaryButtonSx}
        >
          Keep Separate
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(selectedMergeTypes, selectedMergeMode)}
          startIcon={selectedMergeCount > 0 ? <MergeTypeIcon /> : <DownloadIcon />}
          sx={primaryButtonSx}
        >
          {selectedMergeCount > 0 ? "Download With Merge" : "Download"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MergeMaterialsDialog;
