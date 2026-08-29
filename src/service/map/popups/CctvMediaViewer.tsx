import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { shadowTokens } from '@/config/designTokens';
import type { CctvCameraView } from '@/service/map/features/cctvFeatures';
import { resolveHlsPageUrl } from '@/service/map/shared/cctvStreams';

type MediaStatus = 'loading' | 'loaded' | 'error';

/** 建立 HLS 或 WebSocket FLV 播放器，並在切換鏡頭時釋放連線。 */
function CctvVideo({
  camera,
  onStatusChange,
}: {
  camera: CctvCameraView;
  onStatusChange: (status: MediaStatus) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let cleanup: () => void = () => undefined;
    const abortController = new AbortController();

    const start = async () => {
      try {
        if (camera.streamKind === 'hls' || camera.streamKind === 'hls-page') {
          const streamUrl =
            camera.streamKind === 'hls-page'
              ? await resolveHlsPageUrl(camera.streamUrl, abortController.signal)
              : camera.streamUrl;
          if (disposed) return;
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            cleanup = () => video.removeAttribute('src');
          } else {
            const { default: Hls } = await import('hls.js');
            if (disposed || !Hls.isSupported()) throw new Error('HLS unsupported');
            const hls = new Hls({ lowLatencyMode: true });
            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal && !disposed) onStatusChange('error');
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            cleanup = () => hls.destroy();
          }
        } else {
          const { default: mpegts } = await import('mpegts.js');
          if (disposed || !mpegts.isSupported()) throw new Error('FLV unsupported');
          const player = mpegts.createPlayer(
            {
              type: 'flv',
              isLive: true,
              hasAudio: false,
              url: camera.streamUrl,
            },
            {
              enableStashBuffer: false,
              liveBufferLatencyChasing: true,
            },
          );
          player.on(mpegts.Events.ERROR, () => {
            if (!disposed) onStatusChange('error');
          });
          player.attachMediaElement(video);
          player.load();
          void Promise.resolve(player.play()).catch(() => {
            if (!disposed) onStatusChange('error');
          });
          cleanup = () => {
            player.pause();
            player.unload();
            player.detachMediaElement();
            player.destroy();
          };
        }

        if (!disposed) void video.play().catch(() => undefined);
      } catch {
        if (!disposed) onStatusChange('error');
      }
    };

    void start();
    return () => {
      disposed = true;
      abortController.abort();
      cleanup();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [camera, onStatusChange]);

  return (
    <Box
      ref={videoRef}
      component="video"
      muted
      autoPlay
      playsInline
      onPlaying={() => onStatusChange('loaded')}
      aria-label={`${camera.roadName || 'CCTV'} 即時影像`}
      sx={{ display: 'block', width: '100%', maxHeight: '100%', bgcolor: 'black' }}
    />
  );
}

/** 依串流格式顯示即時影像，支援圖片、HLS 與 WebSocket FLV。 */
export default function CctvMediaViewer({ camera }: { camera: CctvCameraView }) {
  const [status, setStatus] = useState<MediaStatus>('loading');
  const [isZoomed, setIsZoomed] = useState(false);
  const isVideo = camera.streamKind !== 'image';

  const media = isVideo ? (
    <CctvVideo camera={camera} onStatusChange={setStatus} />
  ) : (
    <Box
      component="img"
      src={camera.imageUrl}
      alt={`${camera.roadName || 'CCTV'} 即時影像`}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      sx={{ display: 'block', width: '100%' }}
    />
  );

  if (status === 'error') {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Button
          component="a"
          href={camera.streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          startIcon={<OpenInNewRoundedIcon fontSize="small" />}
        >
          在新分頁開啟影像
        </Button>
      </Box>
    );
  }

  const mediaFrame = (
    <Box
      sx={{
        position: 'relative',
        minHeight: 160,
        overflow: 'hidden',
        borderRadius: 1,
        bgcolor: 'rgba(16,47,58,.06)',
      }}
    >
      {status === 'loading' && (
        <Box
          role="status"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={20} color="secondary" />
          <Typography variant="caption" color="text.secondary">
            影像載入中…
          </Typography>
        </Box>
      )}
      <ButtonBase
        onClick={() => status === 'loaded' && setIsZoomed(true)}
        aria-label={`放大檢視${camera.roadName || 'CCTV'}即時影像`}
        disabled={status !== 'loaded'}
        sx={{ display: 'block', width: '100%', cursor: 'zoom-in' }}
      >
        <Box sx={{ width: '100%', opacity: status === 'loaded' ? 1 : 0 }}>
          {media}
        </Box>
      </ButtonBase>
    </Box>
  );

  return (
    <>
      <Box sx={{ mt: 1.5 }}>{!isZoomed && mediaFrame}</Box>
      <Modal open={isZoomed} onClose={() => setIsZoomed(false)}>
        <Box
          onClick={() => setIsZoomed(false)}
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            outline: 'none',
          }}
        >
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{ position: 'relative', width: 'min(92vw, 1120px)', maxHeight: '92vh' }}
          >
            <IconButton
              aria-label="關閉放大檢視"
              onClick={() => setIsZoomed(false)}
              sx={{
                position: 'absolute',
                zIndex: 2,
                right: -12,
                top: -12,
                bgcolor: 'background.paper',
                boxShadow: shadowTokens.control,
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
            {isZoomed && mediaFrame}
          </Box>
        </Box>
      </Modal>
    </>
  );
}
