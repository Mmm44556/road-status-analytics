import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useWelcomeSceneAnimation } from './useWelcomeSceneAnimation';
import { ChatCardVisual, IntroCopy, MapVisual } from './WelcomeSceneVisuals';

/**
 * 桌面版
 */
export default function DesktopWelcomeScene() {
  const { refs, isLeaving, handleStart } =
    useWelcomeSceneAnimation('immediate');

  return (
    <Stack
      direction="row"
      spacing={4}
      alignItems="center"
      justifyContent="space-between"
      sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1600 }}
    >
      <Stack
        ref={refs.contentRef}
        spacing={3}
        sx={{
          maxWidth: 650,
          width: '100%',
          minWidth: 0,
          p: { xs: 2.5, md: 3 },
        }}
      >
        <IntroCopy onStart={handleStart} isLeaving={isLeaving} />
      </Stack>

      <Box
        sx={{
          position: 'relative',
          width: '58vw',
          maxWidth: 820,
          aspectRatio: '1 / 1',
          flexShrink: 0,
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
    </Stack>
  );
}
