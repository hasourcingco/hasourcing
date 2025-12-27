
import React, { useState } from 'react';
import { UserProfile, Recommendation } from './types';
import { INTEREST_OPTIONS } from './constants';
import { getDeepRecommendation, generateProductImage } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile>({
    capital: 'under1',
    experience: 'beginner',
    interest: '', // 단일 선택을 위해 문자열로 변경
    logistics: 'small',
    certification: false,
    trendSensitivity: 5,
    phoneModel: 'galaxy',
    startMonth: new Date().getMonth() + 1,
    targetAge: '20s',
  });
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const startDiagnosis = () => setStep(2);

  const handleProfileChange = (key: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleInterestSelect = (interestValue: string) => {
    setProfile(prev => ({ ...prev, interest: interestValue }));
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const rec = await getDeepRecommendation(profile);
      const imageUrl = await generateProductImage(rec.categoryName);
      setRecommendation({ ...rec, imageUrl: imageUrl || undefined });
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const copyKeyword = async (keyword: string) => {
    try {
      await navigator.clipboard.writeText(keyword);
      alert(`키워드 [${keyword}] 가 복사되었습니다.\n1688.com 검색창에 붙여넣어주세요.`);
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
  };

  const resetDiagnosis = () => {
    setStep(1);
    setRecommendation(null);
  };

  const shareResults = async () => {
    if (!recommendation) return;
    const shareText = `[1688 Insight Architect] 추천 카테고리 진단\n\n🎯 추천: ${recommendation.categoryName}\n💡 분석: ${recommendation.description}\n\n결과 확인: ${window.location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '1688 수입 진단 결과', text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('분석 결과가 클립보드에 복사되었습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = [
    { name: '수익성', value: recommendation?.potentialProfit || 30 },
    { name: '안정성', value: 100 - (recommendation?.riskLevel === '높음' ? 70 : recommendation?.riskLevel === '보통' ? 40 : 20) },
  ];
  const COLORS = ['#f97316', '#3b82f6'];

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-orange-100">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={resetDiagnosis}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-200 group-hover:rotate-6 transition-transform">H</div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight leading-none text-slate-900 uppercase">1688 Insight</span>
              <span className="text-[10px] font-bold text-orange-600 tracking-widest uppercase">Architect</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button onClick={resetDiagnosis} className="text-[11px] font-bold px-4 py-2 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                초기화
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {step === 1 && (
          <div className="text-center animate-fadeIn py-10">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tighter uppercase">
              1688 수입 성공의<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">마스터 플랜</span>
            </h1>
            <p className="text-xl text-slate-500 mb-14 max-w-2xl mx-auto leading-relaxed font-medium">
              불필요한 시행착오를 줄이세요. 시작 월과 타겟층에 맞춘<br/>
              AI 기반 정밀 진단으로 가장 수익성 높은 틈새 시장을 제안합니다.
            </p>
            <div className="flex justify-center mb-20">
              <button onClick={startDiagnosis} className="group relative px-14 py-6 bg-slate-900 hover:bg-orange-600 text-white font-black rounded-3xl shadow-2xl transition-all hover:-translate-y-1">
                진단 시작하기 <span className="ml-3 group-hover:translate-x-2 transition-transform inline-block">→</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-10 text-white relative">
              <h2 className="text-3xl font-black mb-2 tracking-tight uppercase">비즈니스 프로필 설정</h2>
              <p className="text-slate-400 font-medium">성공적인 수입을 위해 6가지 핵심 정보를 입력해주세요.</p>
            </div>
            
            <div className="p-10 space-y-12">
              <section>
                <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-sm font-black">01</span>
                  판매 예정 월
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {months.map(m => (
                    <button key={m} onClick={() => handleProfileChange('startMonth', m)} className={`py-3 rounded-xl border-2 transition-all font-bold ${profile.startMonth === m ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                      {m}월
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-sm font-black">02</span>
                  주력 타겟 연령층
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: '10대', value: 'teens' },
                    { label: '20대', value: '20s' },
                    { label: '30대', value: '30s' },
                    { label: '40대+', value: '40s' },
                    { label: '전연령', value: 'all' }
                  ].map(age => (
                    <button key={age.value} onClick={() => handleProfileChange('targetAge', age.value)} className={`py-4 rounded-xl border-2 transition-all font-bold text-sm ${profile.targetAge === age.value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                      {age.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-sm font-black">03</span>
                  상품 단가 범위 (위안)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['under1', '1to5', '6to10', 'above10'] as const).map(level => (
                    <button key={level} onClick={() => handleProfileChange('capital', level)} className={`py-5 rounded-2xl border-2 transition-all font-bold text-sm ${profile.capital === level ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                      {level === 'under1' ? '1위안 미만' : level === '1to5' ? '1~5위안' : level === '6to10' ? '6~10위안' : '10위안 이상'}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-sm font-black">04</span>
                  관심 분야 선택 (하나만 선택)
                </label>
                <div className="flex flex-wrap gap-3">
                  {INTEREST_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => handleInterestSelect(opt.value)} className={`px-6 py-3 rounded-xl border-2 transition-all font-bold text-sm ${profile.interest === opt.value ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section>
                  <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-sm font-black">05</span>
                    보유 스마트폰
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {(['iphone', 'galaxy'] as const).map(model => (
                      <button key={model} onClick={() => handleProfileChange('phoneModel', model)} className={`py-5 rounded-2xl border-2 transition-all font-bold ${profile.phoneModel === model ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                        {model === 'iphone' ? '🍎 iPhone' : '🌌 Galaxy'}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <label className="text-lg font-black text-slate-800 block mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-sm font-black">06</span>
                    KC 인증 가능성
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleProfileChange('certification', true)} className={`py-5 rounded-2xl border-2 transition-all font-bold ${profile.certification === true ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                      진행 가능
                    </button>
                    <button onClick={() => handleProfileChange('certification', false)} className={`py-5 rounded-2xl border-2 transition-all font-bold ${profile.certification === false ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                      인증 불필요
                    </button>
                  </div>
                </section>
              </div>

              <div className="pt-10">
                <button onClick={runAnalysis} disabled={loading || !profile.interest} className={`w-full py-6 rounded-[2rem] text-white font-black text-xl shadow-2xl transition-all ${loading || !profile.interest ? 'bg-slate-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 transform hover:-translate-y-1'}`}>
                  {loading ? 'AI 시장 분석 중...' : '맞춤형 추천 도출하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && recommendation && (
          <div className="space-y-12 animate-fadeIn">
            {/* Main Result Card */}
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-200 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row gap-16">
                <div className="flex-1 space-y-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[11px] font-black uppercase mb-6 tracking-widest border border-orange-100">
                      추천 항목
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 mb-4 leading-tight">{recommendation.categoryName}</h2>
                    <p className="text-slate-500 font-bold text-lg">1688 대분류: <span className="text-slate-900">{recommendation.categoryTraditional}</span></p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">기대 마진</div>
                      <div className="text-2xl font-black text-orange-600">{recommendation.potentialProfit}%</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">위험 수준</div>
                      <div className="text-2xl font-black text-blue-500">{recommendation.riskLevel}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">촬영 난이도</div>
                      <div className={`text-2xl font-black ${recommendation.photographyDifficulty === '어려움' ? 'text-red-500' : recommendation.photographyDifficulty === '보통' ? 'text-orange-500' : 'text-green-500'}`}>{recommendation.photographyDifficulty}</div>
                    </div>
                  </div>

                  <div className="p-7 bg-slate-900 text-slate-300 rounded-[2rem] text-base leading-relaxed font-medium shadow-xl">
                    {recommendation.description}
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-8">
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-square border-4 border-white">
                    {recommendation.imageUrl ? (
                      <img src={recommendation.imageUrl} alt="Ref" className="w-full h-full object-cover transition-transform hover:scale-105 duration-1000" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 animate-pulse"></div>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center tracking-widest">분석 스코어</div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} innerRadius={45} outerRadius={60} paddingAngle={10} dataKey="value">
                            {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 text-[10px] font-black text-slate-400 uppercase">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 수익성</span>
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 안정성</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Section */}
            <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-xl border border-slate-200">
              <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase">1688 정밀 검색 키워드</h3>
              <div className="space-y-4">
                {recommendation.nicheKeywords.slice(0, 5).map((kw, idx) => (
                  <div key={idx} className="group p-6 bg-slate-50 hover:bg-white rounded-[2rem] border border-slate-100 hover:border-orange-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <span className="w-10 h-10 bg-slate-900 text-white text-sm font-black rounded-2xl flex items-center justify-center">{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{kw.simplified}</span>
                        <span className="text-xs font-bold text-slate-400">의미: {kw.korean}</span>
                      </div>
                    </div>
                    <button onClick={() => copyKeyword(kw.simplified)} className="px-10 py-3.5 bg-white border-2 border-slate-100 text-slate-600 font-black text-xs rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                      키워드 복사
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Photography Section */}
            <div className="bg-slate-900 p-10 md:p-12 rounded-[3.5rem] shadow-2xl text-white relative">
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-3xl mb-8">📸</div>
              <h3 className="text-2xl font-black mb-6 uppercase">{profile.phoneModel === 'iphone' ? 'iPhone' : 'Galaxy'} 특화 촬영 전략</h3>
              <p className="text-xl text-slate-300 leading-relaxed font-bold italic mb-6">"{recommendation.photographyTip}"</p>
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">난이도 스코어:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-6 h-2 rounded-full ${i <= (recommendation.photographyDifficulty === '쉬움' ? 1 : recommendation.photographyDifficulty === '보통' ? 2 : 3) ? 'bg-orange-500' : 'bg-slate-700'}`}></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-5 pt-12 no-print">
              <button onClick={shareResults} className="flex-[2] py-6 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[2.5rem] transition-all flex items-center justify-center gap-4">
                진단 결과 공유하기
              </button>
              <button onClick={() => window.print()} className="flex-1 py-6 bg-slate-900 text-white font-black rounded-[2.5rem] transition-all">
                PDF 저장
              </button>
              <button onClick={resetDiagnosis} className="flex-1 py-6 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-[2.5rem] transition-all">
                다시 진단
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-5 z-40 no-print">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
          <span>Built with Gemini API</span>
          <div className="flex gap-8">
            <a href="#">문서</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideUp { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default App;
