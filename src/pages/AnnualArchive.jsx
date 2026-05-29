import { useState } from 'react';
import { ChevronDown, MessageSquare, Send, Loader } from 'lucide-react';
import { useWeeklyData } from '../hooks/useWeeklyData';

export default function AnnualArchive() {
  const { data, loading, error } = useWeeklyData();
  const [filterMember, setFilterMember] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [selected, setSelected] = useState(null); // member name
  const [feedbacks, setFeedbacks] = useState({});
  const [draftFeedback, setDraftFeedback] = useState('');

  const members = data?.members || [];

  // Collect all unique projects from data
  const allProjects = [...new Set(members.flatMap(m => [
    ...m.prevWeek.map(t => t.project),
    ...m.thisWeek.map(t => t.project),
  ]))].filter(Boolean).sort();

  const displayMembers = filterMember === 'all'
    ? members
    : members.filter(m => m.name === filterMember);

  function handleRowClick(name) {
    setSelected(selected === name ? null : name);
    setDraftFeedback(feedbacks[name] || '');
  }

  function saveFeedback() {
    if (!selected) return;
    setFeedbacks(prev => ({ ...prev, [selected]: draftFeedback }));
  }

  const selectedMember = selected ? members.find(m => m.name === selected) : null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold text-gray-800">주간 업무 현황</h1>
        {data && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{data.sheetName}주차</span>}
        <div className="flex items-center gap-2 ml-2">
          <Filter label="팀원" value={filterMember} onChange={setFilterMember}
            options={[{ value: 'all', label: '전체' }, ...members.map(m => ({ value: m.name, label: m.name }))]}
          />
          <Filter label="프로젝트" value={filterProject} onChange={setFilterProject}
            options={[{ value: 'all', label: '전체' }, ...allProjects.map(p => ({ value: p, label: p }))]}
          />
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center gap-3 text-gray-400">
          <Loader size={24} className="animate-spin" />
          <span className="text-sm">Google Sheets 데이터 불러오는 중...</span>
        </div>
      )}
      {error && (
        <div className="m-6 text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">
          연결 오류: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
          {/* Main grid */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
            <div className="p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">팀원별 주간 업무 매트릭스 ({data?.sheetName}주차)</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap w-28">담당자</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 border-b border-gray-200">지난주 업무</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-indigo-500 border-b border-gray-200">금주 계획</th>
                    <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500 border-b border-gray-200 w-16">건수</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMembers.map((member, mi) => {
                    const prevFiltered = filterProject === 'all' ? member.prevWeek : member.prevWeek.filter(t => t.project === filterProject);
                    const thisFiltered = filterProject === 'all' ? member.thisWeek : member.thisWeek.filter(t => t.project === filterProject);
                    if (filterProject !== 'all' && !prevFiltered.length && !thisFiltered.length) return null;
                    const isSelected = selected === member.name;

                    return (
                      <tr
                        key={member.name}
                        onClick={() => handleRowClick(member.name)}
                        className={`cursor-pointer border-b border-gray-100 transition-colors
                          ${mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                          ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200 ring-inset' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-800">{member.name}</p>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-col gap-1">
                            {prevFiltered.map((t, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0 mt-0.5 whitespace-nowrap">{t.project}</span>
                                <span className="text-xs text-gray-600">{t.content}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-col gap-1">
                            {thisFiltered.map((t, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5 whitespace-nowrap">{t.project}</span>
                                <span className="text-xs text-gray-700">{t.content}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center align-top">
                          <span className="text-xs font-bold text-indigo-500">{member.thisWeek.length}건</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down: feedback panel */}
          {selectedMember && (
            <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">{selectedMember.name} — {data?.sheetName}주차 피드백</p>
                  <p className="text-xs text-gray-400">지난주 {selectedMember.prevWeek.length}건 · 금주 {selectedMember.thisWeek.length}건</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare size={16} className="text-indigo-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 mb-1.5">팀장 피드백</p>
                  {feedbacks[selectedMember.name] && (
                    <div className="mb-2 bg-green-50 border border-green-100 rounded-md px-3 py-2 text-sm text-gray-700">
                      {feedbacks[selectedMember.name]}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draftFeedback}
                      onChange={e => setDraftFeedback(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveFeedback()}
                      placeholder={`${selectedMember.name}님에게 피드백을 입력하세요...`}
                      className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={saveFeedback}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <Send size={13} />
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Filter({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pl-2.5 pr-7 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
