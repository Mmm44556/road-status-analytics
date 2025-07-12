import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import CampaignIcon from "@mui/icons-material/Campaign";
import { blue, grey } from "@mui/material/colors";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { motion } from "framer-motion";
import provinceHightWayMsg from "@/mock/provinceHightWayMsg.json";
import mock_cityTrafficEventMsg from "@/mock/cityTrafficEventMsg.json";
/**
 * API:
 *
 * 取得用戶所在縣市:
 * 縣市事件:
 * https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/News/City/{{city}}?$top=30&$format=JSON
 *
 * 沒取得縣市，使用公路局省道事件
 *
 *
 */

export interface SimpleDialogProps {
  open: boolean;
  onClose: () => void;
}

function BroadCastDialog(props: SimpleDialogProps) {
  const { onClose, open } = props;

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      onClose={handleClose}
      open={open}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "10px",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: blue[600],
          color: "#fff",
          fontSize: {
            xl: 20,
            "2xl": 22,
          },
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>最新消息</span>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: "#fff",
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          maxHeight: "550px",
          "&::-webkit-scrollbar": { display: "none" },
          "-ms-overflow-style": "none",
          scrollbarWidth: "none",
        }}
      >
        <List>
          {mock_cityTrafficEventMsg.Newses.map((message) => (
            <>
              <ListItem key={message.NewsID}>
                <ListItemText
                  secondary={
                    <Typography color="text.primary" fontWeight={500}>
                      {message.Description}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}

const iconSize = {
  xl: 36,
  "2xl": 46,
};
const defaultSize = {
  xl: iconSize.xl,
  "2xl": iconSize["2xl"],
};

export default function BroadCast() {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        backgroundColor: "#fff",
        borderRadius: 3,
        px: 1,
      }}
    >
      <Button
        onClick={handleClickOpen}
        sx={{
          color: "#fff",
          backgroundColor: grey[600],
          borderRadius: "100%",
          width: defaultSize,
          height: defaultSize,
          minWidth: defaultSize,
          minHeight: defaultSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            backgroundColor: grey[700],
          },
        }}
      >
        <CampaignIcon
          sx={{
            fontSize: defaultSize,
            color: "#fff",
          }}
        />
      </Button>
      <BroadCastCarousel />
      <BroadCastDialog open={open} onClose={handleClose} />
    </Box>
  );
}

function BroadCastCarousel() {
  const [current, setCurrent] = useState(0);
  const [startMarquee, setStartMarquee] = useState(false);
  const messages = mock_cityTrafficEventMsg.Newses;
  const [contentWidth, setContentWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);
  // 取得內容寬度
  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.offsetWidth);
    }
  }, [current, startMarquee]);

  // 每秒移動速度
  const speed = 100;
  const duration = (contentWidth + 500) / speed;

  // 切換訊息時，先靜止顯示一段時間再開始動畫
  useEffect(() => {
    setStartMarquee(false);
    const timer = setTimeout(() => {
      setStartMarquee(true);
    }, 1500); // 1秒靜止
    return () => clearTimeout(timer);
  }, [current]);

  // 動畫結束後切換下一則
  const handleAnimationComplete = () => {
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % messages.length);
    }, 300); // 跑完後停留0.3秒再切換
  };
  return (
    <Box
      ref={containerRef}
      sx={{
        width: "450px",
        overflow: "hidden",
        minHeight: {
          xl: 48,
          "2xl": 60,
        },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        key={messages[current].NewsID}
        ref={contentRef}
        initial={{ x: containerWidth }}
        animate={{ x: contentWidth ? -contentWidth : 0 }} // 滑到完全超出左側
        transition={{ duration, ease: "linear" }}
        onAnimationComplete={handleAnimationComplete}
        style={{ whiteSpace: "nowrap", display: "inline-block" }}
      >
        <Typography
          color="text.primary"
          component="span"
          fontSize={{
            xl: 18,
            "2xl": 22,
          }}
        >
          {messages[current].Description}
        </Typography>
      </motion.div>
    </Box>
  );
}
