// Parse the sheet's side-by-side layout into structured member data
// Layout: [팀원, 프로젝트, 주요업무(지난주), "", 팀원, 프로젝트, 주요업무(금주)]

export function parseWeeklySheet(rawRows) {
  // Row 0 is the header row — skip it; data starts at row 1
  // Also skip any row where 팀원 column literally says "팀원" (merged header cells)
  const dataRows = rawRows.slice(1).filter(r => r[0]?.trim() !== '팀원' && r[4]?.trim() !== '팀원');

  const memberMap = {}; // name -> { prevWeek: [], thisWeek: [] }

  for (const row of dataRows) {
    const [prevName, prevProject, prevContent, , thisName, thisProject, thisContent] = row;

    // Left side (지난주)
    if (prevName?.trim()) {
      const name = prevName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (prevProject?.trim() || prevContent?.trim()) {
        memberMap[name].prevWeek.push({
          project: prevProject?.trim() || '',
          content: prevContent?.trim() || '',
        });
      }
    }

    // Right side (금주)
    if (thisName?.trim()) {
      const name = thisName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (thisProject?.trim() || thisContent?.trim()) {
        memberMap[name].thisWeek.push({
          project: thisProject?.trim() || '',
          content: thisContent?.trim() || '',
        });
      }
    }
  }

  return Object.values(memberMap);
}
