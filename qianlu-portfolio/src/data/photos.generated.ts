// 本文件由 scripts/build-assets.mjs 自动生成，请勿手动修改。
// 重新生成：npm run assets:build

export interface PhotoVariant {
  avif: string;
  webp: string;
  pixelWidth: number;
  bytes: { avif: number; webp: number };
}

export interface Photo {
  id: string;
  title: string;
  width: number | null;
  height: number | null;
  sizes: { '4k': PhotoVariant; '2k': PhotoVariant };
}

export const PHOTOS: readonly Photo[] = [
  {
    id: 'photo-01',
    title: '01',
    width: 2996,
    height: 3973,
    sizes: {
      '4k': {
        avif: '/photos/photo-01-4k.avif',
        webp: '/photos/photo-01-4k.webp',
        pixelWidth: 2996,
        bytes: {
          avif: 394375,
          webp: 473462,
        },
      },
      '2k': {
        avif: '/photos/photo-01-2k.avif',
        webp: '/photos/photo-01-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 251195,
          webp: 390286,
        },
      },
    },
  },
  {
    id: 'photo-02',
    title: '02',
    width: 3104,
    height: 4095,
    sizes: {
      '4k': {
        avif: '/photos/photo-02-4k.avif',
        webp: '/photos/photo-02-4k.webp',
        pixelWidth: 3104,
        bytes: {
          avif: 315241,
          webp: 365474,
        },
      },
      '2k': {
        avif: '/photos/photo-02-2k.avif',
        webp: '/photos/photo-02-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 260723,
          webp: 294468,
        },
      },
    },
  },
  {
    id: 'photo-03',
    title: '03',
    width: 3276,
    height: 2456,
    sizes: {
      '4k': {
        avif: '/photos/photo-03-4k.avif',
        webp: '/photos/photo-03-4k.webp',
        pixelWidth: 3276,
        bytes: {
          avif: 453408,
          webp: 622462,
        },
      },
      '2k': {
        avif: '/photos/photo-03-2k.avif',
        webp: '/photos/photo-03-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 251743,
          webp: 458762,
        },
      },
    },
  },
  {
    id: 'photo-04',
    title: '04',
    width: 3536,
    height: 2615,
    sizes: {
      '4k': {
        avif: '/photos/photo-04-4k.avif',
        webp: '/photos/photo-04-4k.webp',
        pixelWidth: 3536,
        bytes: {
          avif: 506372,
          webp: 658530,
        },
      },
      '2k': {
        avif: '/photos/photo-04-2k.avif',
        webp: '/photos/photo-04-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 247416,
          webp: 446418,
        },
      },
    },
  },
  {
    id: 'photo-05',
    title: '05',
    width: 3840,
    height: 2160,
    sizes: {
      '4k': {
        avif: '/photos/photo-05-4k.avif',
        webp: '/photos/photo-05-4k.webp',
        pixelWidth: 3840,
        bytes: {
          avif: 464568,
          webp: 706444,
        },
      },
      '2k': {
        avif: '/photos/photo-05-2k.avif',
        webp: '/photos/photo-05-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 272560,
          webp: 425940,
        },
      },
    },
  },
  {
    id: 'photo-06',
    title: '06',
    width: 3840,
    height: 2558,
    sizes: {
      '4k': {
        avif: '/photos/photo-06-4k.avif',
        webp: '/photos/photo-06-4k.webp',
        pixelWidth: 3840,
        bytes: {
          avif: 505219,
          webp: 662644,
        },
      },
      '2k': {
        avif: '/photos/photo-06-2k.avif',
        webp: '/photos/photo-06-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 299580,
          webp: 419830,
        },
      },
    },
  },
  {
    id: 'photo-07',
    title: '07',
    width: 2048,
    height: 1364,
    sizes: {
      '4k': {
        avif: '/photos/photo-07-4k.avif',
        webp: '/photos/photo-07-4k.webp',
        pixelWidth: 2048,
        bytes: {
          avif: 453602,
          webp: 587086,
        },
      },
      '2k': {
        avif: '/photos/photo-07-4k.avif',
        webp: '/photos/photo-07-4k.webp',
        pixelWidth: 2048,
        bytes: {
          avif: 453602,
          webp: 587086,
        },
      },
    },
  },
  {
    id: 'photo-08',
    title: '08',
    width: 3200,
    height: 2408,
    sizes: {
      '4k': {
        avif: '/photos/photo-08-4k.avif',
        webp: '/photos/photo-08-4k.webp',
        pixelWidth: 3200,
        bytes: {
          avif: 254935,
          webp: 263644,
        },
      },
      '2k': {
        avif: '/photos/photo-08-2k.avif',
        webp: '/photos/photo-08-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 189345,
          webp: 201836,
        },
      },
    },
  },
  {
    id: 'photo-09',
    title: '09',
    width: 3276,
    height: 2463,
    sizes: {
      '4k': {
        avif: '/photos/photo-09-4k.avif',
        webp: '/photos/photo-09-4k.webp',
        pixelWidth: 3276,
        bytes: {
          avif: 308923,
          webp: 346770,
        },
      },
      '2k': {
        avif: '/photos/photo-09-2k.avif',
        webp: '/photos/photo-09-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 220731,
          webp: 252892,
        },
      },
    },
  },
  {
    id: 'photo-10',
    title: '10',
    width: 3684,
    height: 2764,
    sizes: {
      '4k': {
        avif: '/photos/photo-10-4k.avif',
        webp: '/photos/photo-10-4k.webp',
        pixelWidth: 3684,
        bytes: {
          avif: 218293,
          webp: 262404,
        },
      },
      '2k': {
        avif: '/photos/photo-10-2k.avif',
        webp: '/photos/photo-10-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 130816,
          webp: 162948,
        },
      },
    },
  },
  {
    id: 'photo-11',
    title: '11',
    width: 2456,
    height: 3249,
    sizes: {
      '4k': {
        avif: '/photos/photo-11-4k.avif',
        webp: '/photos/photo-11-4k.webp',
        pixelWidth: 2456,
        bytes: {
          avif: 370570,
          webp: 458320,
        },
      },
      '2k': {
        avif: '/photos/photo-11-4k.avif',
        webp: '/photos/photo-11-4k.webp',
        pixelWidth: 2456,
        bytes: {
          avif: 370570,
          webp: 458320,
        },
      },
    },
  },
  {
    id: 'photo-12',
    title: '12',
    width: 2456,
    height: 3249,
    sizes: {
      '4k': {
        avif: '/photos/photo-12-4k.avif',
        webp: '/photos/photo-12-4k.webp',
        pixelWidth: 2456,
        bytes: {
          avif: 390907,
          webp: 642590,
        },
      },
      '2k': {
        avif: '/photos/photo-12-4k.avif',
        webp: '/photos/photo-12-4k.webp',
        pixelWidth: 2456,
        bytes: {
          avif: 390907,
          webp: 642590,
        },
      },
    },
  },
  {
    id: 'photo-13',
    title: '13',
    width: 2484,
    height: 3281,
    sizes: {
      '4k': {
        avif: '/photos/photo-13-4k.avif',
        webp: '/photos/photo-13-4k.webp',
        pixelWidth: 2484,
        bytes: {
          avif: 439404,
          webp: 1047978,
        },
      },
      '2k': {
        avif: '/photos/photo-13-4k.avif',
        webp: '/photos/photo-13-4k.webp',
        pixelWidth: 2484,
        bytes: {
          avif: 439404,
          webp: 1047978,
        },
      },
    },
  },
  {
    id: 'photo-14',
    title: '14',
    width: 2484,
    height: 1852,
    sizes: {
      '4k': {
        avif: '/photos/photo-14-4k.avif',
        webp: '/photos/photo-14-4k.webp',
        pixelWidth: 2484,
        bytes: {
          avif: 437852,
          webp: 670208,
        },
      },
      '2k': {
        avif: '/photos/photo-14-4k.avif',
        webp: '/photos/photo-14-4k.webp',
        pixelWidth: 2484,
        bytes: {
          avif: 437852,
          webp: 670208,
        },
      },
    },
  },
  {
    id: 'photo-15',
    title: '15',
    width: 2560,
    height: 3450,
    sizes: {
      '4k': {
        avif: '/photos/photo-15-4k.avif',
        webp: '/photos/photo-15-4k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 335989,
          webp: 375100,
        },
      },
      '2k': {
        avif: '/photos/photo-15-4k.avif',
        webp: '/photos/photo-15-4k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 335989,
          webp: 375100,
        },
      },
    },
  },
  {
    id: 'photo-16',
    title: '16',
    width: 2400,
    height: 3183,
    sizes: {
      '4k': {
        avif: '/photos/photo-16-4k.avif',
        webp: '/photos/photo-16-4k.webp',
        pixelWidth: 2400,
        bytes: {
          avif: 231409,
          webp: 226414,
        },
      },
      '2k': {
        avif: '/photos/photo-16-4k.avif',
        webp: '/photos/photo-16-4k.webp',
        pixelWidth: 2400,
        bytes: {
          avif: 231409,
          webp: 226414,
        },
      },
    },
  },
  {
    id: 'photo-17',
    title: '17',
    width: 3200,
    height: 2372,
    sizes: {
      '4k': {
        avif: '/photos/photo-17-4k.avif',
        webp: '/photos/photo-17-4k.webp',
        pixelWidth: 3200,
        bytes: {
          avif: 167295,
          webp: 163194,
        },
      },
      '2k': {
        avif: '/photos/photo-17-2k.avif',
        webp: '/photos/photo-17-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 120545,
          webp: 118736,
        },
      },
    },
  },
  {
    id: 'photo-18',
    title: '18',
    width: 3276,
    height: 2456,
    sizes: {
      '4k': {
        avif: '/photos/photo-18-4k.avif',
        webp: '/photos/photo-18-4k.webp',
        pixelWidth: 3276,
        bytes: {
          avif: 443216,
          webp: 562952,
        },
      },
      '2k': {
        avif: '/photos/photo-18-2k.avif',
        webp: '/photos/photo-18-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 305981,
          webp: 394536,
        },
      },
    },
  },
  {
    id: 'photo-19',
    title: '19',
    width: 3276,
    height: 2456,
    sizes: {
      '4k': {
        avif: '/photos/photo-19-4k.avif',
        webp: '/photos/photo-19-4k.webp',
        pixelWidth: 3276,
        bytes: {
          avif: 276678,
          webp: 322388,
        },
      },
      '2k': {
        avif: '/photos/photo-19-2k.avif',
        webp: '/photos/photo-19-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 190498,
          webp: 223002,
        },
      },
    },
  },
  {
    id: 'photo-20',
    title: '20',
    width: 3276,
    height: 2456,
    sizes: {
      '4k': {
        avif: '/photos/photo-20-4k.avif',
        webp: '/photos/photo-20-4k.webp',
        pixelWidth: 3276,
        bytes: {
          avif: 501844,
          webp: 659014,
        },
      },
      '2k': {
        avif: '/photos/photo-20-2k.avif',
        webp: '/photos/photo-20-2k.webp',
        pixelWidth: 2560,
        bytes: {
          avif: 270275,
          webp: 412038,
        },
      },
    },
  },
];

export const PHOTOS_META = {
  version: 1,
  generatedAt: '2026-08-31T13:16:53.315Z',
  count: 20,
};
