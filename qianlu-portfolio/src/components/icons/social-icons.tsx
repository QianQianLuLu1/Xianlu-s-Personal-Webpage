import type { SVGProps } from 'react';

/**
 * 社交平台图标。
 *
 * 约束：不使用图标字体、不使用 Emoji、不引入外部 CDN。
 * 这里全部是自绘的简化轮廓，仅保留各平台的通用识别特征，
 * 不还原官方 logo 的完整造型，以规避商标风险。
 */

type IconProps = SVGProps<SVGSVGElement>;

/** 抖音 —— 音符轮廓 */
export function DouyinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.5 2h2.6c.2 1.6 1.2 3 2.7 3.5v2.6c-1.3 0-2.5-.4-3.5-1.1v6.3a4.7 4.7 0 1 1-4.7-4.7c.3 0 .6 0 .9.1v2.7a2 2 0 1 0 1.4 1.9V2z" />
    </svg>
  );
}

/** 哔哩哔哩 —— 带天线的显示设备轮廓 */
export function BilibiliIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M8.5 4 10 8M15.5 4 14 8" />
    </svg>
  );
}

/** 小红书 —— 摊开的书页轮廓 */
export function XiaohongshuIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 6.6C10.5 5.1 8.4 4.6 4 5.1v13.2c4.4-.5 6.5 0 8 1.5 1.5-1.5 3.6-2 8-1.5V5.1c-4.4-.5-6.5 0-8 1.5z" />
      <path d="M12 6.6v13.2" />
    </svg>
  );
}

/** QQ —— 简化的企鹅轮廓（仅保留头部与身体的识别特征，不还原官方 logo，规避商标风险） */
export function QqIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3a5 5 0 0 0-5 5c0 1 .2 1.9.5 2.7C6 12 5 14.2 5 16c0 1.5.6 2.5 1.5 2.5 1 0 1.6-.9 2-1.7.9.8 2.1 1.2 3.5 1.2s2.6-.4 3.5-1.2c.4.8 1 1.7 2 1.7.9 0 1.5-1 1.5-2.5 0-1.8-1-4-2.5-5.3.3-.8.5-1.7.5-2.7a5 5 0 0 0-5-5z" />
    </svg>
  );
}
