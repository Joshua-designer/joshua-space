# Source Analysis — KTR 위클리 트렌드 푸드 관심사

> Figma 디자인 기반 분석 (코드 파싱 + 스크린샷)  
> 분석일: 2026-05-11

---

## 분석 대상 Figma 화면

| 화면 | Figma Node | 설명 |
|------|-----------|------|
| 목록 화면 | 199:46835 | `/trend/k-trend-radar/weekly-trend` |
| 상세 모달 | 203:62139 | 카드 클릭 시 오버레이 모달 |

---

## 화면 1: 위클리 트렌드 목록

### 전체 레이아웃
- 전체 폭: 1440px
- Sidebar(45px) + Header(56px) + 본문(1391px)
- 디자인 시스템: Cosmo Design System (Pretendard 폰트, CSS 변수 기반 토큰)

### 네비게이션 구조

#### MainHeading (탭 바, h=48px, border-bottom)
| 탭 | 상태 | 스타일 |
|----|------|--------|
| 위클리 트렌드 | active | Bold 16px #2c3244, border-bottom 2px |
| 데이터 라이브러리 | inactive | Medium 16px #7e8896 |
| 데이터 수집 안내 ? | 우측 고정 | Regular 14px #7e8896 + 물음표 아이콘 |

#### SubHeading (h=40px)
| 탭 | 상태 | 스타일 |
|----|------|--------|
| 푸드 관심사 | active | Bold 24px #2c3244 |
| 신상텀 | inactive | Regular 24px #7e8896 |
| 데이터 다운로드 | 우측 버튼 | 화살표↓ + Medium 14px, border 1px #dce0e5, radius 6px, h=40px |

### 필터 바 (h=56px, py=8px, px=24px)
| 요소 | 스펙 |
|------|------|
| 기간 SelectMenu | w=300px, h=40px, bg=#f6f7f8, radius=6px, 달력 아이콘, placeholder: "2026년 4월 3주 - 2026년 4월 3주" |
| GSP 카테고리 SelectMenu | w=300px, h=40px, bg=#f6f7f8, radius=6px, chevron 아이콘, placeholder: "GSP 카테고리" |
| 정렬 토글 | 우측 고정, "최신 날짜순 \| 반응량 높은순", Bold/Regular 14px, ? 아이콘 |

---

### Section 1: 급상승 관심사

