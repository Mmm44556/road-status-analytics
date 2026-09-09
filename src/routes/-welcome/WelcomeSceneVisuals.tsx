import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { ChatName } from '@/config/appInfo';
import { uiColors } from '@/config/semanticColors';
import { radiusTokens, shadowTokens } from '@/config/designTokens';
import {
  CHAT_SCRIPT,
  FEATURES,
  countyPaths,
  routePathD,
  routePoints,
  viewBoxSize,
} from './welcomeSceneData';

/**
 * 純呈現用的視覺元件
 */

export type ChatCardRefs = {
  chatCardRef: RefObject<HTMLDivElement | null>;
  userBubbleRef: RefObject<HTMLDivElement | null>;
  typingRef: RefObject<HTMLDivElement | null>;
  typingDotRefs: RefObject<(HTMLSpanElement | null)[]>;
  aiBubbleRef: RefObject<HTMLDivElement | null>;
};

export function ChatCardVisual({
  chatCardRef,
  userBubbleRef,
  typingRef,
  typingDotRefs,
  aiBubbleRef,
}: ChatCardRefs) {
  return (
    <Box
      ref={chatCardRef}
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1.5,
        p: { xs: 2.5, md: 6 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mx: 'auto',
          width: '100%',
          maxWidth: 480,
          p: { xs: 3, md: 4 },
          borderRadius: radiusTokens.floating,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: shadowTokens.floating,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            component="img"
            src="/Logo-icon-bg.png"
            alt=""
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              objectFit: 'contain',
            }}
          />
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: 'text.secondary',
            }}
          >
            {ChatName} 路線助理
          </Typography>
        </Stack>

        <Box
          ref={userBubbleRef}
          sx={{
            alignSelf: 'flex-end',
            maxWidth: '85%',
            px: 2.25,
            py: 1.25,
            borderRadius: '16px 16px 4px 16px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="body1">{CHAT_SCRIPT.user}</Typography>
        </Box>

        <Box
          ref={typingRef}
          sx={{
            alignSelf: 'flex-start',
            display: 'flex',
            gap: 0.75,
            px: 2,
            py: 1.4,
            borderRadius: '16px 16px 16px 4px',
            bgcolor: 'background.subtle',
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              component="span"
              ref={(el: HTMLSpanElement | null) => {
                typingDotRefs.current[index] = el;
              }}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'text.secondary',
                display: 'inline-block',
              }}
            />
          ))}
        </Box>

        <Box
          ref={aiBubbleRef}
          sx={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            px: 2.25,
            py: 1.25,
            borderRadius: '16px 16px 16px 4px',
            bgcolor: 'background.subtle',
            color: 'text.primary',
          }}
        >
          <Typography variant="body1">{CHAT_SCRIPT.assistant}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export type MapVisualRefs = {
  mapWrapperRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  pathRefs: RefObject<(SVGPathElement | null)[]>;
  landmarkRefs: RefObject<(SVGGElement | null)[]>;
  pingRefs: RefObject<(SVGCircleElement | null)[]>;
  routePathRef: RefObject<SVGPathElement | null>;
};

export function MapVisual({
  mapWrapperRef,
  svgRef,
  pathRefs,
  landmarkRefs,
  pingRefs,
  routePathRef,
}: MapVisualRefs) {
  return (
    <Box
      ref={mapWrapperRef}
      sx={{
        position: 'absolute',
        inset: 0,
        transition: 'filter .35s ease',
        filter: 'drop-shadow(0 16px 36px rgba(6,43,91,.16))',
        '&:hover': {
          filter: 'drop-shadow(0 20px 42px rgba(112,227,197,.5))',
        },
      }}
    >
      <Box
        ref={svgRef}
        component="svg"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        sx={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <g>
          {countyPaths.map((county, index) => (
            <path
              key={county.id}
              ref={(el) => {
                pathRefs.current[index] = el;
              }}
              d={county.d}
              fill={uiColors.brand.mint}
              fillOpacity={0}
              stroke={uiColors.brand.ink}
              strokeWidth={0.22}
              strokeLinejoin="round"
            />
          ))}
          <path
            ref={routePathRef}
            d={routePathD}
            fill="none"
            stroke={uiColors.brand.teal}
            strokeWidth={0.8}
            strokeLinecap="round"
          />
          {routePoints.map((stop, index) => (
            <g
              key={stop.id}
              ref={(el) => {
                landmarkRefs.current[index] = el;
              }}
            >
              <circle
                ref={(el) => {
                  pingRefs.current[index] = el;
                }}
                cx={stop.point[0]}
                cy={stop.point[1]}
                r={1.6}
                fill={uiColors.brand.teal}
              />
              <circle
                cx={stop.point[0]}
                cy={stop.point[1]}
                r={1.6}
                fill={uiColors.brand.teal}
                stroke={uiColors.surface.paper}
                strokeWidth={0.5}
              />
              <text
                x={stop.point[0]}
                y={stop.point[1] - 4}
                fontSize={4}
                fontWeight={700}
                textAnchor="middle"
                fill={uiColors.brand.ink}
                stroke={uiColors.surface.paper}
                strokeWidth={0.6}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {stop.name}
              </text>
            </g>
          ))}
        </g>
      </Box>
    </Box>
  );
}

export function IntroCopy({
  onStart,
  isLeaving,
}: {
  onStart: () => void;
  isLeaving: boolean;
}) {
  return (
    <>
      <Stack spacing={1.5}>
        <Typography
          variant="h1"
          sx={{
            color: 'primary.main',
            fontSize: 'clamp(2rem, 3.6vw, 3.1rem)',
          }}
        >
          全臺即時路況，一眼掌握
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', fontSize: '1.15rem' }}
        >
          直接跟 AI 助理說話，幫你規劃路線、操作地圖。
        </Typography>
      </Stack>

      <Stack
        spacing={1.25}
        component="ul"
        sx={{ listStyle: 'none', m: 0, p: 0 }}
      >
        {FEATURES.map((feature) => (
          <Stack
            key={feature}
            component="li"
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{ minWidth: 0 }}
          >
            <CheckRoundedIcon
              sx={{
                color: 'secondary.dark',
                fontSize: 22,
                mt: '2px',
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body1"
              sx={{ color: 'text.primary', fontSize: '1rem', minWidth: 0 }}
            >
              {feature}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        onClick={onStart}
        disabled={isLeaving}
        endIcon={<ArrowForwardRoundedIcon />}
        sx={{
          alignSelf: 'flex-start',
          px: 3.5,
          py: 1.25,
          bgcolor: 'primary.main',
          boxShadow: shadowTokens.control,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        開始使用
      </Button>
    </>
  );
}
