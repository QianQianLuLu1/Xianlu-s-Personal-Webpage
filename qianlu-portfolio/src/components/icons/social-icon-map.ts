import type { ComponentType, SVGProps } from 'react';

import type { SocialLink } from '@/data/social';

import { BilibiliIcon, DouyinIcon, QqIcon, XiaohongshuIcon } from './social-icons';

type IconProps = SVGProps<SVGSVGElement>;

export const SOCIAL_ICONS: Record<SocialLink['id'], ComponentType<IconProps>> = {
  douyin: DouyinIcon,
  bilibili: BilibiliIcon,
  xiaohongshu: XiaohongshuIcon,
  qq: QqIcon,
};
