# 📊 주식 컨센서스 예측 분석 대시보드

증권사/애널리스트의 주식 목표가 예측 데이터를 전수 수집·분석하여, 각 증권사가 어느 정도로 낙관적/보수적으로 예측했는지 주가 흐름과 비교 시각화하는 인터랙티브 대시보드입니다.

🌐 **GitHub Pages 대시보드 URL**: [https://eljja.github.io/Consensus/](https://eljja.github.io/Consensus/)

## 🎯 주요 기능

- **종목 검색 및 간편 전환**: 총 40개 대표 종목(미국 20개 + 한국 20개) 실시간 검색 및 필터링
- **주가 + 목표가 타임라인**: 실제 주가 추세선 위에 증권사별 목표가를 시점별 산점도로 표시 (마우스 호버 시 상세 정보)
- **증권사별 Bias 랭킹**: 현재/과거 목표가 괴리율 기준 증권사 정렬 (과대 긍정적 / 보수적)
- **증권사 × 종목 히트맵**: 증권사별로 특정 종목에 대해 어떤 예측 성향을 보였는지 매트릭스 시각화
- **예측 정확도 트렌드**: 시간에 따른 증권사별 평균 오차율 추이
- **전수 리포트 목록**: 검색, 정렬, 페이징 지원 상세 표

## 📈 대상 종목 (총 40개)

### 🇺🇸 US 대표 종목 (20개)
AAPL (Apple), MSFT (Microsoft), NVDA (NVIDIA), AMZN (Amazon), GOOGL (Alphabet), META (Meta), TSLA (Tesla), LLY (Eli Lilly), AVGO (Broadcom), JPM (JPMorgan Chase), WMT (Walmart), V (Visa), MA (Mastercard), NFLX (Netflix), AMD (Advanced Micro Devices), DIS (Walt Disney), ORCL (Oracle), COST (Costco), PEP (PepsiCo), KO (Coca-Cola)

### 🇰🇷 KR 대표 종목 (20개)
삼성전자, SK하이닉스, LG에너지솔루션, 삼성바이오로직스, 현대차, 셀트리온, POSCO홀딩스, NAVER, 기아, 카카오, KB금융, 신한지주, 삼성화재, 현대모비스, LG화학, 삼성SDI, 삼성물산, 삼성생명, 한국전력, 두산에너빌리티

## 🚀 GitHub Pages 배포 설정

1. GitHub 저장소 ([https://github.com/eljja/Consensus](https://github.com/eljja/Consensus))로 이동
2. **Settings** → **Pages** 탭 클릭
3. **Build and deployment** > **Source**를 `Deploy from a branch`로 설정
4. **Branch**를 `main` / `/ (root)` 선택 후 **Save** 클릭
5. 1~2분 후 `https://eljja.github.io/Consensus/` 에서 서비스가 활성화됩니다.

## 🔄 데이터 업데이트 시 (로컬)

```bash
pip install -r requirements.txt
python fetch_data.py
git add data.json README.md index.html app.js fetch_data.py
git commit -m "update: 40 stocks consensus dataset"
$env:GITHUB_TOKEN=""; git push origin main
```

## 📁 프로젝트 구조

```
├── index.html           # 대시보드 메인 페이지 (GitHub Pages)
├── style.css            # 다크모드 글래스모피즘 스타일
├── app.js               # ApexCharts 기반 차트 렌더링 & 실시간 검색
├── data.json            # 전수 분석 데이터 (GitHub Pages용)
├── fetch_data.py        # 40개 종목 멀티스레드 데이터 수집 + 분석 스크립트
├── requirements.txt     # Python 의존성
└── README.md
```

## 📊 데이터 소스

| 소스 | 데이터 | 기간 |
|------|--------|------|
| yfinance | US 주가 + 애널리스트 목표가 | 2012~ |
| 네이버 금융 | KR 애널리스트 목표가 + 투자의견 | 2007~ |
| 한경 컨센서스 | KR 애널리스트 목표가 (보충) | 2025.06~ |

## 📐 Bias 계산 방식

- **Current Bias (현재 괴리율)**: `(목표가 - 현재가) / 현재가 × 100%`
- **Realized Bias (실현 괴리율)**: `(목표가 - 12개월 후 실제가) / 12개월 후 실제가 × 100%`

### 성향 분류

| 카테고리 | 기준 |
|----------|------|
| 🔴 과대 긍정적 | Bias > 30% |
| 🟠 긍정적 | 15% < Bias ≤ 30% |
| 🟢 적정 | -15% ≤ Bias ≤ 15% |
| 🔵 보수적 | Bias < -15% |

## ⚠️ 면책 사항

이 프로젝트의 분석 결과는 참고용이며 투자 권유가 아닙니다.
