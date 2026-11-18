/**
 * 社交平台链接。
 *
 * 以下四个 URL 为字面常量，必须与各平台实际地址逐字一致，
 * 不得拼接、改写协议或调整大小写。
 */

export interface SocialLink {
  id: 'douyin' | 'bilibili' | 'xiaohongshu' | 'qq';
  label: string;
  handle: string;
  url: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: 'douyin',
    label: 'social.douyin',
    handle: '纤璐不会玩摄影',
    url: 'https://v.douyin.com/XkTzyJeCFIU/',
  },
  {
    id: 'bilibili',
    label: 'social.bilibili',
    handle: '纤璐不会玩摄影',
    url: 'https://b23.tv/vxdnlqI',
  },
  {
    id: 'xiaohongshu',
    label: 'social.xiaohongshu',
    handle: 'QianLu635492596',
    url: 'https://xhslink.com/m/AxkdRvT3QsH',
  },
  {
    id: 'qq',
    label: 'social.qq',
    handle: '635492596',
    url: 'https://qm.qq.com/q/j6m9nxRM30',
  },
] as const;
