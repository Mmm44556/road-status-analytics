import { useEffect, useRef, useState, type FormEvent } from 'react';
import { gsap } from 'gsap';
import ReactMarkdown, { type Components } from 'react-markdown';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import logoMarkUrl from '@/assets/image/LogoMark.png';
import { ChatName } from '@/config/appInfo';
import {
  radiusTokens,
  shadowTokens,
  typographyTokens,
} from '@/config/designTokens';
import {
  streamAiChat,
  type AiActionResult,
  type AiChatTurn,
  type AiMapAction,
} from '@/service/aiChatApi';
import { capHistory } from './aiChatHistory';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** 地圖動作執行結果才會有這個欄位；有它時改用圖示清單呈現，而不是把圖示塞進文字。 */
  actionResults?: AiActionResult[];
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: `你好 ~ 我是 ${ChatName} 路線助理，可以幫你在地圖上找地點、規劃路線、開關圖層或選擇查詢縣市。跟我說說你想做什麼吧！`,
};

const CONNECTION_ERROR_REPLY = '暫時無法連線到服務，請稍後再試。';

/** AI 回覆裡的連結一律開新分頁，避免使用者離開時把整個地圖狀態弄丟。 */
const markdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

type AiRouteChatCardProps = {
  isOpen: boolean;
  onClose: () => void;
  executeAiMapAction: (action: AiMapAction) => Promise<AiActionResult>;
};

/**
 * AI 路線助理聊天面板：以 SSE 串流呼叫 /ai/chat，執行地圖動作後背景回報結果讓 AI 接著說明。
 * 這個元件永遠掛載著、用 isOpen 切換顯示，而不是關閉就整個卸載——
 * 這樣關閉面板再打開，對話內容跟 apiHistory 才會留著，不會每次都要重新自我介紹。
 */
