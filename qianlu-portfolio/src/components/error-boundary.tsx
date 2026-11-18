import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';
import i18n from '@/lib/i18n';

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
          title={i18n.t('error.title')}
          description={i18n.t('error.description')}
          action={
            <Button onClick={this.handleReload}>
              <RefreshCw aria-hidden="true" />
              {i18n.t('action.refresh')}
            </Button>
          }
        />
      </main>
    );
  }
}

export default RouteErrorBoundary;
