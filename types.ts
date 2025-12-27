
export interface UserProfile {
  capital: 'under1' | '1to5' | '6to10' | 'above10';
  experience: 'beginner' | 'intermediate' | 'expert';
  interest: string; // 단일 선택으로 변경
  logistics: 'home' | 'small' | 'warehouse';
  certification: boolean;
  trendSensitivity: number; // 1-10
  phoneModel: 'iphone' | 'galaxy';
  startMonth: number; // 1-12
  targetAge: 'teens' | '20s' | '30s' | '40s' | 'all';
}

export interface KeywordPair {
  traditional: string;
  simplified: string;
  korean: string;
}

export interface Recommendation {
  categoryName: string;
  categoryTraditional: string;
  categorySimplified: string;
  nicheKeywords: KeywordPair[]; 
  description: string;
  logic: string;
  potentialProfit: number; // Percentage
  riskLevel: '낮음' | '보통' | '높음';
  imageUrl?: string;
  photographyTip: string;
  photographyDifficulty: '쉬움' | '보통' | '어려움';
}
