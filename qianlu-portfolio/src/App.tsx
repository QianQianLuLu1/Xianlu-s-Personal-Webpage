import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import RouteErrorBoundary from '@/components/error-boundary';
import Portfolio from '@/pages/portfolio.tsx';
import ProjectDetailPage from '@/pages/project-detail.tsx';
import { usePalette } from '@/hooks/use-palette';
import { startPerformanceScheduler } from '@/lib/perf/scheduler';

function App() {
  usePalette();

  useEffect(() => {
    // 性能监测与状态机应用生命周期内常驻；getConfig() 首次读取时完成惰性初始化
    return startPerformanceScheduler();
  }, []);

  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default App;
