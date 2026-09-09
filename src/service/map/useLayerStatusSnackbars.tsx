import { useCallback, useEffect, useRef } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useSnackbar, type SnackbarKey } from 'notistack';
import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import { uiColors } from '@/config/semanticColors';
import { shadowTokens } from '@/config/designTokens';
import {
  getRemainingLoadingVisibility,
  LAYER_LOADING_DELAY_MS,
  type LayerStatus,
} from '@/service/map/layerErrors';

type ShownSnackbar = {
  key: SnackbarKey;
  signature: string;
  type: LayerStatus['type'];
  shownAt: number;
};

type TimerMap = Map<TrafficLayerId, ReturnType<typeof setTimeout>>;

/** 將各圖層狀態同步為 notistack 通知，並抑制短暫 loading 閃爍。 */
export function useLayerStatusSnackbars(statuses: LayerStatus[]) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const shownRef = useRef(new Map<TrafficLayerId, ShownSnackbar>());
  const loadingDelayTimersRef = useRef<TimerMap>(new Map());
  const closeTimersRef = useRef<TimerMap>(new Map());
  const latestStatusesRef = useRef(statuses);
  latestStatusesRef.current = statuses;

  const clearTimer = useCallback((timers: TimerMap, layerId: TrafficLayerId) => {
    const timer = timers.get(layerId);
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.delete(layerId);
  }, []);

  const enqueueStatus = useCallback(
    (status: LayerStatus) => {
      const LayerIcon = status.icon;
      const feedbackColors = uiColors.feedback[status.type];
      const signature = `${status.type}:${status.message}`;
      const key = enqueueSnackbar(status.message, {
        key: `${status.id}:${status.type}`,
        persist: true,
        preventDuplicate: true,
        content: (snackbarKey) => (
          <Alert
            elevation={0}
            severity={status.type === 'error' ? 'error' : 'info'}
            variant="filled"
            icon={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <LayerIcon sx={{ color: status.color, fontSize: 21 }} />
                {status.type === 'loading' ? (
                  <CircularProgress
                    size={15}
                    sx={{ color: feedbackColors.accent }}
                  />
                ) : (
                  <ErrorOutlineRoundedIcon
                    sx={{ color: feedbackColors.accent, fontSize: 18 }}
                  />
                )}
              </Box>
            }
            onClose={() => closeSnackbar(snackbarKey)}
            sx={{
              width: '100%',
              minWidth: { xs: 280, sm: 340 },
              alignItems: 'center',
              bgcolor: feedbackColors.surface,
              color: feedbackColors.text,
              border: '1px solid',
              borderColor: feedbackColors.border,
              boxShadow: shadowTokens.control,
              '& .MuiAlert-icon': { alignItems: 'center', color: 'inherit' },
              '& .MuiAlert-action': { color: feedbackColors.accent },
            }}
          >
            {status.message}
          </Alert>
        ),
      });
      shownRef.current.set(status.id, {
        key,
        signature,
        type: status.type,
        shownAt: Date.now(),
      });
    },
    [closeSnackbar, enqueueSnackbar],
  );

  const closeShown = useCallback(
    (layerId: TrafficLayerId) => {
      const shown = shownRef.current.get(layerId);
      if (!shown) return;
      closeSnackbar(shown.key);
      shownRef.current.delete(layerId);
      closeTimersRef.current.delete(layerId);
    },
    [closeSnackbar],
  );

  const statusSignature = statuses
    .map((status) => `${status.id}:${status.type}:${status.message}`)
    .join('|');

  useEffect(() => {
    const statusesById = new Map(statuses.map((status) => [status.id, status]));

    shownRef.current.forEach((shown, layerId) => {
      const status = statusesById.get(layerId);
      if (status) return;
      if (shown.type === 'error') {
        closeShown(layerId);
        return;
      }
      if (closeTimersRef.current.has(layerId)) return;
      const remaining = getRemainingLoadingVisibility(shown.shownAt, Date.now());
      const timer = setTimeout(() => closeShown(layerId), remaining);
      closeTimersRef.current.set(layerId, timer);
    });

    statuses.forEach((status) => {
      const signature = `${status.type}:${status.message}`;
      const shown = shownRef.current.get(status.id);
      clearTimer(closeTimersRef.current, status.id);

      if (shown?.signature === signature) return;
      if (status.type === 'error') {
        clearTimer(loadingDelayTimersRef.current, status.id);
        if (shown) closeShown(status.id);
        enqueueStatus(status);
        return;
      }
      if (shown || loadingDelayTimersRef.current.has(status.id)) return;

      const timer = setTimeout(() => {
        loadingDelayTimersRef.current.delete(status.id);
        const current = latestStatusesRef.current.find(
          (item) => item.id === status.id && item.type === 'loading',
        );
        if (current) enqueueStatus(current);
      }, LAYER_LOADING_DELAY_MS);
      loadingDelayTimersRef.current.set(status.id, timer);
    });

    loadingDelayTimersRef.current.forEach((_, layerId) => {
      if (statusesById.get(layerId)?.type === 'loading') return;
      clearTimer(loadingDelayTimersRef.current, layerId);
    });
  }, [
    statusSignature,
    statuses,
    clearTimer,
    closeShown,
    enqueueStatus,
  ]);

  useEffect(
    () => () => {
      loadingDelayTimersRef.current.forEach(clearTimeout);
      closeTimersRef.current.forEach(clearTimeout);
      shownRef.current.forEach(({ key }) => closeSnackbar(key));
      loadingDelayTimersRef.current.clear();
      closeTimersRef.current.clear();
      shownRef.current.clear();
    },
    [closeSnackbar],
  );
}
