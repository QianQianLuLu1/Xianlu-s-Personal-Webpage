/**
 * 摄影之路的四个阶段。
 *
 * 顺序固定为：设备 → 构图 → 光影 → 风格，阶段数为编译期常量。
 * title/description/photoAlt 为 i18n key（home 命名空间），文案见 locales，描述控制在 30~60 字。
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
    title: 'journey.stages.gear.title',
    description: 'journey.stages.gear.description',
    photoId: 'photo-09',
    photoAlt: 'journey.stages.gear.photoAlt',
  },
  {
    id: 'composition',
    order: 2,
    title: 'journey.stages.composition.title',
    description: 'journey.stages.composition.description',
    photoId: 'photo-10',
    photoAlt: 'journey.stages.composition.photoAlt',
  },
  {
    id: 'light',
    order: 3,
    title: 'journey.stages.light.title',
    description: 'journey.stages.light.description',
    photoId: 'photo-20',
    photoAlt: 'journey.stages.light.photoAlt',
  },
  {
    id: 'style',
    order: 4,
    title: 'journey.stages.style.title',
    description: 'journey.stages.style.description',
    photoId: 'photo-04',
    photoAlt: 'journey.stages.style.photoAlt',
  },
] as const;
