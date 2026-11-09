/**
 * Hero 漂浮几何装饰（纯 CSS 动效，不含位图）。
 * 降级由 index.css 统一处理：.mode-compat / prefers-reduced-motion 下静止。
 */
function FloatingShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="float-shape float-ring float-shape-1" />
      <div className="float-shape float-ring float-ring-alt float-shape-2" />
      <div className="float-shape float-dot float-shape-3" />
      <div className="float-shape float-dot float-shape-4" />
    </div>
  );
}

export default FloatingShapes;
