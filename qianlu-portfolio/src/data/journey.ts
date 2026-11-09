/**
 * 摄影之路的四个阶段。
 *
 * 顺序固定为：设备 → 构图 → 光影 → 风格，阶段数为编译期常量。
 * 每阶段描述控制在 30~60 字。
 */

export interface JourneyStage {
  id: string;
  order: number;
  title: string;
  description: string;
  /** 阶段配图：作品集中一张照片的 id，仅作卡片内容展示（不作背景） */
  photoId: string;
  /** 配图的替代文本（卡片内容图，需要可读的描述） */
  photoAlt: string;
}

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  {
    id: 'gear',
    order: 1,
    title: '设备',
    description: '从手机随手拍，到摸清相机里每一项参数。先熟悉手里的工具，再谈怎么创作。',
    photoId: 'photo-09',
    photoAlt: '冷蓝调咖啡店里低头操作平板核对参数，身后是美人鱼墙绘',
  },
  {
    id: 'composition',
    order: 2,
    title: '构图',
    description: '学会取舍比学会堆砌更重要。把画面里的杂音一点点拿掉，主体自己就站住了。',
    photoId: 'photo-10',
    photoAlt: '仰拍粉紫色居民楼的一角与蓝天里的一朵云，大面积留白',
  },
  {
    id: 'light',
    order: 3,
    title: '光影',
    description: '开始追着光走。清晨、黄昏、深夜的街灯，同一处场景在不同光线下判若两地。',
    photoId: 'photo-20',
    photoAlt: '夜幕下的满月低悬在陆家嘴楼群前，江面映着成片红色灯火',
  },
  {
    id: 'style',
    order: 4,
    title: '风格',
    description: '不再照搬别人的调色，慢慢能一眼认出自己的片子——这大概是风格开始的信号。',
    photoId: 'photo-04',
    photoAlt: '夜色草场上的白色帐篷与暖色串灯，烟雾在压暗的天空下翻涌',
  },
] as const;
