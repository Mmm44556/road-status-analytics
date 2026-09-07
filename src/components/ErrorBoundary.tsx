import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** 沒有自訂內容時使用的預設措辭；區域性邊界（例如地圖區塊）可以傳更具體的說法。 */
  title?: string;
  description?: string;
};

type ErrorBoundaryState = { hasError: boolean };

/**
 * 攔截子樹渲染期間拋出的例外，避免單一元件出錯就讓整個畫面變成空白。
 * React 的錯誤邊界規範只支援 class component（目前沒有 hook 版本），
 * 所以這裡照官方模式用 getDerivedStateFromError／componentDidCatch。
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Box
        role="alert"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          height: '100%',
          minHeight: 320,
          p: 4,
          textAlign: 'center',
        }}
      >
        <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 40 }} />
        <Typography variant="h6" fontWeight={700}>
          {this.props.title ?? '發生未預期的錯誤'}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
          {this.props.description ??
            '這個畫面暫時無法顯示，重新整理通常就能恢復正常。'}
        </Typography>
        <Button variant="contained" onClick={this.handleReload}>
          重新整理頁面
        </Button>
      </Box>
    );
  }
}
