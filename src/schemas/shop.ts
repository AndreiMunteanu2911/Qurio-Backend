export type ShopItemType = 'power-up' | 'accent' | 'title' | 'card-skin' | 'avatar-border' | 'exam-theme';

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: ShopItemType;
  consumable: boolean;
};

export const SHOP_ITEMS: ShopItem[] = [
  // ── Power-ups ──
  { id: 'hint', name: 'Hint', description: 'Reveals one wrong option on the current question.', cost: 50, type: 'power-up', consumable: true },
  { id: 'skip', name: 'Skip', description: 'Skip the current question without penalty.', cost: 75, type: 'power-up', consumable: true },
  { id: 'second_chance', name: 'Second Chance', description: 'Retry one wrong question at the end of the exam.', cost: 100, type: 'power-up', consumable: true },
  { id: 'streak_freeze', name: 'Streak Freeze', description: 'Protects your streak for one inactive day.', cost: 150, type: 'power-up', consumable: true },
  { id: 'double_xp', name: 'Double XP', description: '2x XP on your next exam completion.', cost: 200, type: 'power-up', consumable: true },

  // ── Accent Colors ──
  { id: 'accent_gold', name: 'Gold Accent', description: 'Unlocks a gold color scheme.', cost: 500, type: 'accent', consumable: false },
  { id: 'accent_rose', name: 'Rose Accent', description: 'Unlocks a rose pink color scheme.', cost: 500, type: 'accent', consumable: false },
  { id: 'accent_emerald', name: 'Emerald Accent', description: 'Unlocks an emerald green color scheme.', cost: 500, type: 'accent', consumable: false },
  { id: 'accent_sapphire', name: 'Sapphire Accent', description: 'Unlocks a sapphire blue color scheme.', cost: 500, type: 'accent', consumable: false },
  { id: 'accent_amber', name: 'Amber Accent', description: 'Unlocks an amber orange color scheme.', cost: 500, type: 'accent', consumable: false },

  // ── Profile Titles ──
  { id: 'title_scholar', name: 'Title: The Scholar', description: 'Display "The Scholar" on your profile.', cost: 300, type: 'title', consumable: false },
  { id: 'title_streak_master', name: 'Title: Streak Master', description: 'Display "Streak Master" on your profile.', cost: 400, type: 'title', consumable: false },
  { id: 'title_quiz_sage', name: 'Title: Quiz Sage', description: 'Display "Quiz Sage" on your profile.', cost: 600, type: 'title', consumable: false },
  { id: 'title_knowledge_seeker', name: 'Title: Knowledge Seeker', description: 'Display "Knowledge Seeker" on your profile.', cost: 250, type: 'title', consumable: false },
  { id: 'title_prodigy', name: 'Title: The Prodigy', description: 'Display "The Prodigy" on your profile.', cost: 700, type: 'title', consumable: false },
  { id: 'title_grade_a', name: 'Title: Grade A+', description: 'Display "Grade A+" on your profile.', cost: 350, type: 'title', consumable: false },
  { id: 'title_deans_list', name: 'Title: Dean\'s List', description: 'Display "Dean\'s List" on your profile.', cost: 450, type: 'title', consumable: false },
  { id: 'title_champion', name: 'Title: Quiz Champion', description: 'Display "Quiz Champion" on your profile.', cost: 800, type: 'title', consumable: false },

  // ── Card Skins ──
  { id: 'skin_minimal', name: 'Card Skin: Minimal', description: 'Cleaner cards with thinner borders.', cost: 350, type: 'card-skin', consumable: false },
  { id: 'skin_gradient', name: 'Card Skin: Gradient', description: 'Cards get a violet-to-cyan gradient border.', cost: 450, type: 'card-skin', consumable: false },
  { id: 'skin_neon', name: 'Card Skin: Neon', description: 'Cards glow with a neon edge.', cost: 550, type: 'card-skin', consumable: false },
  { id: 'skin_glass', name: 'Card Skin: Glass', description: 'Frosted glass card appearance.', cost: 500, type: 'card-skin', consumable: false },
  { id: 'skin_classic', name: 'Card Skin: Classic', description: 'Original solid card look.', cost: 200, type: 'card-skin', consumable: false },

  // ── Avatar Borders ──
  { id: 'border_thin_gold', name: 'Border: Thin Gold', description: 'A thin gold ring around your avatar.', cost: 300, type: 'avatar-border', consumable: false },
  { id: 'border_glow_violet', name: 'Border: Violet Glow', description: 'A glowing violet aura around your avatar.', cost: 400, type: 'avatar-border', consumable: false },
  { id: 'border_double_ring', name: 'Border: Double Ring', description: 'Two concentric rings around your avatar.', cost: 450, type: 'avatar-border', consumable: false },
  { id: 'border_dashed_cyan', name: 'Border: Dashed Cyan', description: 'A dashed cyan ring around your avatar.', cost: 350, type: 'avatar-border', consumable: false },
  { id: 'border_starburst', name: 'Border: Starburst', description: 'A radiant starburst effect around your avatar.', cost: 600, type: 'avatar-border', consumable: false },

  // ── Exam Themes ──
  { id: 'theme_midnight', name: 'Theme: Midnight', description: 'Deep blue tones replace violet in exam backgrounds.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_sunset', name: 'Theme: Sunset', description: 'Warm orange-pink tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_forest', name: 'Theme: Forest', description: 'Deep green tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_ocean', name: 'Theme: Ocean', description: 'Deep teal tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_galaxy', name: 'Theme: Galaxy', description: 'Purple-blue gradient backgrounds during exams.', cost: 600, type: 'exam-theme', consumable: false },
];

export const SHOP_ITEMS_MAP = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
