# 📊 주식 컨센서스 예측 분석 대시보드

증권사/애널리스트의 주식 목표가 예측 데이터를 수집·분석하여, 각 증권사가 어느 정도로 낙관적/보수적으로 예측하는지를 시각화하는 인터랙티브 대시보드입니다.

🌐 **GitHub Pages 대시보드 URL**: [https://eljja.github.io/Consensus/](https://eljja.github.io/Consensus/)

## 🎯 주요 기능

- **주가 + 목표가 타임라인**: 실제 주가 위에 증권사별 목표가를 산점도로 표시
- **증권사별 Bias 랭킹**: 목표가 괴리율 기준 증권사 정렬
- **증권사 × 종목 히트맵**: 증권사가 어떤 종목에 특히 낙관적/보수적인지 파악
- **예측 정확도 트렌드**: 시간에 따른 예측 성향 변화 추적

## 📈 대상 종목 (20개)

### 🇺🇸 US (10)
AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, LLY, AVGO, JPM

### 🇰🇷 KR (10)
삼성전자, SK하이닉스, LG에너지솔루션, 삼성바이오로직스, 현대차, 셀트리온, POSCO홀딩스, NAVER, 기아, 카카오

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
git add data.json
git commit -m "update: latest consensus data"
git push origin main
```

## 📁 프로젝트 구조

```
├── index.html           # 대시보드 메인 페이지 (GitHub Pages)
├── style.css            # 다크모드 글래스모피즘 스타일
├── app.js               # ApexCharts 기반 차트 렌더링
├── data.json            # 분석 데이터 (GitHub Pages용)
├── fetch_data.py        # 데이터 수집 + 분석 스크립트
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
