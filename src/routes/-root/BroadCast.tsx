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
/**
 * API:
 * https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/News/City/{{city}}?$top=30&$format=JSON
 *
 *
 */

const mock_messages = {
  UpdateTime: "2025-07-09T02:02:41+08:00",
  UpdateInterval: 60,
  SrcUpdateTime: "2025-07-09T02:01:29+08:00",
  SrcUpdateInterval: -1,
  AuthorityCode: "TXG",
  Newses: [
    {
      NewsID: "20250625103327",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "中清路 雙向 大鵬路口 外側  施工三角錐擺放，小心駕駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7316",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 4,
      Description:
        "114年7月10日10時00分~15時00分\r\n台74 東西向 0K+000~37K+000 外側一車道 施工 , 請小心駕駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7314",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 4,
      Description:
        "114/7/7~7/11、7/14~7/18、7/21~7/25、7/28~8/1 每日21時至隔日6時，台74東向 10K外車道及環中路跨台12線台灣大道機車上匝道，進行隔音牆施工作業封閉管制",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7304",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 4,
      Description:
        "114年8月2日4時-20時\r\n西屯區 青海路二段(洛陽路-文心路三段)道路封閉施工,請小心駕駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7302",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 1,
      Description:
        "114年7月2日-7月10日 ,每日20時~翌日04時30分\r\n台74 西向  往烏日 13.5K-14.5K(中青地下道) 內+外側 移動性施工   , 請改道行駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7309",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 4,
      Description:
        "114年7月1日00:00~7月31日 00:00~24:00 (掉落物處理)\r\n114年7月3、10、17、24、31日 08:0-16:30(垃圾撿拾及路面清掃)\r\n台74 0k+000~37K+860 東西向 移動性施工,請小心駕駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G7256",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 1,
      Description:
        "114年4月9日起封閉台74線西行大里路段 32K+360~32K+795外側車道，並配合工程期程，預計封閉至115年3月(以實際竣工日為準)，請用路人配合交通管制措施小心行駛。",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "G6782",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "市府公告",
      NewsCategory: 1,
      Description:
        "113年6月4日起封閉台74線東行大里路段29K+400~29K+800外側車道，並配合「台74線（26K~30K）東昇里路段增設匝道工程」，預計封閉至114年7月(以實際竣工日為準)，請用路人配合交通管制措施小心行駛。",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "20250416142521",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "健行路 往崇德路方向 中清路前 外側施工，請小心慢行",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "20250527100207",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description:
        "崇德路 雙向 健行路 至 進化北路 內側 施工 及 崇德路 往大雅方向 外側 施工，請小心慢行",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "20250625070640",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "黎明路 往青海路方向 近上安路 外側 施工圍籬擺放，小心駕駛",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },

    {
      NewsID: "20250705125758",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "西屯路過忠明路路段，施工，請小心慢行",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "20250708154246",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "五權西路 與 美村路 雙向 路口 外側 施工，請小心慢行",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
    {
      NewsID: "20250708155624",
      Language: "Zh_tw",
      Department: "台中市交通局",
      Title: "平台事件",
      NewsCategory: 4,
      Description: "五權西路 往工業區方向 東興路口 外側 施工，請小心慢行",
      NewsURL: "http://e-traffic.taichung.gov.tw",
      PublishTime: "2025-07-10T02:01:29+08:00",
      UpdateTime: "2025-07-10T02:01:29+08:00",
    },
  ],
};

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
          fontSize: 22,
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
          {mock_messages.Newses.map((message) => (
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
          width: 42,
          height: 42,
          minWidth: 42,
          minHeight: 42,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            backgroundColor: grey[700],
          },
        }}
      >
        <CampaignIcon sx={{ fontSize: 42, color: "#fff" }} />
      </Button>
      <BroadCastCarousel />
      <BroadCastDialog open={open} onClose={handleClose} />
    </Box>
  );
}

function BroadCastCarousel() {
  const [current, setCurrent] = useState(0);
  const [startMarquee, setStartMarquee] = useState(false);
  const messages = mock_messages.Newses;
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
        minHeight: 60,
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
        <Typography color="text.primary" component="span" fontSize={18}>
          {messages[current].Description}
        </Typography>
      </motion.div>
    </Box>
  );
}
