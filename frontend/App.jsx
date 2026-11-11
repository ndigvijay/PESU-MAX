import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { Provider, useDispatch } from "react-redux";
import { store } from "./redux/store.jsx";
import Sidebar from "./components/SideBar.jsx";
import CircularButton from "./components/CircularButton.jsx";
import { PESU_SESSION_EXPIRED_KEY } from "../src/helpers/pesuAPI.js";
import { ACADEMY_APP_PATH_PREFIX } from "../src/content/academyPage.js";
import { loadDeadlines } from "./redux/deadlinesSlice.js";
import { openSidebar, setCurrentPage } from "./redux/sidebarSlice.js";
import { subscribeToDeadlines } from "../src/services/deadlineService.js";
import theme from "./Themes/theme.jsx";
import { dialogPaperSx } from "./styles/styles.js";

const isSignedInPage = () => window.location.pathname.startsWith(ACADEMY_APP_PATH_PREFIX);

const DeadlinesSyncBridge = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!isSignedInPage()) return undefined;
        dispatch(loadDeadlines());
        const unsubscribe = subscribeToDeadlines(() => {
            dispatch(loadDeadlines());
        });

        const messageListener = (message) => {
            if (message?.action === "openDeadlinesPage") {
                dispatch(openSidebar());
                dispatch(setCurrentPage("deadlines"));
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            unsubscribe();
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, [dispatch]);

    return null;
};

const App = () => {
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        if (!isSignedInPage()) {
            chrome.storage.local.remove(PESU_SESSION_EXPIRED_KEY);
            return undefined;
        }

        chrome.storage.local.get(PESU_SESSION_EXPIRED_KEY, (result) => {
            setSessionExpired(result[PESU_SESSION_EXPIRED_KEY] === true);
        });

        const listener = (changes, areaName) => {
            if (areaName === "local" && changes[PESU_SESSION_EXPIRED_KEY]) {
                setSessionExpired(changes[PESU_SESSION_EXPIRED_KEY].newValue === true);
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const reloadPage = () => {
        chrome.storage.local.remove(PESU_SESSION_EXPIRED_KEY, () => {
            window.location.reload();
        });
    };

    return (
        <Provider store={store}>
            <DeadlinesSyncBridge />
            <CircularButton/>
            <Sidebar/>
            <Dialog
                open={sessionExpired}
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        ...dialogPaperSx,
                        border: `1px solid ${theme.colors.line}`
                    }
                }}
            >
                <DialogTitle sx={{ color: theme.colors.secondary, fontWeight: 700 }}>
                    Session expired
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: theme.colors.secondary }}>
                        Your PESU Academy session has expired. Reload the page and log in again if prompted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ backgroundColor: theme.colors.secondaryLight }}>
                    <Button
                        variant="contained"
                        onClick={reloadPage}
                        sx={{
                            backgroundColor: theme.colors.primary,
                            textTransform: 'none',
                            '&:hover': { backgroundColor: theme.colors.primaryHover }
                        }}
                    >
                        Reload page
                    </Button>
                </DialogActions>
            </Dialog>
        </Provider>
     );
}

export default App;
