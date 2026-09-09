import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useWelcomeSceneAnimation } from './useWelcomeSceneAnimation';
import { ChatCardVisual, IntroCopy, MapVisual } from './WelcomeSceneVisuals';

/**
 * 手機版
 */
export default function MobileWelcomeScene() {
  const { refs, isLeaving, handleStart, sceneComplete } =
    useWelcomeSceneAnimation('after-narrative');

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}
    >
      {!sceneComplete && (
        <Box
          ref={refs.visualWrapperRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <ChatCardVisual
            chatCardRef={refs.chatCardRef}
            userBubbleRef={refs.userBubbleRef}
            typingRef={refs.typingRef}
            typingDotRefs={refs.typingDotRefs}
            aiBubbleRef={refs.aiBubbleRef}
          />
          <MapVisual
            mapWrapperRef={refs.mapWrapperRef}
            svgRef={refs.svgRef}
            pathRefs={refs.pathRefs}
            landmarkRefs={refs.landmarkRefs}
            pingRefs={refs.pingRefs}
            routePathRef={refs.routePathRef}
          />
        </Box>
      )}

      <Stack
        ref={refs.contentRef}
        spacing={2}
        sx={{ minWidth: 0, p: { xs: 2.5, md: 6 } }}
      >
        <IntroCopy onStart={handleStart} isLeaving={isLeaving} />
      </Stack>
    </Stack>
  );
}
