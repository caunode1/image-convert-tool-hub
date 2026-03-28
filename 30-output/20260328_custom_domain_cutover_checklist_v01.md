# Image Convert Tool Hub — Custom Domain Cutover Checklist

작성일: 2026-03-28
대상 사이트: https://image-convert-tool-hub.pages.dev
대상 프로젝트: Cloudflare Pages `image-convert-tool-hub`

## 목적
`pages.dev` 기본 도메인 대신 커스텀 도메인을 연결해 사이트 신뢰도와 브랜드 일관성을 높인다.

## 현재 상태
- Pages 프로젝트 배포 정상
- `robots.txt` / `sitemap.xml` 배포 완료
- 가이드/정책/문의 페이지 보강 완료
- 아직 **커스텀 도메인 미연결**

## 권장 도메인 형태
우선순위는 아래 둘 중 하나다.

1. **apex domain**
   - 예: `example.com`
   - 장점: 브랜드 기준 메인 주소로 쓰기 좋음
   - 조건: 도메인 네임서버를 Cloudflare로 붙이는 작업이 필요할 가능성이 큼

2. **subdomain**
   - 예: `img.example.com`, `convert.example.com`, `tool.example.com`
   - 장점: 기존 메인 사이트가 따로 있어도 연결이 가볍다
   - 조건: 현재 DNS 제공자에서 CNAME 추가 가능해야 함

실무적으로는 **기존 메인 사이트가 이미 있으면 `convert.` 또는 `img.` 서브도메인**, 별도 브랜드로 밀 거면 **apex domain**이 낫다.

## Cloudflare Pages 기준 연결 방식
Cloudflare 공식 문서 기준 요약:
- Pages 프로젝트 > **Custom domains** > **Set up a domain**
- 연결하려는 도메인 입력 후 진행
- **apex domain** 은 Cloudflare zone + nameserver 위임이 필요할 수 있음
- **subdomain** 은 `<PROJECT>.pages.dev` 로 향하는 CNAME으로 연결 가능

## 작업 전 체크
- [ ] 사용할 실제 도메인 결정
- [ ] 해당 도메인 DNS 수정 권한 확인
- [ ] 가능하면 `www` / apex 중 canonical 구조 결정
- [ ] Search Console에서 어떤 속성으로 잡을지 결정
  - 도메인 속성(권장)
  - URL-prefix 속성(간단)

## 추천 canonical 구조
### 옵션 A — apex를 메인으로
- 메인: `https://example.com`
- 보조: `https://www.example.com` → 메인으로 리다이렉트

### 옵션 B — subdomain을 메인으로
- 메인: `https://convert.example.com`
- 보조: 기존 메인 사이트와 역할 분리

이 프로젝트는 독립 유틸리티 성격이라 **기존 브랜드 사이트가 있다면 subdomain**, 독립 서비스로 키울 생각이면 **apex** 권장.

## 실제 연결 순서
### 1) Cloudflare Pages에 도메인 추가
- [ ] Cloudflare Dashboard → Workers & Pages → `image-convert-tool-hub`
- [ ] `Custom domains`
- [ ] `Set up a domain`
- [ ] 최종 도메인 입력

### 2) DNS 설정
#### subdomain일 때
- [ ] DNS에 CNAME 추가
- [ ] 예: `convert.example.com` → `image-convert-tool-hub.pages.dev`
- [ ] Cloudflare에서 도메인 활성화 상태 확인

#### apex domain일 때
- [ ] 도메인을 Cloudflare zone으로 추가
- [ ] 네임서버를 Cloudflare로 위임
- [ ] Pages custom domain 연결 완료 여부 확인

### 3) 보조 도메인 정리
- [ ] `www` 또는 보조 도메인을 하나만 추가로 연결
- [ ] 메인 canonical 한 곳으로 통일

### 4) 앱 설정 반영
커스텀 도메인이 정해지면 아래도 같이 바꿔야 한다.
- [ ] `siteInfo.siteUrl`
- [ ] `index.html` canonical / og:url 기본값
- [ ] `public/robots.txt`의 Sitemap 주소
- [ ] `public/sitemap.xml` 모든 URL
- [ ] 배포 후 실제 HTML head에서 canonical/og:url 반영 확인

## 연결 후 검증
- [ ] `https://<custom-domain>/` 접속 확인
- [ ] `/tool`, `/guides`, `/about`, `/faq` 열림 확인
- [ ] `robots.txt` 정상 응답 확인
- [ ] `sitemap.xml` 정상 응답 확인
- [ ] canonical이 새 도메인으로 찍히는지 확인
- [ ] 구형 `pages.dev`가 남아도 canonical은 새 도메인으로 가는지 확인

## 주의
- `pages.dev` 주소를 바로 없애기보다, 먼저 **커스텀 도메인 안정화 → canonical 교체 → Search Console 제출** 순서가 안전하다.
- 애드센스 관점에서도 **커스텀 도메인 + 안정된 canonical** 쪽이 유리하다.

## 지금 남은 사람 입력값
아직 필요한 건 딱 이것뿐이다.
- 최종 도메인 이름
- 그 도메인 DNS/Cloudflare 접근 가능 여부

정해지면 바로 다음 액션:
1. 앱 URL 전부 새 도메인으로 교체
2. 재배포
3. Search Console 제출
4. 애드센스 신청 체크리스트 최종 갱신
