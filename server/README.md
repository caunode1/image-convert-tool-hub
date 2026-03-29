# Image Convert Tool Hub Server Prototype

특수 포맷 완성형 대응을 위해 만든 Node 서버 프로토타입.

## 목적
현재 `web/` 앱은 브라우저 내 처리 우선 구조라 PDF / HEIC / HEIF / PSD / TIFF 같은 특수 포맷에서 완전 대응에 한계가 있다.
이 프로토타입은 서버형 엔진으로 특수 포맷을 처리할 수 있는지 검증하기 위한 1차 구현이다.

## 현재 프로토타입 범위
- `POST /api/convert`
- 입력: 단일 파일 업로드(`file`)
- 출력 포맷: `jpeg` / `png` / `webp`

### 포맷별 처리 엔진
- HEIC / HEIF → `heic-convert`
- TIFF → `sharp`
- PSD → `ag-psd + @napi-rs/canvas`
- PDF → `pdfjs-dist + @napi-rs/canvas`

### PDF 지원 범위
- `pdfPageMode=first|all|range`
- `pdfPageRange=1-3,5`
- `pdfQuality=fast|balanced|sharp`
- 선택 페이지가 1장이면 단일 이미지 반환
- 여러 장이면 ZIP 반환

## 실행
```bash
cd server
npm install
npm run dev
```

기본 포트: `8788`

## 헬스 체크
```bash
curl http://127.0.0.1:8788/api/health
```

## 예시
### HEIC -> JPG
```bash
curl -o out.jpg \
  -F 'file=@../web/tmp-verification/qa-heic.heic' \
  -F 'targetFormat=jpeg' \
  http://127.0.0.1:8788/api/convert
```

### PDF 2페이지만 JPG
```bash
curl -o out.jpg \
  -F 'file=@../web/tmp-verification/qa-multi.pdf' \
  -F 'targetFormat=jpeg' \
  -F 'pdfPageMode=range' \
  -F 'pdfPageRange=2' \
  -F 'pdfQuality=sharp' \
  http://127.0.0.1:8788/api/convert
```

### PDF 전체 페이지 ZIP
```bash
curl -o out.zip \
  -F 'file=@../web/tmp-verification/qa-multi.pdf' \
  -F 'targetFormat=png' \
  -F 'pdfPageMode=all' \
  http://127.0.0.1:8788/api/convert
```

## 지금 확인된 것
프로토타입 수준에서 실제 변환 성공 확인:
- HEIC -> JPG
- TIFF -> WEBP
- PSD -> PNG
- 16-bit PSD -> PNG
- PDF 범위 선택 -> JPG
- PDF 전체 페이지 -> ZIP

## 아직 남은 것
- 현재 `web/` 프론트와 자동 분기 연동
- 실제 배포 대상 결정 (Cloudflare Pages만으로는 부족, 별도 서버/런타임 필요)
- 다중 파일 배치 API / 진행 상태 / 장기 저장 전략
- 보안, rate limit, 업로드 용량 정책
