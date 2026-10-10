import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import theme from "../../Themes/theme.jsx";
import {
  dialogPaperSx,
  dialogTitleSx,
  popupPrimaryButtonSx,
  popupSecondaryButtonSx,
  switchSx
} from "../../styles/styles.js";
import { load, save } from "../../../src/utils/storage.js";
import { SIDE_MENU_DOCK_SECTIONS_KEY } from "../../../src/utils/storageKeys.js";
import {
  DOCK_SECTION_LIMIT,
  MENU_SECTIONS,
  SECTION_CATEGORIES,
  dockSections
} from "../../../src/content/sideMenuDock";

const headerRowSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px"
};

const countSx = {
  padding: "2px 10px",
  borderRadius: "999px",
  backgroundColor: theme.colors.primaryLight,
  color: theme.colors.primary,
  fontSize: "12px",
  fontWeight: 700
};

const sectionRowSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  minHeight: "34px",
  padding: "0 8px",
  borderRadius: "10px"
};

const sectionLabelSx = {
  color: theme.colors.secondary
};

const categorySx = {
  color: theme.colors.secondary,
  fontWeight: "bold",
  marginTop: "10px"
};

const DockSectionsDialog = ({ open, onClose }) => {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) {
      setLoading(true);
      return undefined;
    }

    let stale = false;
    setLoading(true);
    setError("");
    setNotice("");
    load(SIDE_MENU_DOCK_SECTIONS_KEY)
      .then((stored) => {
        if (!stale) setDraft(dockSections(stored));
      })
      .catch(() => {
        if (!stale) setError("Could not load your dock sections. Please retry.");
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
  }, [open]);

  const chosen = draft || [];
  const full = chosen.length >= DOCK_SECTION_LIMIT;

  const toggle = (id, next) => {
    if (next && full) {
      setNotice(`The dock holds ${DOCK_SECTION_LIMIT} sections. Turn one off to add another.`);
      return;
    }
    setNotice("");
    setDraft(next ? [...chosen, id] : chosen.filter((entry) => entry !== id));
  };

  const handleSave = async () => {
    if (loading || saving || !draft) return;
    setSaving(true);
    setError("");
    try {
      await save(SIDE_MENU_DOCK_SECTIONS_KEY, dockSections(chosen));
      onClose();
    } catch (saveError) {
      setError("Could not save your dock sections. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={{ ...dialogTitleSx, paddingBottom: "4px" }}>Dock sections</DialogTitle>
      <DialogContent>
        {notice && (
          <Alert
            severity="info"
            sx={{ position: "sticky", top: 0, zIndex: 1, marginBottom: "10px" }}
          >
            {notice}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: "24px" }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Stack spacing="8px">
            <Box sx={headerRowSx}>
              <Typography variant="body2" sx={{ color: theme.colors.secondary, fontWeight: 600 }}>
                Sections in the dock
              </Typography>
              <Typography sx={countSx}>
                {chosen.length} / {DOCK_SECTION_LIMIT}
              </Typography>
            </Box>
            {SECTION_CATEGORIES.map((category) => (
              <Box key={category}>
                <Typography variant="body2" sx={categorySx}>
                  {category}
                </Typography>
                {MENU_SECTIONS.filter((section) => section.category === category).map((section) => {
                  const on = chosen.includes(section.id);
                  return (
                    <Box key={section.id} sx={sectionRowSx}>
                      <Typography variant="body2" sx={sectionLabelSx}>
                        {section.label}
                      </Typography>
                      <Switch
                        checked={on}
                        onChange={(event) => toggle(section.id, event.target.checked)}
                        disabled={saving}
                        sx={switchSx}
                        slotProps={{ input: { "aria-label": section.label } }}
                      />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Stack>
        )}
        {error && (
          <Alert severity="error" sx={{ marginTop: "12px" }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          disableElevation
          sx={popupSecondaryButtonSx}
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          sx={popupPrimaryButtonSx}
          onClick={handleSave}
          disabled={saving || loading || !draft}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DockSectionsDialog;
