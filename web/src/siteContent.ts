export type Guide = {
  slug: string
  title: string
  summary: string
  description: string
  category: string
  updated: string
  readingTime: string
  sections: {
    heading: string
    paragraphs?: string[]
    bullets?: string[]
  }[]
}

export type StaticPage = {
  title: string
  description: string
  intro: string
  sections: {
    heading: string
    paragraphs?: string[]
    bullets?: string[]
  }[]
}

export const siteInfo = {
  name: '이미지 변환 툴 허브',
  shortName: 'Image Convert Tool Hub',
  siteUrl: 'https://image-convert-tool-hub.pages.dev',
  description:
    'WEBP, JPG, PNG 이미지를 브라우저 안에서 바로 변환하고 압축·리사이즈까지 할 수 있는 실용형 이미지 툴 사이트입니다.',
  contactEmail: 'sjung0328@gmail.com',
} as const

export const toolHighlights = [
  {
    title: '브라우저 안에서 바로 변환',
    text: '가능한 한 브라우저 안에서 처리해서 업로드 파일을 따로 저장하지 않는 방향으로 설계합니다.',
  },
  {
    title: '자주 쓰는 포맷 우선',
    text: 'WEBP, JPG, PNG처럼 일반 사용자가 실제로 자주 마주치는 이미지 포맷을 먼저 지원합니다.',
  },
  {
    title: '변환 + 압축 + 리사이즈',
    text: '포맷만 바꾸는 게 아니라 용량 줄이기와 크기 조절까지 한 번에 처리할 수 있게 만듭니다.',
  },
] as const

