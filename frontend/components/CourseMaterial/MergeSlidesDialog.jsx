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
  Checkbox
} from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import theme from "../../Themes/theme.jsx";
import { DEFAULT_MERGE_SELECTION, MERGEABLE_CONTENT_TYPE_OPTIONS } from "../../constants/constants.js";
import { dialogPaperSx, dialogTitleSx, primaryButtonSx, secondaryButtonSx } from "../../styles/styles.js";

const MERGE_OPTION_DESCRIPTIONS = {
  slides: "Create one merged PDF per subject inside the Slides folder.",
  notes: "Create one merged PDF per subject inside the Notes folder.",
  assignments: "Create one merged PDF per subject inside the Assignments folder."
};

const MergeMaterialsDialog = ({ open, onClose, onConfirm, onBack, selectedContentTypes = [] }) => {
  const [selectedMergeTypes, setSelectedMergeTypes] = useState(DEFAULT_MERGE_SELECTION);

  const availableMergeOptions = useMemo(
    () => MERGEABLE_CONTENT_TYPE_OPTIONS.filter((option) => selectedContentTypes.includes(option.id)),
    [selectedContentTypes]
  );

  useEffect(() => {
    if (open) {
      setSelectedMergeTypes({ ...DEFAULT_MERGE_SELECTION });
    }
  }, [open, selectedContentTypes]);

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
            sx={{ color: "#233a76", padding: "2px" }}
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
        <Typography variant="body2" sx={{ color: "#666", fontSize: "12px", lineHeight: 1.6 }}>
          Choose which selected material types should be merged subject-wise into one PDF. QA and QB always stay separate.
          </Typography>
        <Typography variant="body2" sx={{ color: "#888", fontSize: "11px", mt: 1 }}>
          PDF files are merged directly. PPT/PPTX and DOC/DOCX files are converted to PDF first. Unsupported files stay separate.
        </Typography>

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
                  backgroundColor: selected ? theme.colors.primaryLight : "rgba(255,255,255,0.85)",
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
                  <Typography sx={{ fontSize: "11px", color: "#6e6e6e", lineHeight: 1.5 }}>
                    {MERGE_OPTION_DESCRIPTIONS[option.key]}
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
          onClick={() => onConfirm({ ...DEFAULT_MERGE_SELECTION })}
          disabled={selectedMergeCount > 0}
          sx={secondaryButtonSx}
        >
          Keep Separate
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(selectedMergeTypes)}
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