export default function AiRouteChatCard({
  isOpen,
  onClose,
  executeAiMapAction,
}: AiRouteChatCardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [apiHistory, setApiHistory] = useState<AiChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAwaitingFirstToken, setIsAwaitingFirstToken] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [liveRegionText, setLiveRegionText] = useState('');
  const sequenceRef = useRef(0);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFirstRenderRef = useRef(true);

  /** 新訊息或串流中的文字一有變動就捲到最底部，讓使用者不用手動滑。 */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isAwaitingFirstToken, isNarrating]);

  /** 每次打開面板就把焦點放進輸入框，讓鍵盤使用者不用先 Tab 找輸入框。 */
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const nextId = (prefix: string) => {
    sequenceRef.current += 1;
    return `${prefix}-${sequenceRef.current}`;
  };

  const appendAssistantMessage = (text: string) => {
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: nextId('assistant'), role: 'assistant', text },
    ]);
    setLiveRegionText(text);
  };

  /** 動作執行結果用圖示清單呈現，不走 Markdown 文字（圖示是真的 MUI 元件，不是字串）。 */
  const appendActionResultsMessage = (results: AiActionResult[]) => {
    setMessages((current) => [
      ...current,
      {
        id: nextId('assistant'),
        role: 'assistant',
        text: '',
        actionResults: results,
      },
    ]);
    setLiveRegionText(results.map((result) => result.summary).join('，'));
  };

  /** 邊收 SSE delta 邊把文字追加進同一則訊息泡泡；中斷時保留已產生的內容並標註。 */
  const streamIntoNewBubble = async (
    body: {
      history: AiChatTurn[];
      message?: string;
      actionResults?: AiActionResult[];
    },
    signal?: AbortSignal,
    onFirstToken?: () => void,
  ): Promise<{ text: string; actions: AiMapAction[] }> => {
    const assistantId = nextId('assistant');
    let fullText = '';
    let hasCreatedBubble = false;
    let actions: AiMapAction[] = [];

    // 更新函式必須是純函式（只依賴 current／assistantId／text），
    // 因為 StrictMode 開發模式下 React 會用同一個 current 呼叫這個 updater 兩次來檢查副作用；
    // 如果像之前那樣在裡面改外部的 hasCreatedBubble 旗標，第二次呼叫會判斷錯分支，
    // 導致新增的訊息泡泡被判定成「已存在」而遺失，畫面上就完全看不到這則回覆。
    const applyText = (text: string) => {
      setMessages((current) => {
        const exists = current.some((message) => message.id === assistantId);
        if (!exists) {
          return [...current, { id: assistantId, role: 'assistant', text }];
        }
        return current.map((message) =>
          message.id === assistantId ? { ...message, text } : message,
        );
      });
    };

    try {
      await streamAiChat(
        body,
        (event) => {
          if (event.type === 'delta') {
            if (!hasCreatedBubble) {
              hasCreatedBubble = true;
              onFirstToken?.();
            }
            fullText += event.text;
            applyText(fullText);
          } else {
            actions = event.actions;
          }
        },
        signal,
      );
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') {
        applyText(fullText ? `${fullText}\n\n（已中斷）` : '（已取消）');
      }
      throw error;
    }

    if (fullText) setLiveRegionText(fullText);
    return { text: fullText, actions };
  };

  /**
   * 面板永遠掛載著，靠 isOpen 切換 autoAlpha（opacity + visibility）來顯示/隱藏，
   * 而不是卸載元件，對話內容才能在關閉再打開之間保留。第一次 render 直接套用最終狀態、
   * 不要播動畫，不然一進頁面（isOpen 預設 false）就會莫名其妙看到一次收合動畫。
   */
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      gsap.set(paper, {
        autoAlpha: isOpen ? 1 : 0,
        y: isOpen ? 0 : 24,
        scale: isOpen ? 1 : 0.92,
      });
      return;
    }
    if (isOpen) {
      gsap.fromTo(
        paper,
        { autoAlpha: 0, y: 24, scale: 0.92, transformOrigin: 'left bottom' },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' },
      );
    } else {
      gsap.to(paper, {
        autoAlpha: 0,
        y: 24,
        scale: 0.92,
        transformOrigin: 'left bottom',
        duration: 0.25,
        ease: 'power1.in',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    setMessages((current) => [
      ...current,
      { id: nextId('user'), role: 'user', text },
    ]);

    const historyForThisTurn = apiHistory;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setIsAwaitingFirstToken(true);

    try {
      const { text: reply, actions } = await streamIntoNewBubble(
        { history: historyForThisTurn, message: text },
        controller.signal,
        () => setIsAwaitingFirstToken(false),
      );
      let nextHistory: AiChatTurn[] = [
        ...historyForThisTurn,
        { role: 'user', content: text },
      ];
      if (reply)
        nextHistory = [...nextHistory, { role: 'model', content: reply }];
      nextHistory = capHistory(nextHistory);
      setApiHistory(nextHistory);

      if (actions.length === 0) return;
      const results = await Promise.all(actions.map(executeAiMapAction));
      // 動作一執行完就立刻用本地組好的摘要回覆，不用等 AI 再生成一次文字。
      appendActionResultsMessage(results);

      // 背景再請 AI 針對結果補充說明或建議下一步；失敗也不打擾使用者，畢竟結果已經回報過了，也不佔用取消按鈕。
      setIsNarrating(true);
      streamIntoNewBubble({ history: nextHistory, actionResults: results })
        .then(({ text: narration }) => {
          if (!narration) return;
          setApiHistory((current) =>
            capHistory([...current, { role: 'model', content: narration }]),
          );
        })
        .catch(() => undefined)
        .finally(() => setIsNarrating(false));
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') {
        appendAssistantMessage(CONNECTION_ERROR_REPLY);
      }
    } finally {
      setIsStreaming(false);
      setIsAwaitingFirstToken(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <Paper
      ref={paperRef}
      component="section"
      aria-label="AI 路線助理"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}
      sx={{
        position: 'absolute',
        zIndex: 7,
        bottom: { xs: 76, sm: 88 },
        left: { xs: 12, md: 16 },
        width: { xs: 'calc(100% - 24px)', sm: 360 },
        maxHeight: 'calc(100% - 108px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: radiusTokens.floating,
        boxShadow: shadowTokens.panel,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            component="img"
            src={logoMarkUrl}
            alt=""
            sx={{ width: 28, height: 28, objectFit: 'contain' }}
          />
          <Box>
            <Typography
              component="h2"
              fontWeight={700}
              fontSize={typographyTokens.fontSize.title}
            >
              {ChatName} 路線助理
            </Typography>
            <Typography
              color="text.secondary"
              fontSize={typographyTokens.fontSize.metadata}
            >
              可以幫你找地點、規劃路線、開關圖層
            </Typography>
          </Box>
        </Stack>
        <IconButton
          size="small"
          aria-label={`關閉 ${ChatName} 路線助理`}
          onClick={onClose}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* 視覺上隱藏，只給螢幕閱讀器用：訊息串流中逐字更新會太吵，
          所以只在一則回覆完整送達時更新一次，而不是跟著畫面上的泡泡逐字念。 */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {liveRegionText}
      </Box>

      <Box
        ref={messagesContainerRef}
        aria-label="對話內容"
        sx={{
          flex: 1,
          minHeight: 160,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              justifyContent:
                message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box
              sx={{
                maxWidth: '85%',
                px: 1.5,
                py: 1,
                borderRadius: radiusTokens.control,
                bgcolor:
                  message.role === 'user'
                    ? 'secondary.main'
                    : 'background.default',
                color:
                  message.role === 'user'
                    ? 'secondary.contrastText'
                    : 'text.primary',
              }}
            >
              {message.role === 'assistant' && message.actionResults ? (
                <Stack spacing={0.5}>
                  {message.actionResults.map((result, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      spacing={0.75}
                      alignItems="flex-start"
                    >
                      {result.success ? (
                        <CheckCircleRoundedIcon
                          fontSize="small"
                          sx={{ color: 'success.main', mt: '2px' }}
                        />
                      ) : (
                        <WarningAmberRoundedIcon
                          fontSize="small"
                          sx={{ color: 'warning.main', mt: '2px' }}
                        />
                      )}
                      <Typography fontSize={typographyTokens.fontSize.body}>
                        {result.summary}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : message.role === 'assistant' ? (
                <Box
                  sx={{
                    fontSize: typographyTokens.fontSize.body,
                    '& > :first-of-type': { marginTop: 0 },
                    '& > :last-child': { marginBottom: 0 },
                    '& ul, & ol': { paddingLeft: '1.25em' },
                    '& li + li': { marginTop: 0.25 },
                  }}
                >
                  <ReactMarkdown components={markdownComponents}>
                    {message.text}
                  </ReactMarkdown>
                </Box>
              ) : (
                <Typography fontSize={typographyTokens.fontSize.body}>
                  {message.text}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        {isAwaitingFirstToken && (
          <Box
            role="status"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}
          >
            <CircularProgress size={14} />
            <Typography
              color="text.secondary"
              fontSize={typographyTokens.fontSize.metadata}
            >
              思考中
            </Typography>
          </Box>
        )}
        {isNarrating && (
          <Box
            role="status"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}
          >
            <CircularProgress size={12} />
            <Typography
              color="text.secondary"
              fontSize={typographyTokens.fontSize.metadata}
            >
              補充說明中……
            </Typography>
          </Box>
        )}
      </Box>

      <Stack
        component="form"
        direction="row"
        spacing={1}
        onSubmit={(event) => void handleSubmit(event)}
        sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="跟我說你想去哪裡……"
          aria-label="輸入訊息"
          value={input}
          inputRef={inputRef}
          onChange={(event) => setInput(event.target.value)}
        />
        {isStreaming ? (
          <IconButton
            title="停止產生回覆"
            aria-label="停止產生回覆"
            onClick={() => abortControllerRef.current?.abort()}
            sx={{
              border: '1px solid',
            }}
          >
            <StopRoundedIcon />
          </IconButton>
        ) : (
          <IconButton
            type="submit"
            aria-label="送出訊息"
            disabled={!input.trim()}
            color="secondary"
          >
            <SendRoundedIcon />
          </IconButton>
        )}
      </Stack>
    </Paper>
  );
}
