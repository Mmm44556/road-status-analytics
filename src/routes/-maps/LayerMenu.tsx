import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import TrafficRoundedIcon from '@mui/icons-material/TrafficRounded';
import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import { trafficLayerGroups } from '@/data/trafficLayerGroups';
import { basemapCatalog, type BasemapId } from '@/data/basemapCatalog';
import { radiusTokens, typographyTokens } from '@/config/designTokens';

type HeaderMenuId =
  | 'traffic'
  | 'publicTransport'
  | 'parking'
  | 'basemap'
  | 'settings';

type LayerMenuProps = {
  visibleLayers: Set<TrafficLayerId>;
  onToggle: (layerId: TrafficLayerId) => void;
  showBoundaryMask: boolean;
  onToggleBoundaryMask: () => void;
  showAdministrativeBoundaries: boolean;
  onToggleAdministrativeBoundaries: () => void;
  canToggleLayer: (layerId: TrafficLayerId) => boolean;
  basemapId: BasemapId;
  onChangeBasemap: (basemapId: BasemapId) => void;
};

type SelectableItemProps = {
  checked: boolean;
  icon: ReactNode;
  label: string;
  secondary?: string;
  disabled?: boolean;
  radio?: boolean;
  onClick: () => void;
};

/** 顯示不會在選取後關閉的 Menu 選項。 */
function SelectableItem({
  checked,
  icon,
  label,
  secondary,
  disabled = false,
  radio = false,
  onClick,
}: SelectableItemProps) {
  const role = radio ? 'menuitemradio' : 'menuitemcheckbox';
  const control = radio ? (
    <Radio edge="end" checked={checked} tabIndex={-1} aria-hidden="true" />
  ) : (
    <Checkbox edge="end" checked={checked} tabIndex={-1} aria-hidden="true" />
  );

  return (
    <MenuItem
      dense
      disabled={disabled}
      onClick={onClick}
      aria-checked={checked}
      role={role}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} secondary={secondary} />
      {control}
    </MenuItem>
  );
}

