// Mock data — replace with Google Sheets API integration
export const TEAM_MEMBERS = [
  { id: 1, name: '김민수', part: '개발', avatar: '👨‍💻' },
  { id: 2, name: '박영희', part: '디자인', avatar: '🎨' },
  { id: 3, name: '이준혁', part: '기획', avatar: '📊' },
  { id: 4, name: '최수진', part: '개발', avatar: '👩‍💻' },
  { id: 5, name: '정다은', part: '디자인', avatar: '✏️' },
];

export const PROJECTS = [
  { id: 'idol', name: '아이돌 2.1', progress: 85, color: '#0052cc' },
  { id: 'postmath', name: '포스트매스', progress: 60, color: '#6554c0' },
  { id: 'airpen', name: 'AI 녹음펜', progress: 40, color: '#ff5630' },
  { id: 'subweb', name: '서브 웹', progress: 75, color: '#00875a' },
];

// Status: 'done' | 'working' | 'stuck' | 'pending'
function makeTask(memberId, weekCode, project, status, prevWork, thisWeek) {
  return { memberId, weekCode, project, status, prevWork, thisWeek, feedback: '' };
}

const wc = (y, w) => `${y}-W${String(w).padStart(2, '0')}`;

export const TASKS = [
  // 김민수
  makeTask(1, wc(2026,17), '아이돌 2.1', 'done', '하단 탭 네비게이션 UI 구조 개선', '앱 QA 리포트 기반 버그 수정'),
  makeTask(1, wc(2026,18), '아이돌 2.1', 'done', '앱 QA 리포트 기반 버그 수정', '스토어 심사 준비 및 배포'),
  makeTask(1, wc(2026,19), 'AI 녹음펜', 'working', 'QA 단계 버그 다수 대응', 'AI 녹음펜 핵심 버그 긴급 수정'),
  makeTask(1, wc(2026,20), 'AI 녹음펜', 'stuck', '핵심 버그 수정 진행 중', 'QA 리테스트 및 재배포 준비'),
  makeTask(1, wc(2026,21), '아이돌 2.1', 'done', '재배포 성공', '성능 모니터링 및 이슈 트래킹'),
  makeTask(1, wc(2026,22), '포스트매스', 'done', '성능 모니터링 완료', '포스트매스 API 연동 작업'),

  // 박영희
  makeTask(2, wc(2026,17), '아이돌 2.1', 'done', '앱 가이드 UI 시안 작업', '앱 가이드 배포 최종 디자인'),
  makeTask(2, wc(2026,18), '아이돌 2.1', 'pending', '앱 가이드 배포 완료', '스토어 스크린샷 갱신'),
  makeTask(2, wc(2026,19), '서브 웹', 'done', '서브 웹 업데이트 디자인', '랜딩 페이지 최종 시안'),
  makeTask(2, wc(2026,20), '서브 웹', 'done', '랜딩 페이지 개발 전달', '유입 리드 분석 및 UX 개선'),
  makeTask(2, wc(2026,21), '포스트매스', 'working', 'UX 개선 반영', '포스트매스 대시보드 UI 설계'),
  makeTask(2, wc(2026,22), '포스트매스', 'done', '대시보드 UI 시안 완료', '컴포넌트 정리 및 핸드오프'),

  // 이준혁
  makeTask(3, wc(2026,17), '아이돌 2.1', 'done', '5월 주간 보고 자동화 기획', '주간 보고 시스템 요구사항 정의'),
  makeTask(3, wc(2026,18), 'AI 녹음펜', 'stuck', '요구사항 정의 완료', 'AI 녹음펜 QA 이슈 리스크 분석'),
  makeTask(3, wc(2026,19), 'AI 녹음펜', 'working', 'QA 리스크 분석 공유', '이슈 대응 시나리오 작성'),
  makeTask(3, wc(2026,20), '포스트매스', 'done', '이슈 시나리오 작성 완료', '포스트매스 기능 로드맵 정리'),
  makeTask(3, wc(2026,21), '포스트매스', 'done', '로드맵 정리 및 공유', 'Q3 OKR 초안 작성'),
  makeTask(3, wc(2026,22), '서브 웹', 'done', 'OKR 초안 공유', '서브 웹 콘텐츠 전략 수립'),

  // 최수진
  makeTask(4, wc(2026,17), '서브 웹', 'done', '서브 웹 퍼블리싱 작업', '서브 웹 런칭 및 배포'),
  makeTask(4, wc(2026,18), '서브 웹', 'done', '서브 웹 런칭 완료', '유입 증가 모니터링'),
  makeTask(4, wc(2026,19), 'AI 녹음펜', 'stuck', '모니터링 보고서 작성', 'AI 녹음펜 QA 버그 수정 지원'),
  makeTask(4, wc(2026,20), 'AI 녹음펜', 'working', 'QA 버그 수정 진행', 'AI API 연동 테스트'),
  makeTask(4, wc(2026,21), '아이돌 2.1', 'done', 'AI API 연동 완료', '아이돌 2.1 신규 기능 개발'),
  makeTask(4, wc(2026,22), '아이돌 2.1', 'done', '신규 기능 개발 완료', '코드 리뷰 및 테스트 커버리지'),

  // 정다은
  makeTask(5, wc(2026,17), '포스트매스', 'working', '포스트매스 아이콘 시스템 작업', '아이콘 시스템 가이드 문서화'),
  makeTask(5, wc(2026,18), '포스트매스', 'done', '아이콘 가이드 완료', '포스트매스 모바일 UI 시안'),
  makeTask(5, wc(2026,19), '아이돌 2.1', 'done', '모바일 UI 핸드오프', '아이돌 2.1 위젯 디자인'),
  makeTask(5, wc(2026,20), '아이돌 2.1', 'done', '위젯 디자인 완료', '위젯 개발 지원 및 QA'),
  makeTask(5, wc(2026,21), 'AI 녹음펜', 'pending', 'QA 피드백 반영', 'AI 녹음펜 UI 가이드 보완'),
  makeTask(5, wc(2026,22), 'AI 녹음펜', 'working', 'UI 가이드 보완 중', '배포 전 최종 검수'),
];

export const HIGHLIGHTS = {
  [wc(2026,22)]: [
    '아이돌 2.1 앱 가이드 배포 완료',
    '서브 웹 업데이트 후 유입 리드 증가',
    '포스트매스 대시보드 UI 핸드오프 완료',
    '코드 리뷰 체계 개선 도입',
  ],
};

export const CRITICAL_ISSUES = {
  [wc(2026,22)]: [
    { project: 'AI 녹음펜', issue: 'QA 단계 버그 다수 발생 — 배포 일정 1주 지연 위험' },
    { project: '포스트매스', issue: 'API 응답 속도 저하 — 성능 개선 필요' },
  ],
};

export const RESOURCE_DISTRIBUTION = {
  [wc(2026,22)]: { design: 40, dev: 40, plan: 20 },
};

// Generate week list for 2026
export function getWeeksOf2026() {
  const weeks = [];
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 11, 31);
  let d = new Date(start);
  // Move to first Monday
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);

  let weekNum = 1;
  while (d <= end) {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const code = `2026-W${String(weekNum).padStart(2, '0')}`;
    weeks.push({ code, label: `2026년 ${month}월 ${weekNum}주차 (${month}/${day})`, weekNum, month });
    d.setDate(d.getDate() + 7);
    weekNum++;
  }
  return weeks;
}
