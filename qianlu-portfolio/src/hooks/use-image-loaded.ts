import * as React from 'react';

/*
 * 图片加载完成标记：onLoad 置位；ref 回调兜底检测缓存图——
 * 命中内存/bfcache 缓存时 complete 早已为 true，load 事件可能先于
 * React 挂载监听触发，不兜底会闪烁骨架屏。naturalWidth > 0 排除
 * 「complete 为 true 但加载失败」的破图（失败走 onError 流程）。
 */
function useImageLoaded() {
  const [loaded, setLoaded] = React.useState(false);

  const ref = React.useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  const onLoad = React.useCallback(() => setLoaded(true), []);

  return { ref, loaded, onLoad };
}

export { useImageLoaded };
