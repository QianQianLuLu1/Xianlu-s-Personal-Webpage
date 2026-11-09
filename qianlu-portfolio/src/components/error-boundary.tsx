import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RouteErrorBoundary] 渲染异常', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="bg-cream text-ink flex min-h-screen items-center justify-center px-4">
        <EmptyState
          illustration={<EmptyIllustration />}
          className="glass-tier2 glass-float rounded-card w-full max-w-md"
          title="页面出了点问题"
          description="内容渲染时遇到意外错误，刷新通常可以恢复；若反复出现，欢迎通过社交渠道反馈。"
          action={
            <Button onClick={this.handleReload}>
              <RefreshCw aria-hidden="true" />
              刷新页面
            </Button>
          }
        />
      </main>
    );
  }
}

export default RouteErrorBoundary;
