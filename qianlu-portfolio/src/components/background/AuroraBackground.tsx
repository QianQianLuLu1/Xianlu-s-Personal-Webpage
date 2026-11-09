/**
 * 首屏背景：纯代码生成的极光渐变，不含任何图片资源。
 *
 * 设计参考 Magic UI「Aurora Background」（MIT 开源组件）与 Stripe 首页
 * mesh 渐变的常见开源实现：数个大尺寸模糊色斑（品牌陶红/松绿/琥珀）
 * 以 36~60s 的不同周期缓慢漂移，顶部叠一层 SVG feTurbulence 颗粒噪点
 * 抑制大面积渐变的色带。色斑配色在 index.css 中按明暗主题各定义一套。
 *
 * 动效降级由 CSS 统一处理：mode-compat / prefers-reduced-motion 下色斑静止。
 */
export default function AuroraBackground() {
  return (
    <div aria-hidden className="bg-cream absolute inset-0 overflow-hidden">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-grain" />
    </div>
  );
}