export const guides: Guide[] = [
  {
    slug: 'webp-vs-jpg-vs-png',
    title: 'WEBP, JPG, PNG 차이를 가장 쉽게 이해하는 방법',
    summary: '이미지 포맷 세 가지가 언제 유리한지 실제 사용 기준으로 정리한 가이드입니다.',
    description: 'WEBP, JPG, PNG 포맷 차이와 언제 어떤 형식을 고르면 좋은지 설명합니다.',
    category: '포맷 가이드',
    updated: '2026-03-26',
    readingTime: '6분',
    sections: [
      {
        heading: '세 포맷은 저장 방식부터 다르다',
        paragraphs: [
          'JPG는 사진처럼 색 변화가 많은 이미지를 작게 저장하는 데 강하고, PNG는 배경 투명도와 선명한 그래픽 표현에 강합니다. WEBP는 두 장점을 어느 정도 같이 가져가면서도 용량을 더 줄이기 쉬운 편입니다.',
        ],
      },
      {
        heading: '보통 이렇게 고르면 된다',
        bullets: [
          '사진 위주: JPG 또는 WEBP',
          '투명 배경 필요: PNG 또는 WEBP',
          '웹 업로드 용량 줄이기: WEBP 우선 고려',
          '호환성 우선: JPG 또는 PNG',
        ],
      },
    ],
  },
  {
    slug: 'why-image-quality-changes-after-conversion',
    title: '이미지 변환 후 화질이 달라지는 이유',
    summary: '변환했더니 이미지가 뭉개져 보이는 이유와 줄이는 방법을 설명합니다.',
    description: '이미지 포맷 변환 후 화질 손실이 생기는 이유와 줄이는 방법을 설명합니다.',
    category: '품질 가이드',
    updated: '2026-03-26',
    readingTime: '5분',
    sections: [
      {
        heading: '모든 변환이 무손실은 아니다',
        paragraphs: [
          '특히 JPG나 WEBP 같은 손실 압축 포맷으로 바꾸면 용량은 줄지만 세부 디테일이 조금씩 사라질 수 있습니다. 같은 이미지를 반복 변환할수록 손실이 누적될 가능성도 있습니다.',
        ],
      },
      {
        heading: '화질 저하를 줄이는 팁',
        bullets: [
          '원본에서 바로 한 번만 변환합니다.',
          '불필요하게 여러 번 저장하지 않습니다.',
          '너무 낮은 품질 값으로 압축하지 않습니다.',
          '텍스트/로고가 많은 이미지는 PNG가 더 나을 수 있습니다.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-reduce-image-size-without-breaking-it',
    title: '이미지 용량 줄이면서 깨짐을 덜 만드는 법',
    summary: '압축과 리사이즈를 어떻게 조절하면 용량은 줄이고 품질은 덜 잃는지 정리했어요.',
    description: '이미지 용량 줄이기와 리사이즈 시 품질 저하를 줄이는 방법을 설명합니다.',
    category: '압축 가이드',
    updated: '2026-03-26',
    readingTime: '6분',
    sections: [
      {
        heading: '용량을 줄이는 방법은 크게 두 가지다',
        paragraphs: [
          '하나는 압축 품질을 낮추는 방법이고, 다른 하나는 이미지 크기 자체를 줄이는 방법입니다. 보통은 두 방법을 같이 쓰되, 어느 한쪽을 과하게 낮추지 않는 균형이 중요합니다.',
        ],
      },
      {
        heading: '실전 추천',
        bullets: [
          '웹 업로드용이면 긴 변을 먼저 줄입니다.',
          '품질은 0.8 안팎부터 시작해 봅니다.',
          '텍스트가 많은 이미지는 JPG보다 PNG/WebP를 비교해 봅니다.',
          '최종 용량보다 실제 보이는 품질을 먼저 확인합니다.',
        ],
      },
    ],
  },
]

export const staticPages: Record<string, StaticPage> = {
  about: {
    title: '소개',
    description: '이미지 변환 툴 허브의 목적과 운영 방향',
    intro:
      '이미지 변환 툴 허브는 일반 사용자가 설치 없이 웹에서 바로 이미지 포맷을 바꾸고, 압축과 리사이즈까지 할 수 있게 돕는 실용형 툴 사이트를 목표로 합니다.',
    sections: [
      {
        heading: '왜 이 사이트를 만들었나',
        paragraphs: [
          '실제로는 이미지 형식을 바꾸거나 용량을 줄여야 하는 일이 꽤 자주 생기는데, 많은 사이트가 광고만 많거나 파일 처리 방식이 불분명합니다. 우리는 브라우저 기반 도구와 설명 문서를 함께 제공하는 구조를 만들고 싶었습니다.',
        ],
      },
      {
        heading: '운영 원칙',
        bullets: [
          '실제로 쓸 수 있는 기능을 우선합니다.',
          '파일 처리 방식을 문서로 함께 설명합니다.',
          '얇은 랜딩보다 툴과 가이드를 같이 운영합니다.',
        ],
      },
    ],
  },
  methodology: {
    title: '방법론',
    description: '이미지 처리 방식과 제한 사항 안내',
    intro:
      '현재 공개 버전은 브라우저 안에서 이미지를 읽고, canvas 기반으로 변환·압축·리사이즈를 처리하는 방식을 우선 사용합니다.',
    sections: [
      {
        heading: '무엇을 하나',
        bullets: [
          'WEBP/JPG/PNG 포맷 변환',
          '품질 값을 조절한 압축',
          '가로/세로 크기 조절',
          '다운로드용 새 파일 생성',
        ],
      },
      {
        heading: '무엇을 하지 않나',
        bullets: [
          '파일 이름만 바꾸는 식의 가짜 변환은 하지 않습니다.',
          '업로드 파일을 장기 보관하는 것을 기본값으로 두지 않습니다.',
          '문서·영상·압축파일 같은 범용 포맷 전체를 한 번에 다루진 않습니다.',
        ],
      },
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    description: '파일 처리와 사용자 정보에 관한 안내',
    intro:
      '이미지 변환 툴 허브는 가능하면 브라우저 내 처리를 우선하고, 업로드한 파일을 따로 저장하지 않는 방향으로 운영합니다.',
    sections: [
      {
        heading: '파일 처리 원칙',
        paragraphs: [
          '현재 공개 버전은 브라우저 안에서 이미지를 읽고 변환하는 방식을 우선합니다. 업로드한 파일을 서버에 장기 보관하는 구조를 기본값으로 두지 않습니다.',
        ],
      },
      {
        heading: '수집될 수 있는 정보',
        bullets: [
          '기본 접속 로그와 브라우저 정보',
          '사용자가 문의 메일을 보낼 때 자발적으로 제공한 연락 정보',
          '서비스 안정성 개선을 위한 최소한의 에러 정보',
        ],
      },
    ],
  },
  terms: {
    title: '이용안내',
    description: '서비스 이용 전 알아둘 기본 안내',
    intro: '본 사이트는 일반 사용자를 위한 실용형 도구와 설명 콘텐츠를 제공하는 서비스입니다.',
    sections: [
      {
        heading: '서비스 성격',
        bullets: [
          '이미지 변환·압축·리사이즈를 돕는 도구입니다.',
          '민감한 파일은 업로드 전에 사용자가 한 번 더 확인하는 것이 좋습니다.',
          '도구 결과는 원본 파일 상태와 브라우저 환경에 따라 달라질 수 있습니다.',
        ],
      },
    ],
  },
  contact: {
    title: '문의',
    description: '기능 오류, 광고, 일반 운영 문의 안내',
    intro: '기능 오류, 제휴, 광고, 일반 피드백은 운영 이메일로 받을 수 있습니다.',
    sections: [
      {
        heading: '운영 이메일',
        paragraphs: ['문의 채널은 sjung0328@gmail.com 입니다. 기능 오류와 광고·제휴 문의도 이 주소로 받을 수 있습니다.'],
      },
      {
        heading: '문의 범위',
        bullets: ['기능 오류와 개선 제안', '파일 처리 관련 문의', '광고 및 제휴 문의', '정책 관련 문의'],
      },
    ],
  },
  faq: {
    title: '자주 묻는 질문',
    description: '이미지 변환 툴 사용자가 자주 묻는 질문 모음',
    intro: '포맷 변환, 화질, 파일 처리 방식과 관련해 자주 묻는 내용을 정리했습니다.',
    sections: [
      {
        heading: '파일을 서버에 저장하나요?',
        paragraphs: ['현재 공개 버전은 가능하면 브라우저 내 처리를 우선하고, 업로드 파일을 따로 저장하지 않는 방향으로 운영합니다.'],
      },
      {
        heading: '왜 변환 후 화질이 달라질 수 있나요?',
        paragraphs: ['JPG나 WEBP처럼 손실 압축 포맷을 쓰면 용량이 줄어드는 대신 일부 디테일이 줄어들 수 있습니다.'],
      },
      {
        heading: 'PNG를 JPG로 바꾸면 투명 배경은 어떻게 되나요?',
        paragraphs: ['JPG는 투명 배경을 지원하지 않기 때문에 보통 흰색 배경처럼 채워져 저장됩니다.'],
      },
    ],
  },
} as const