/** 將五個獨立功能選單渲染至全站 Header。 */
export default function LayerMenu({
  visibleLayers,
  onToggle,
  showBoundaryMask,
  onToggleBoundaryMask,
  showAdministrativeBoundaries,
  onToggleAdministrativeBoundaries,
  canToggleLayer,
  basemapId,
  onChangeBasemap,
}: LayerMenuProps) {
  const theme = useTheme();
  // 手機版沒有 preventOverflow／flip modifier 的 Popper 貼著螢幕邊緣容易被裁切，
  // 改用從底部滑出的 Drawer（滿版寬度、貼底部，不會有錨點定位溢出的問題）；
  // 桌面版維持原本的 Popper。
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<HeaderMenuId>('traffic');
  // 手機版收斂成單一「圖層」按鈕，開啟後先顯示這份分類清單當子選項，
  // 選了某個分類才切換成該分類原本的內容；桌面版的 5 個按鈕不會用到這個狀態。
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    setPortalTarget(document.getElementById('header-layer-controls'));
  }, []);

  useEffect(() => {
    if (!menuAnchor) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuAnchor(null);
      menuAnchor.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuAnchor]);

  if (!portalTarget) return null;

  const menuDefinitions: Array<{
    id: HeaderMenuId;
    label: string;
    icon: ReactNode;
    count: number;
  }> = [
    {
      id: 'traffic',
      label: '即時交通',
      icon: <TrafficRoundedIcon />,
      count: trafficLayerGroups
        .find((group) => group.id === 'traffic')!
        .layerIds.filter((id) => visibleLayers.has(id)).length,
    },
    {
      id: 'publicTransport',
      label: '公共運輸',
      icon: <DirectionsTransitRoundedIcon />,
      count: trafficLayerGroups
        .find((group) => group.id === 'publicTransport')!
        .layerIds.filter((id) => visibleLayers.has(id)).length,
    },
    {
      id: 'parking',
      label: '停車',
      icon: <LocalParkingRoundedIcon />,
      count: trafficLayerGroups
        .find((group) => group.id === 'parking')!
        .layerIds.filter((id) => visibleLayers.has(id)).length,
    },
    { id: 'basemap', label: '底圖', icon: <MapRoundedIcon />, count: 0 },
    { id: 'settings', label: '設定', icon: <SettingsRoundedIcon />, count: 0 },
  ];
  const activeDefinition = menuDefinitions.find(
    (definition) => definition.id === activeMenu,
  )!;
  const activeGroup = trafficLayerGroups.find(
    (group) => group.id === activeMenu,
  );
  const totalActiveLayerCount = menuDefinitions.reduce(
    (sum, definition) => sum + definition.count,
    0,
  );

  const openMenu = (menuId: HeaderMenuId, anchor: HTMLElement) => {
    if (menuAnchor && activeMenu === menuId && !showCategoryPicker) {
      setMenuAnchor(null);
      return;
    }
    setActiveMenu(menuId);
    setShowCategoryPicker(false);
    setMenuAnchor(anchor);
  };

  /** 手機版單一按鈕：開啟時一律先回到分類清單，再點一次同一顆按鈕則關閉。 */
  const openMobileMenu = (anchor: HTMLElement) => {
    if (menuAnchor === anchor) {
      setMenuAnchor(null);
      return;
    }
    setShowCategoryPicker(true);
    setMenuAnchor(anchor);
  };

  /** Popper（桌面）與 Drawer（手機）共用同一份內容，只有外殼容器不同。 */
  const menuBody = (
    <>
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {!showCategoryPicker && (
          <IconButton
            size="small"
            aria-label="返回圖層分類"
            onClick={() => setShowCategoryPicker(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 0.5 }}
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        )}
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            {showCategoryPicker ? '圖層' : activeDefinition.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {showCategoryPicker
              ? '選擇要開啟的圖層分類'
              : '選取後選單會保持開啟'}
          </Typography>
        </Box>
      </Box>
      {showCategoryPicker ? (
        <MenuList
          dense
          aria-label="圖層分類"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            closeMenu();
            menuAnchor?.focus();
          }}
        >
          {menuDefinitions.map((definition) => (
            <MenuItem
              key={definition.id}
              onClick={() => {
                setActiveMenu(definition.id);
                setShowCategoryPicker(false);
              }}
            >
              <ListItemIcon>{definition.icon}</ListItemIcon>
              <ListItemText primary={definition.label} />
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {definition.count > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {definition.count}
                  </Typography>
                )}
                <ChevronRightRoundedIcon
                  fontSize="small"
                  sx={{ color: 'text.disabled' }}
                />
              </Stack>
            </MenuItem>
          ))}
        </MenuList>
      ) : (
        <>
          <MenuList
            dense
            aria-label={`${activeDefinition.label}選單`}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              closeMenu();
              menuAnchor?.focus();
            }}
          >
            {activeGroup?.layerIds.map((layerId) => {
              const layer = trafficLayerCatalog.find(
                (item) => item.id === layerId,
              )!;
              const disabled =
                !canToggleLayer(layer.id) || layer.availability !== 'available';
              return (
                <SelectableItem
                  key={layer.id}
                  checked={visibleLayers.has(layer.id)}
                  disabled={disabled}
                  icon={
                    <layer.icon fontSize="small" sx={{ color: layer.color }} />
                  }
                  label={layer.label}
                  secondary={
                    !canToggleLayer(layer.id)
                      ? '目前查詢模式無法使用'
                      : layer.description
                  }
                  onClick={() => onToggle(layer.id)}
                />
              );
            })}

            {activeMenu === 'basemap' &&
              basemapCatalog.map((basemap) => (
                <SelectableItem
                  key={basemap.id}
                  checked={basemap.id === basemapId}
                  radio
                  icon={<LayersRoundedIcon fontSize="small" color="action" />}
                  label={basemap.label}
                  onClick={() => onChangeBasemap(basemap.id)}
                />
              ))}

            {activeMenu === 'settings' && (
              <>
                <SelectableItem
                  checked={showBoundaryMask}
                  icon={<MapRoundedIcon fontSize="small" color="action" />}
                  label="臺灣範圍遮罩"
                  secondary="顯示臺灣範圍外的灰色遮罩"
                  onClick={onToggleBoundaryMask}
                />
                <SelectableItem
                  checked={showAdministrativeBoundaries}
                  icon={<LayersRoundedIcon fontSize="small" color="action" />}
                  label="行政區選擇圖層"
                  secondary="僅切換顯示，不會跳過選擇流程"
                  onClick={onToggleAdministrativeBoundaries}
                />
              </>
            )}
          </MenuList>
          {activeMenu === 'settings' && (
            <>
              <Divider />
              <Box
                component="section"
                aria-labelledby="traffic-data-source-title"
                sx={{ px: 2, py: 1.5 }}
              >
                <Typography
                  id="traffic-data-source-title"
                  variant="caption"
                  fontWeight={700}
                >
                  資料來源
                </Typography>
                <Typography
                  display="block"
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  交通資料：交通部 TDX 運輸資料流通服務
                </Typography>
                <Typography
                  display="block"
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  資料可能存在延遲，實際交通狀況以現場為準。
                </Typography>
              </Box>
            </>
          )}
        </>
      )}
    </>
  );

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  return createPortal(
    <>
      {/* 桌面版：5 個分類各自一個按鈕，直接點進該分類。 */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'nowrap',
          // 按鈕本身不縮小，容器（NavBar 的 #header-layer-controls）滿了就用捲動，
          // 這樣之後再加圖層分類也只是多滑一點，不會擠壞既有按鈕或破版。
          flexShrink: 0,
        }}
      >
        {menuDefinitions.map((definition) => (
          <Tooltip key={definition.id} title={undefined}>
            <Badge
              badgeContent={definition.count}
              color="secondary"
              invisible={definition.count === 0}
              sx={{ flexShrink: 0 }}
            >
              <Button
                color="inherit"
                aria-haspopup="menu"
                aria-label={definition.label}
                aria-expanded={
                  Boolean(menuAnchor) && activeMenu === definition.id
                }
                onClick={(event) =>
                  openMenu(definition.id, event.currentTarget)
                }
                sx={{
                  flexShrink: 0,
                  minWidth: { xs: 36, lg: 88 },
                  px: { xs: 0.75, lg: 1.25 },
                  borderRadius: radiusTokens.surface,
                  bgcolor:
                    menuAnchor && activeMenu === definition.id
                      ? 'action.selected'
                      : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  fontSize: typographyTokens.fontSize.title,
                }}
              >
                {definition.icon}
                <Box
                  component="span"
                  sx={{ display: { xs: 'none', lg: 'inline' }, ml: 0.75 }}
                >
                  {definition.label}
                </Box>
              </Button>
            </Badge>
          </Tooltip>
        ))}
      </Box>
      {/* 手機版：收斂成單一「圖層」按鈕，開啟後先看到分類清單（子選項），點了才切換成該分類內容。 */}
      <Tooltip title="圖層選單">
        <Badge
          badgeContent={totalActiveLayerCount}
          color="secondary"
          invisible={totalActiveLayerCount === 0}
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        >
          <Button
            color="inherit"
            aria-haspopup="menu"
            aria-label="圖層選單"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(event) => openMobileMenu(event.currentTarget)}
            sx={{
              minWidth: 36,
              px: 0.75,
              borderRadius: radiusTokens.surface,
              bgcolor: menuAnchor ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
              fontSize: typographyTokens.fontSize.title,
            }}
          >
            <LayersRoundedIcon />
          </Button>
        </Badge>
      </Tooltip>
      {isDesktop ? (
        <Popper
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          placement="bottom-end"
          modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
          sx={{ zIndex: (theme) => theme.zIndex.tooltip }}
        >
          <ClickAwayListener
            onClickAway={(event) => {
              const target = event.target as Element;
              if (target.closest('#header-layer-controls')) return;
              closeMenu();
            }}
          >
            <Paper
              elevation={8}
              sx={{
                width: 340,
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100dvh - 80px)',
                overflowY: 'auto',
                borderRadius: radiusTokens.floating,
              }}
            >
              {menuBody}
            </Paper>
          </ClickAwayListener>
        </Popper>
      ) : (
        <Drawer
          anchor="bottom"
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: radiusTokens.floating,
                borderTopRightRadius: radiusTokens.floating,
                maxHeight: '80dvh',
                overflowY: 'auto',
                pb: 'env(safe-area-inset-bottom)',
              },
            },
          }}
        >
          {menuBody}
        </Drawer>
      )}
    </>,
    portalTarget,
  );
}
