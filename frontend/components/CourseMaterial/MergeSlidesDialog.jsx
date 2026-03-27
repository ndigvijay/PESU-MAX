import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton
} from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { dialogPaperSx, dialogTitleSx, primaryButtonSx, secondaryButtonSx } from "../../styles/styles.js";

const MergeSlidesDialog = ({ open, onClose, onConfirm, onBack }) => {
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
            Merge Slides
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "#666", fontSize: "12px", lineHeight: 1.6 }}>
          Do you want to merge selected slide files subject-wise into one PDF?
        </Typography>
        <Typography variant="body2" sx={{ color: "#888", fontSize: "11px", mt: 1 }}>
          PDF files are merged directly. PPT/PPTX and DOC/DOCX files are converted to PDF first. Files that fail conversion stay separate.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ padding: "8px 24px 16px", gap: 1 }}>
        <Button
          variant="contained"
          onClick={() => onConfirm(false)}
          sx={secondaryButtonSx}
        >
          Keep Separate
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(true)}
          startIcon={<MergeTypeIcon />}
          sx={primaryButtonSx}
        >
          Merge Slides
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MergeSlidesDialog;