#### 섹션 타이틀 (h=89px)
- 좌측: 🔥 아이콘 + **급상승 관심사** (headline2Bold 24px #2c3244)
- 서브: "SNS 언급량 기준 빠르게 성장 중인 K-푸드 관심사" (body2Regular 14px #7e8896)
- 우측: "트렌드 키워드 TOP 1 / 다이어트 레시피" + [🏆 키워드 랭킹] 버튼

#### 카드 그리드
- 7열 그리드 (gap 없음, card width ≈178px)
- 2행 × 7열 = 14개 카드
- 각 카드 높이 ≈560px

#### Card/Post (급상승 관심사)
```
┌─────────────────────────────────┐
│ [채널 로고] [⚡급상승]    [🔖] │  ← stacked_badge (top)
│                                 │
│         [썸네일 이미지]         │  ← aspect 268:476 (portrait)
│                                 │
│                        [Noodle] │  ← badge_GSP (bottom-right)
├─────────────────────────────────┤
│ ♥ 102.5K  💬 97.2K             │  ← reaction_bar (h=40px)
├─────────────────────────────────┤
│ [▒▒▒▒▒▒▒▒▒▒▒ 스파크라인] │  ← graph_index (h=48px, bg=#f6f7f8)
├─────────────────────────────────┤
│ 영문 설명 텍스트 (2줄 말줌임)    │  ← body2Regular 14px #2c3244
│ Dec 25, 2024                    │  ← 12px #7e8896
│ 발효된 모든 것, 김치 라면         │  ← caption1Regular 12px #1e6eff (3줄)
└─────────────────────────────────┘
```

**배지 규칙:**
- 채널 로고: TikTok 원형 24px (bg #2c3244)
- 급상승 배지: bg #1e6eff, ⚡ 아이콘 16px + "급상승" Medium 14px 흰색, pill 형태
- GSP 배지: 우하단, bg rgba(10,10,10,0.7), Regular 14px 흰색, pill
- 북마크: 우상단 40x40 hit area, drop shadow

---

### Section 2: SNS 관심사

#### 섹션 타이틀 (h=60px)
- **SNS 관심사** (headline2Bold 24px #2c3244) + **1,402개** (Regular 14px #7e8896)

#### 카드 그리드
- 7열 그리드
- 3행 × 7열 = 21개 카드
- 각 카드 높이 ≈512px

#### Card/Post (SNS 관심사) — 급상승 관심사 카드와의 차이
- **graph_index 없음** (트렌드 스파크라인 미표시)
- **급상승 배지 없음** (채널 로고만 표시)
- 카드 높이가 약 48px 더 낮음

---

## 화면 2: 카드 상세 모달

### 오버레이 구조
- 배경 어두워짐(backdrop) + 모달 (흰색, rounded)
- 닫기 버튼(X) 우상단 원형

### 모달 레이아웃 (좌우 분할)
```
┌──────────────────────────────────────────────────────┐
│  [썸네일 이미지 전체]  │  [게시물 정보]              │ [X]
│                        │                              │
│  (좌측: 이미지 전체화면) │  [유저 아바타] [username]  │
│                        │  [... 더보기]               │
│                        │                              │
│                        │  [게시물 원문 텍스트]        │
│                        │  (영문 본문 + 해시태그)      │
│                        │  {description placeholder}  │
│                        │                              │
│                        │  🌐 번역 보기 (한국어)       │
│                        │                              │
│                        │  ♥ 1.8K  💬 48  Apr 11, 2026│
│                        │                              │
│                        │  Emerging                    │
│                        │  [🎵TikTok][⚡급상승]       │
│                        │  [시즌 한정 콜라보 디저트]   │
│                        │  [과일 디저트]               │
│                        │                              │
│                        │  [트렌드 라인 차트]          │
│                        │  (주별 x축, Sales$ y축)     │
│                        │                              │
│                        │  [🔖 저장]  [↗ 게시물 이동] │
└──────────────────────────────────────────────────────┘
```

### 모달 상세 요소

| 요소 | 내용 |
|------|------|
| 유저 정보 | 아바타 + username (e.g. clojorgg) + 더보기(...) |
| 게시물 원문 | 영문 캡션 + 해시태그 + {description} placeholder |
| 번역 | "번역 보기 (한국어)" — 파란색 링크 |
| 반응 | ♥ 1.8K, 💬 48, 날짜: Apr 11, 2026 |
| 트렌드 상태 | "Emerging" 텍스트 |
| 채널/태그 배지 | TikTok 로고 + ⚡급상승 + 관심사 키워드 pills |
| 트렌드 차트 | 라인 차트, x축: 주차별(Jan W3~Mar W3), y축: Sales($) |
| 하단 CTA | [저장] 버튼, [게시물 이동] 버튼 (외부 링크) |

---

## 디자인 시스템 토큰 요약

### 색상
| 용도 | 값 |
|------|-----|
| Text Default | #2c3244 |
| Text Secondary | #7e8896 |
| Text Tertiary | #bfc6cf |
| Brand Blue | #1e6eff |
| Border Default | #dce0e5 |
| Background Gray | #f6f7f8 |
| Semi-transparent dark | rgba(10,10,10,0.7) |

### 타이포그래피
| 스타일 | Size | Weight | Line-height |
|--------|------|--------|-------------|
| headline2Bold | 24px | Bold | 1.5 |
| headline2Regular | 24px | Regular | 1.5 |
| label1Bold | 16px | Bold | 100% |
| label1Medium | 16px | Medium | 100% |
| label2Medium | 14px | Medium | 100% |
| label2Regular | 14px | Regular | 100% |
| body2Regular | 14px | Regular | 1.5 |
| title3Bold | 14px | Bold | 1.5 |
| title3Regular | 14px | Regular | 1.5 |
| caption1Regular | 12px | Regular | 1.5 |
| caption1Bold | 12px | Bold | 1.5 |
| label3Regular | 12px | Regular | 100% |

### 간격 (Space Tokens)
| 토큰 | 값 |
|------|-----|
| space-050 | 2px |
| space-100 | 4px |
| space-200 | 8px |
| space-300 | 12px |
| space-400 | 16px |
| space-600 | 24px |

### 반경 (Radius Tokens)
| 토큰 | 값 |
|------|-----|
| radius-100 | 4px |
| radius-150 | 6px |
| radius-200 | 8px |
| radius-full | 9999px (pill) |

---

## 기존 PRD 분석
- Notion 미연결로 기존 PRD 없음
- 기획 Input: "사용자가 KTR의 위클리에서 푸드 관심사 정보를 확인할 수 있다" (1줄)
- Figma 2개 화면이 유일한 기획 자료

## 보완 필요 항목 (Clarification 필요)
1. 데이터 출처/API
2. "KTR 위클리" 기간 단위 정의
3. 필터 동작 방식 (서버사이드/클라이언트사이드)
4. 카드 클릭 시 모달 vs 페이지 이동
5. 북마크 동작
6. "게시물 이동" 외부 링크 대상
7. 페이지네이션 방식
8. 급상승 판단 기준
9. 번역 기능 구현 방식
10. 트렌드 차트 데이터 정의
11. 기술 스택
12. 기존 화면 수정인지 신규 화면인지
