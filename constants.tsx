
export const INTEREST_OPTIONS = [
  { label: '생활 & 인테리어', value: 'living' },
  { label: '패션 & 잡화', value: 'fashion' },
  { label: '문구 & 팬시', value: 'stationery' },
  { label: '주방 용품', value: 'kitchen' },
  { label: '스포츠 & 아웃도어', value: 'sports' },
  { label: '뷰티 & 헬스', value: 'beauty' },
  { label: '반려동물 용품', value: 'pet' },
  { label: '디지털 & 가전', value: 'tech' }
];

export const CATEGORY_MAPPINGS: Record<string, any> = {
  stationery: {
    name: '문구/사무용품',
    traditional: '文具用品',
    simplified: '文具用品',
  },
  living: {
    name: '생활용품/인테리어',
    traditional: '家居用品',
    simplified: '家居用品',
  },
  kitchen: {
    name: '주방용품',
    traditional: '廚房用品',
    simplified: '厨房用品',
  },
  sports: {
    name: '스포츠/레저',
    traditional: '運動戶外',
    simplified: '运动户外',
  },
  fashion: {
    name: '패션잡화/액세서리',
    traditional: '服飾配件',
    simplified: '服饰配件',
  }
};
