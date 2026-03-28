# Image Convert Tool Hub — Search Console Submission Checklist

작성일: 2026-03-28
현재 기준 사이트: https://image-convert-tool-hub.pages.dev
현재 sitemap: https://image-convert-tool-hub.pages.dev/sitemap.xml

## 목적
Google Search Console에 사이트를 등록하고 sitemap 제출 및 인덱싱 상태를 관리할 수 있게 준비한다.

## 현재 준비 완료 항목
- [x] `robots.txt` 존재
- [x] `sitemap.xml` 존재
- [x] 주요 페이지 URL 구조 정리
- [x] 가이드/정책/문의 페이지 보강
- [x] canonical 메타 동작 중

## 제출 전에 확인할 것
- [ ] 최종 운영 도메인이 확정됐는지 확인
- [ ] 가능하면 커스텀 도메인 연결 후 제출
- [ ] canonical이 최종 도메인 기준으로 맞아 있는지 확인
- [ ] `robots.txt`가 sitemap 위치를 가리키는지 확인

## 등록 방식 추천
### 권장: 도메인 속성
- 예: `example.com`
- 장점: 서브도메인/프로토콜 전체를 한 번에 묶어서 봄
- 조건: DNS TXT 검증 가능해야 함

### 차선: URL-prefix 속성
- 예: `https://convert.example.com/`
- 장점: 빠르게 추가 가능
- 조건: 정확한 URL 단위로 별도 관리

## 제출 순서
1. Search Console 접속
2. 속성 추가
3. 도메인 소유권 확인
4. `Sitemaps` 메뉴 진입
5. sitemap 제출
   - 현재 기준: `sitemap.xml`
6. 주요 핵심 URL만 URL 검사로 한 번씩 요청
   - `/`
   - `/tool`
   - `/guides`
   - `/about`
   - `/faq`

## 현재 사이트에서 제출 대상 핵심 URL
- `/`
- `/tool`
- `/guides`
- `/guides/webp-vs-jpg-vs-png`
- `/guides/why-image-quality-changes-after-conversion`
- `/guides/how-to-reduce-image-size-without-breaking-it`
- `/guides/when-webp-is-not-smaller`
- `/guides/heic-heif-to-jpg-png-guide`
- `/guides/pdf-to-image-guide`
- `/guides/psd-to-png-jpg-guide`
- `/guides/image-settings-for-blog-and-marketplaces`
- `/guides/common-image-conversion-mistakes`
- `/guides/png-jpg-webp-real-world-comparison`
- `/about`
- `/methodology`
- `/privacy`
- `/terms`
- `/contact`
- `/faq`

## 제출 후 볼 것
- [ ] sitemap 읽힘 상태
- [ ] 인덱싱된 페이지 수 변화
- [ ] `Discovered - currently not indexed` 가 과도하게 쌓이지 않는지
- [ ] canonical 선택이 의도대로 잡히는지
- [ ] 모바일 사용성 이슈가 없는지
- [ ] 수동 조치/보안 이슈 없는지

## 실무 팁
- 처음 등록 직후 바로 다 인덱싱 안 되는 건 정상이다.
- 페이지 수가 적은 초기 사이트는 **중요 URL 몇 개만 수동 검사**해도 체감상 도움이 된다.
- 커스텀 도메인으로 갈 거면 **가능하면 도메인 확정 후 Search Console 속성도 새 기준으로 잡는 편이 깔끔**하다.

## 지금 기준 권장 액션
### 도메인 미확정이면
- 일단 현재 `pages.dev` 기준으로 구조/robots/sitemap만 유지
- 커스텀 도메인 확정되면 그때 Search Console 등록

### 도메인 확정이면
- 즉시 canonical/siteUrl 전부 새 도메인으로 교체
- 재배포
- Search Console 등록
- sitemap 제출

## 필요한 사람 액션
- Google Search Console 접근 가능한 구글 계정
- 최종 도메인 소유권 검증 가능 여부
