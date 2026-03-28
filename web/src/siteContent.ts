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
    'WEBP, JPG, PNG 출력 변환은 물론 TIFF·PSD·HEIC·PDF 같은 입력도 브라우저 안에서 정리할 수 있게 만든 실용형 이미지 도구 사이트입니다.',
  contactEmail: 'sjung0328@gmail.com',
} as const

export const toolHighlights = [
  {
    title: '실제로 쓰는 작업을 먼저 해결',
    text: '가벼운 데모보다 실무에서 자주 만나는 변환·압축·리사이즈 흐름을 우선 정리합니다.',
  },
  {
    title: '도구와 설명을 같이 제공',
    text: '툴만 던져두지 않고, 포맷 차이와 제한 사항, 권장 사용법까지 함께 문서화합니다.',
  },
  {
    title: '특수 포맷은 제한을 숨기지 않음',
    text: 'HEIC·HEIF·PDF·TIFF·PSD는 되는 범위와 조심해야 할 범위를 명확히 적습니다.',
  },
] as const

export const guides: Guide[] = [
  {
    slug: 'webp-vs-jpg-vs-png',
    title: 'WEBP, JPG, PNG 차이를 가장 쉽게 이해하는 방법',
    summary: '세 포맷이 언제 유리한지 실제 사용 기준으로 정리한 가이드입니다.',
    description: 'WEBP, JPG, PNG 포맷 차이와 언제 어떤 형식을 고르면 좋은지 설명합니다.',
    category: '포맷 가이드',
    updated: '2026-03-28',
    readingTime: '6분',
    sections: [
      {
        heading: '세 포맷은 강점이 다르다',
        paragraphs: [
          'JPG는 사진처럼 색 변화가 많은 이미지에 강하고, PNG는 투명 배경과 또렷한 그래픽 표현에 강합니다. WEBP는 사진에서는 용량을 줄이기 쉬운 편이지만, 투명 PNG나 작은 그래픽처럼 이미 단순한 파일은 오히려 더 커질 수도 있습니다.',
        ],
      },
      {
        heading: '보통 이렇게 고르면 된다',
        bullets: [
          '사진 위주: JPG 또는 WEBP',
          '투명 배경 필요: PNG 또는 WEBP',
          '웹 업로드 용량 줄이기: 사진이면 WEBP 우선 고려, 단 PNG·작은 그래픽·이미 최적화된 파일은 더 커질 수 있음',
          '호환성 우선: JPG 또는 PNG',
        ],
      },
      {
        heading: '변환 전에 한 번만 더 체크할 것',
        bullets: [
          '배경 투명도가 필요한지',
          '이미지가 사진인지 로고/문서/일러스트인지',
          '용량보다 디테일 보존이 더 중요한지',
          '최종 업로드 대상이 WEBP를 안정적으로 지원하는지',
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
    updated: '2026-03-28',
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
    summary: '압축과 리사이즈를 어떻게 조절하면 용량은 줄이고 품질은 덜 잃는지 정리했습니다.',
    description: '이미지 용량 줄이기와 리사이즈 시 품질 저하를 줄이는 방법을 설명합니다.',
    category: '압축 가이드',
    updated: '2026-03-28',
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
  {
    slug: 'when-webp-is-not-smaller',
    title: 'WEBP가 항상 더 작지 않은 이유',
    summary: '왜 어떤 파일은 WEBP로 바꿔도 안 줄거나 오히려 커지는지 정리했습니다.',
    description: 'WEBP가 항상 더 작아지지 않는 이유와 어떤 파일에서 그런 현상이 생기는지 설명합니다.',
    category: 'WEBP 가이드',
    updated: '2026-03-28',
    readingTime: '5분',
    sections: [
      {
        heading: '사진과 그래픽은 성격이 다르다',
        paragraphs: [
          'WEBP는 보통 사진 계열에서 효율이 좋습니다. 하지만 작은 아이콘, 단순 일러스트, 투명 PNG처럼 이미 정보량이 적은 파일은 재압축 이득이 크지 않아서 오히려 결과가 커질 수 있습니다.',
        ],
      },
      {
        heading: '특히 더 커지기 쉬운 경우',
        bullets: [
          '투명 영역이 많은 PNG',
          '글자·도형 중심의 작은 그래픽',
          '이미 잘 압축된 WEBP를 다시 WEBP로 저장하는 경우',
          '품질 값을 높게 잡아 디테일을 과하게 유지하려는 경우',
        ],
      },
      {
        heading: '안전한 사용법',
        bullets: [
          'WEBP 결과와 JPG/PNG 결과를 같이 비교합니다.',
          '사진이 아니라면 PNG를 먼저 고려합니다.',
          '이미 최적화된 파일은 재저장 자체를 줄입니다.',
        ],
      },
    ],
  },
  {
    slug: 'heic-heif-to-jpg-png-guide',
    title: 'HEIC/HEIF를 JPG나 PNG로 바꿀 때 알아둘 점',
    summary: '아이폰 사진이나 HEIF 계열 파일을 변환할 때 어디까지 기대해도 되는지 정리했습니다.',
    description: 'HEIC/HEIF 파일을 JPG/PNG로 변환할 때의 장단점과 제한 사항을 설명합니다.',
    category: '특수 포맷 가이드',
    updated: '2026-03-28',
    readingTime: '5분',
    sections: [
      {
        heading: '이 사이트에서 HEIC/HEIF를 다루는 방식',
        paragraphs: [
          '현재 공개 버전은 HEIC/HEIF를 브라우저에서 바로 다루기 쉬운 PNG 계열로 먼저 바꾼 뒤, 사용자가 고른 JPG/PNG/WEBP로 다시 출력합니다. 일반적인 단일 사진은 대체로 잘 처리되지만, 모든 HEIF 변형을 완전히 동일하게 재현하는 것은 아닙니다.',
        ],
      },
      {
        heading: '조심해야 할 경우',
        bullets: [
          '실기기에서 생성된 특수 HEIF 변형',
          '여러 프레임/부가 정보가 많은 파일',
          '원본 앱에서만 보이는 추가 메타데이터 의존 파일',
        ],
      },
      {
        heading: '실무 팁',
        bullets: [
          '일반 공유용 사진이면 JPG로 충분한 경우가 많습니다.',
          '투명 배경 보존이 필요하면 PNG를 봅니다.',
          '결과가 이상하면 원본 HEIC 대신 JPG로 다시 내보내 비교합니다.',
        ],
      },
    ],
  },
  {
    slug: 'pdf-to-image-guide',
    title: 'PDF를 이미지로 바꾸면 무엇이 달라질까',
    summary: 'PDF 페이지를 이미지처럼 렌더링할 때 생기는 차이를 이해하기 쉽게 정리했습니다.',
    description: 'PDF를 JPG/PNG로 바꿀 때 텍스트, 페이지, 렌더링 품질이 어떻게 달라지는지 설명합니다.',
    category: '문서 변환 가이드',
    updated: '2026-03-28',
    readingTime: '5분',
    sections: [
      {
        heading: 'PDF는 문서이고, 결과는 이미지다',
        paragraphs: [
          'PDF를 이미지로 바꾸면 페이지를 화면처럼 렌더링한 결과를 저장하게 됩니다. 그래서 텍스트 선택이나 벡터 특성은 줄어들고, 대신 썸네일·업로드·미리보기처럼 이미지가 필요한 상황에 바로 쓰기 쉬워집니다.',
        ],
      },
      {
        heading: '페이지 처리 방식',
        bullets: [
          '1페이지 PDF는 결과 1개로 저장',
          '다페이지 PDF는 페이지 수만큼 결과 생성',
          '페이지 순서를 유지해 이름을 붙임',
        ],
      },
      {
        heading: '주의할 점',
        bullets: [
          '원본 PDF의 텍스트 선택 기능은 유지되지 않음',
          '확대하면 벡터 문서보다 선명도가 떨어질 수 있음',
          '페이지 수가 많을수록 처리 시간이 길어질 수 있음',
        ],
      },
    ],
  },
  {
    slug: 'psd-to-png-jpg-guide',
    title: 'PSD를 PNG/JPG로 바꿀 때 레이어가 달라질 수 있는 이유',
    summary: 'PSD를 브라우저에서 다룰 때 왜 미리보기와 레이어 상태가 중요해지는지 설명합니다.',
    description: 'PSD를 PNG/JPG로 바꿀 때 합성 미리보기와 레이어, 16-bit 제한이 왜 중요한지 설명합니다.',
    category: '디자인 파일 가이드',
    updated: '2026-03-28',
    readingTime: '6분',
    sections: [
      {
        heading: 'PSD는 단순 이미지가 아니다',
        paragraphs: [
          'PSD는 레이어, 블렌드, 마스크, 스마트 오브젝트 같은 정보가 함께 들어가는 디자인 파일입니다. 그래서 PNG/JPG처럼 한 장의 이미지 파일로 바꿀 때는 어떤 합성 결과를 기준으로 볼지 결정해야 합니다.',
        ],
      },
      {
        heading: '이 사이트의 처리 원칙',
        bullets: [
          '합성 미리보기(composite preview)가 있으면 그 결과를 우선 사용',
          '합성 미리보기가 없으면 보이는 레이어를 다시 합성해 시도',
          '16-bit 이상 PSD나 일부 고급 효과는 제한될 수 있음',
        ],
      },
      {
        heading: '안전하게 쓰는 방법',
        bullets: [
          '최대 호환성(Composite preview)을 포함해 저장합니다.',
          '최종 전달용이면 PNG/JPG로 따로 한 번 내보낸 원본도 보관합니다.',
          '고급 효과가 많으면 디자인 툴의 직접 export 결과와 비교합니다.',
        ],
      },
    ],
  },
  {
    slug: 'image-settings-for-blog-and-marketplaces',
    title: '블로그·쇼핑몰 업로드용 이미지 설정을 고를 때 기준',
    summary: '블로그, 커뮤니티, 쇼핑몰에 올릴 이미지를 어떤 포맷과 크기로 준비하면 좋은지 정리했습니다.',
    description: '블로그와 쇼핑몰 업로드용 이미지의 포맷, 크기, 품질 설정 기준을 설명합니다.',
    category: '실전 업로드 가이드',
    updated: '2026-03-28',
    readingTime: '6분',
    sections: [
      {
        heading: '업로드 대상에 따라 기준이 달라진다',
        paragraphs: [
          '블로그 본문 이미지는 가독성과 용량 균형이 중요하고, 쇼핑몰 상품 이미지는 선명도와 색 유지가 더 중요할 수 있습니다. 같은 이미지라도 어디에 올릴지에 따라 JPG, PNG, WEBP 선택이 달라집니다.',
        ],
      },
      {
        heading: '보통 이렇게 시작하면 무난하다',
        bullets: [
          '일반 사진: JPG 또는 WEBP',
          '텍스트/캡처/로고: PNG 우선',
          '긴 변은 업로드 대상 화면 크기에 맞춰 먼저 줄이기',
          '품질은 80~90% 근처에서 시작해 결과를 비교하기',
        ],
      },
      {
        heading: '실수 줄이는 팁',
        bullets: [
          '원본을 여러 번 재저장하지 않습니다.',
          '썸네일용과 원본용 파일을 분리합니다.',
          '배경 투명도가 필요하면 JPG를 피합니다.',
          '업로드 후 실제 화면에서 선명도와 용량을 같이 확인합니다.',
        ],
      },
    ],
  },
  {
    slug: 'common-image-conversion-mistakes',
    title: '이미지 용량 줄일 때 자주 하는 실수',
    summary: '용량은 줄였는데 화면이 지저분해지는 흔한 실수를 피하는 기준을 정리했습니다.',
    description: '이미지 용량 줄이기 과정에서 자주 생기는 실수와 피하는 방법을 설명합니다.',
    category: '실수 방지 가이드',
    updated: '2026-03-28',
    readingTime: '5분',
    sections: [
      {
        heading: '무조건 작은 파일만 목표로 잡는 실수',
        paragraphs: [
          '용량만 줄이려고 품질을 지나치게 낮추면 실제 화면에서는 노이즈나 번짐이 먼저 눈에 띕니다. 업로드 성공보다 결과 이미지의 사용성이 더 중요할 때가 많습니다.',
        ],
      },
      {
        heading: '자주 보이는 패턴',
        bullets: [
          '텍스트가 많은 이미지를 JPG로 저장해 글자가 뭉개짐',
          '투명 PNG를 JPG로 바꿔 배경이 깨져 보임',
          '이미 최적화된 WEBP를 다시 저장해 오히려 커짐',
          '리사이즈 없이 품질만 과하게 낮춰 디테일 손실이 커짐',
        ],
      },
      {
        heading: '더 안전한 순서',
        bullets: [
          '먼저 크기를 줄이고, 그다음 품질을 조절합니다.',
          '사진과 그래픽을 같은 포맷으로 몰지 않습니다.',
          '최종 결과는 실제 게시 위치에서 다시 확인합니다.',
        ],
      },
    ],
  },
  {
    slug: 'png-jpg-webp-real-world-comparison',
    title: 'PNG, JPG, WEBP를 실제로 비교할 때 보는 기준',
    summary: '단순 파일 크기보다 어떤 장면에서 어떤 포맷이 유리한지 비교 기준을 정리했습니다.',
    description: 'PNG, JPG, WEBP를 실사용 기준으로 비교할 때 봐야 할 요소를 설명합니다.',
    category: '비교 가이드',
    updated: '2026-03-28',
    readingTime: '6분',
    sections: [
      {
        heading: '숫자 하나만 보면 자주 오판한다',
        paragraphs: [
          '파일 용량만 보면 WEBP가 항상 좋아 보일 수 있지만, 실제로는 배경 투명도, 글자 선명도, 재편집 필요 여부까지 같이 봐야 합니다. 용량은 같아도 사용감은 크게 다를 수 있습니다.',
        ],
      },
      {
        heading: '비교할 때 볼 항목',
        bullets: [
          '실제 용량',
          '텍스트/선의 또렷함',
          '투명 배경 유지 여부',
          '업로드 대상의 호환성',
          '같은 파일을 다시 편집할 가능성',
        ],
      },
      {
        heading: '빠른 판단 기준',
        bullets: [
          '사진이면 JPG/WEBP부터 비교',
          '캡처/문서/로고면 PNG부터 확인',
          '투명 배경이 있으면 JPG 제외',
          '이미지 성격이 애매하면 세 포맷을 소량 비교 후 결정',
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
      '이미지 변환 툴 허브는 설치 없이 웹에서 바로 이미지 포맷을 바꾸고, 압축과 리사이즈까지 할 수 있게 돕는 실용형 툴 사이트를 목표로 합니다.',
    sections: [
      {
        heading: '왜 이 사이트를 만들었나',
        paragraphs: [
          '실제로는 이미지 형식을 바꾸거나 용량을 줄여야 하는 일이 자주 생기는데, 많은 사이트가 광고만 많거나 처리 방식이 불분명합니다. 우리는 브라우저 기반 도구와 설명 문서를 함께 제공하는 구조를 만들고 싶었습니다.',
        ],
      },
      {
        heading: '누구를 위한 사이트인가',
        bullets: [
          '블로그·커뮤니티·마켓 업로드용 이미지를 빠르게 정리하려는 사용자',
          'HEIC·PDF·TIFF·PSD 같은 입력을 우선 가볍게 확인하려는 사용자',
          '포맷 차이와 제한까지 같이 이해하고 싶은 사용자',
        ],
      },
      {
        heading: '운영 원칙',
        bullets: [
          '실제로 쓸 수 있는 기능을 우선합니다.',
          '파일 처리 방식을 설명 없이 숨기지 않습니다.',
          '얇은 랜딩보다 툴과 가이드를 같이 운영합니다.',
          '특수 포맷은 되는 범위와 제한을 분리해서 안내합니다.',
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
          'TIFF·PSD·HEIC·PDF 입력을 브라우저용 이미지로 정리',
          'HEIC/HEIF는 내부적으로 PNG로 먼저 변환해 처리',
          'PSD는 합성 미리보기가 없으면 보이는 레이어를 다시 합성해 시도',
          '품질 값을 조절한 압축',
          '가로/세로 크기 조절',
          '다운로드용 새 파일 생성',
        ],
      },
      {
        heading: '어떻게 검증하나',
        bullets: [
          '핵심 포맷 변환은 라이브 사이트에서 실제 업로드/다운로드까지 확인합니다.',
          'PDF·GIF·TIFF·HEIC·PSD 같은 특수 입력은 별도 회귀 샘플로 검증합니다.',
          '지원 여부는 pass / caveat / fail로 나눠 과장하지 않고 기록합니다.',
        ],
      },
      {
        heading: '무엇을 하지 않나',
        bullets: [
          '파일 이름만 바꾸는 식의 가짜 변환은 하지 않습니다.',
          '업로드 파일을 장기 보관하는 것을 기본값으로 두지 않습니다.',
          'RAW 전체 포맷군은 아직 브라우저 버전에서 지원하지 않습니다.',
          '16bit 이상 PSD, 일부 고급 효과 PSD, 일부 특수 HEIF 변형은 제한될 수 있습니다.',
          'WEBP가 항상 더 작은 결과를 보장하지는 않습니다. 사진 외 그래픽은 JPG/PNG가 더 유리할 수 있습니다.',
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
      {
        heading: '민감한 파일에 대한 권장 사항',
        bullets: [
          '대외비·계약서·개인정보 포함 파일은 업로드 전에 한 번 더 확인합니다.',
          '특수 포맷은 결과를 반드시 열어 보고 최종본으로 사용합니다.',
          '업무상 중요한 파일은 원본을 별도로 보관합니다.',
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
      {
        heading: '사용 전 알아둘 점',
        bullets: [
          '특수 포맷은 브라우저 처리 특성상 일부 정보가 단순화될 수 있습니다.',
          '최종 제출용 파일은 결과를 직접 확인한 뒤 사용하세요.',
          '법적·업무상 중요한 원본은 별도로 보관하세요.',
        ],
      },
      {
        heading: '금지되는 사용',
        bullets: [
          '타인의 권리를 침해하는 파일의 무단 처리',
          '불법 콘텐츠의 생성·유통 목적 사용',
          '서비스를 방해하거나 비정상 부하를 유발하는 사용',
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
      {
        heading: '오류 제보를 빨리 처리하려면',
        bullets: [
          '문제가 난 파일 형식과 확장자',
          '어떤 출력 형식으로 바꾸려 했는지',
          '브라우저 종류와 기기 정보',
          '오류 문구나 결과 스크린샷',
        ],
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
        heading: 'WEBP로 바꿨는데 왜 더 커질 수 있나요?',
        paragraphs: ['WEBP는 사진에서 유리한 경우가 많지만, 투명 PNG·작은 그래픽·이미 최적화된 WEBP는 다시 저장하는 과정에서 오히려 더 커질 수 있습니다. 이럴 때는 JPG나 PNG 결과와 같이 비교하는 편이 안전합니다.'],
      },
      {
        heading: 'PNG를 JPG로 바꾸면 투명 배경은 어떻게 되나요?',
        paragraphs: ['JPG는 투명 배경을 지원하지 않기 때문에 보통 흰색 배경처럼 채워져 저장됩니다. PSD나 일부 TIFF도 같은 방식으로 처리될 수 있습니다.'],
      },
      {
        heading: 'HEIC/HEIF나 PSD는 제한이 있나요?',
        paragraphs: ['HEIC/HEIF는 브라우저 호환용 PNG로 먼저 바꿔 처리합니다. 일반적인 단일 사진은 대체로 괜찮지만 일부 HEIF 변형은 실패할 수 있습니다. PSD는 합성 미리보기를 우선 쓰고, 없으면 보이는 레이어를 다시 합성해 시도합니다. 다만 16bit 이상이거나 일부 고급 효과가 많은 파일은 제한될 수 있습니다.'],
      },
      {
        heading: 'PDF나 TIFF는 어떻게 처리되나요?',
        paragraphs: ['PDF는 페이지를 이미지처럼 렌더링해 순서대로 결과를 만듭니다. TIFF는 브라우저에서 읽을 수 있는 페이지를 기준으로 처리하며, 일부 복잡한 스캔 TIFF는 원본 뷰어와 차이가 날 수 있습니다.'],
      },
      {
        heading: 'RAW 파일도 바로 변환할 수 있나요?',
        paragraphs: ['아직은 아닙니다. 이 브라우저 버전은 TIFF·PSD까지 우선 지원하고, NEF·CR2·ARW·DNG 같은 RAW 계열은 해석 범위와 처리 비용이 커서 다음 단계 검토 대상으로 남겨 두었습니다.'],
      },
    ],
  },
} as const
