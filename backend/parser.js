// Parse the sheet's side-by-side layout into structured member data
// Layout: A:팀원 B:프로젝트 C:카테고리 D:업무내용 E:구분 F:팀원 G:프로젝트 H:카테고리 I:업무내용

export function parseWeeklySheet(rawRows) {
  // 헤더 행 건너뜀: '팀원' 또는 '이번 주' 등 컬럼 헤더 행 제외
  const SKIP = ['팀원', '이번 주', '다음 주', '이번주', '다음주'];
  const dataRows = rawRows.filter(r => {
    const c0 = r[0]?.trim() || '';
    return c0 !== '' && !SKIP.some(s => c0.includes(s));
  });

  const memberMap = {};
  for (const row of dataRows) {
    const [prevName, prevProject, prevCategory, prevContent, , thisName, thisProject, thisCategory, thisContent] = row;

    if (prevName?.trim()) {
      const name = prevName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (prevProject?.trim() || prevContent?.trim()) {
        memberMap[name].prevWeek.push({
          project: prevProject?.trim() || '',
          category: prevCategory?.trim() || '',
          content: prevContent?.trim() || '',
        });
      }
    }
    if (thisName?.trim()) {
      const name = thisName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (thisProject?.trim() || thisContent?.trim()) {
        memberMap[name].thisWeek.push({
          project: thisProject?.trim() || '',
          category: thisCategory?.trim() || '',
          content: thisContent?.trim() || '',
        });
      }
    }
  }
  return Object.values(memberMap);
}
