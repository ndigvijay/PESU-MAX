import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import {
  downloadResourceNotification,
  getResourceNotifications,
  markResourceNotificationsRead
} from "../../src/services/resourceNotificationService.js";

export const fetchResourceNotifications = createAsyncThunk(
  "notifications/fetchResourceNotifications",
  async (_, { rejectWithValue }) => {
    try {
      return await getResourceNotifications();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markNotificationsRead = createAsyncThunk(
  "notifications/markNotificationsRead",
  async (ids, { rejectWithValue }) => {
    try {
      return await markResourceNotificationsRead(ids);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadNotificationResource = createAsyncThunk(
  "notifications/downloadNotificationResource",
  async (notification, { rejectWithValue }) => {
    try {
      return await downloadResourceNotification(notification);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    readIds: [],
    checking: false,
    ready: false,
    loading: false,
    marking: false,
    downloadingIds: {},
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResourceNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResourceNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.items = action.payload.notifications;
        state.readIds = action.payload.readIds;
        state.checking = action.payload.checking;
      })
      .addCase(fetchResourceNotifications.rejected, (state) => {
        state.loading = false;
        state.error = "Could not load notifications. Please retry.";
      })
      .addCase(markNotificationsRead.pending, (state) => {
        state.marking = true;
        state.error = null;
      })
      .addCase(markNotificationsRead.fulfilled, (state, action) => {
        state.marking = false;
        state.readIds = action.payload;
      })
      .addCase(markNotificationsRead.rejected, (state) => {
        state.marking = false;
        state.error = "Could not mark as read. Please try again.";
      })
      .addCase(downloadNotificationResource.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) {
          state.downloadingIds[id] = true;
        }
        state.error = null;
      })
      .addCase(downloadNotificationResource.fulfilled, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) {
          delete state.downloadingIds[id];
        }
      })
      .addCase(downloadNotificationResource.rejected, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) {
          delete state.downloadingIds[id];
        }
        state.error = action.payload || "Could not download file. Please try again.";
      });
  },
});

const selectItems = (state) => state.notifications.items;
const selectReadIds = (state) => state.notifications.readIds;

export const selectReadIdSet = createSelector([selectReadIds], (readIds) => new Set(readIds));

export const selectUnreadCount = createSelector(
  [selectItems, selectReadIdSet],
  (items, readIdSet) => items.filter((item) => !readIdSet.has(item.id)).length
);

export default notificationsSlice.reducer;
