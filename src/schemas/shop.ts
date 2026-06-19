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
  { id: 'accent_crimson', name: 'Crimson Accent', description: 'Unlocks a high-contrast red color scheme.', cost: 650, type: 'accent', consumable: false },
  { id: 'accent_lime', name: 'Lime Accent', description: 'Unlocks a bright electric lime color scheme.', cost: 650, type: 'accent', consumable: false },
  { id: 'accent_orchid', name: 'Orchid Accent', description: 'Unlocks a vivid orchid purple color scheme.', cost: 650, type: 'accent', consumable: false },
  { id: 'accent_ice', name: 'Ice Accent', description: 'Unlocks a sharp arctic blue color scheme.', cost: 650, type: 'accent', consumable: false },

  // ── Profile Titles ──
  { id: 'title_scholar', name: 'Title: The Scholar', description: 'Display "The Scholar" on your profile.', cost: 300, type: 'title', consumable: false },
  { id: 'title_streak_master', name: 'Title: Streak Master', description: 'Display "Streak Master" on your profile.', cost: 400, type: 'title', consumable: false },
  { id: 'title_quiz_sage', name: 'Title: Quiz Sage', description: 'Display "Quiz Sage" on your profile.', cost: 600, type: 'title', consumable: false },
  { id: 'title_knowledge_seeker', name: 'Title: Knowledge Seeker', description: 'Display "Knowledge Seeker" on your profile.', cost: 250, type: 'title', consumable: false },
  { id: 'title_prodigy', name: 'Title: The Prodigy', description: 'Display "The Prodigy" on your profile.', cost: 700, type: 'title', consumable: false },
  { id: 'title_grade_a', name: 'Title: Grade A+', description: 'Display "Grade A+" on your profile.', cost: 350, type: 'title', consumable: false },
  { id: 'title_deans_list', name: 'Title: Dean\'s List', description: 'Display "Dean\'s List" on your profile.', cost: 450, type: 'title', consumable: false },
  { id: 'title_champion', name: 'Title: Quiz Champion', description: 'Display "Quiz Champion" on your profile.', cost: 800, type: 'title', consumable: false },
  { id: 'title_night_owl', name: 'Title: Night Owl', description: 'Display "Night Owl" on your profile.', cost: 500, type: 'title', consumable: false },
  { id: 'title_speedrunner', name: 'Title: Speedrunner', description: 'Display "Speedrunner" on your profile.', cost: 650, type: 'title', consumable: false },
  { id: 'title_brainstorm', name: 'Title: Brainstorm', description: 'Display "Brainstorm" on your profile.', cost: 750, type: 'title', consumable: false },
  { id: 'title_exam_artist', name: 'Title: Exam Artist', description: 'Display "Exam Artist" on your profile.', cost: 900, type: 'title', consumable: false },

  // ── Card Skins ──
  { id: 'skin_minimal', name: 'Card Skin: Minimal', description: 'Cleaner cards with thinner borders.', cost: 350, type: 'card-skin', consumable: false },
  { id: 'skin_gradient', name: 'Card Skin: Gradient', description: 'Cards get a violet-to-cyan gradient border.', cost: 450, type: 'card-skin', consumable: false },
  { id: 'skin_neon', name: 'Card Skin: Neon', description: 'Cards glow with a neon edge.', cost: 550, type: 'card-skin', consumable: false },
  { id: 'skin_glass', name: 'Card Skin: Glass', description: 'Frosted glass card appearance.', cost: 500, type: 'card-skin', consumable: false },
  { id: 'skin_classic', name: 'Card Skin: Classic', description: 'Original solid card look.', cost: 200, type: 'card-skin', consumable: false },
  { id: 'skin_terminal', name: 'Card Skin: Terminal', description: 'Dark cards with green command-line edges.', cost: 650, type: 'card-skin', consumable: false },
  { id: 'skin_hologram', name: 'Card Skin: Hologram', description: 'Iridescent card surfaces with bright edges.', cost: 800, type: 'card-skin', consumable: false },
  { id: 'skin_paper', name: 'Card Skin: Paper', description: 'Warm paper panels with ink-like contrast.', cost: 650, type: 'card-skin', consumable: false },
  { id: 'skin_obsidian', name: 'Card Skin: Obsidian', description: 'Black glass cards with red-hot edges.', cost: 850, type: 'card-skin', consumable: false },

  // ── Avatar Borders ──
  { id: 'border_thin_gold', name: 'Border: Thin Gold', description: 'A thin gold ring around your avatar.', cost: 300, type: 'avatar-border', consumable: false },
  { id: 'border_glow_violet', name: 'Border: Violet Glow', description: 'A glowing violet aura around your avatar.', cost: 400, type: 'avatar-border', consumable: false },
  { id: 'border_double_ring', name: 'Border: Double Ring', description: 'Two concentric rings around your avatar.', cost: 450, type: 'avatar-border', consumable: false },
  { id: 'border_dashed_cyan', name: 'Border: Dashed Cyan', description: 'A dashed cyan ring around your avatar.', cost: 350, type: 'avatar-border', consumable: false },
  { id: 'border_starburst', name: 'Border: Starburst', description: 'A radiant starburst effect around your avatar.', cost: 600, type: 'avatar-border', consumable: false },
  { id: 'border_lime_pulse', name: 'Border: Lime Pulse', description: 'A bright lime pulse around your avatar.', cost: 500, type: 'avatar-border', consumable: false },
  { id: 'border_inferno', name: 'Border: Inferno', description: 'A hot red-orange avatar glow.', cost: 650, type: 'avatar-border', consumable: false },
  { id: 'border_prism', name: 'Border: Prism', description: 'A multi-color prism ring around your avatar.', cost: 700, type: 'avatar-border', consumable: false },
  { id: 'border_ice_shard', name: 'Border: Ice Shard', description: 'A sharp icy blue avatar frame.', cost: 650, type: 'avatar-border', consumable: false },

  // ── Exam Themes ──
  { id: 'theme_midnight', name: 'Theme: Midnight', description: 'Deep blue tones replace violet in exam backgrounds.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_sunset', name: 'Theme: Sunset', description: 'Warm orange-pink tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_forest', name: 'Theme: Forest', description: 'Deep green tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_ocean', name: 'Theme: Ocean', description: 'Deep teal tones during exams.', cost: 500, type: 'exam-theme', consumable: false },
  { id: 'theme_galaxy', name: 'Theme: Galaxy', description: 'Purple-blue gradient backgrounds during exams.', cost: 600, type: 'exam-theme', consumable: false },
  { id: 'theme_inferno', name: 'Theme: Inferno', description: 'Red-black heat tones during exams.', cost: 650, type: 'exam-theme', consumable: false },
  { id: 'theme_arctic', name: 'Theme: Arctic', description: 'Clean icy blue tones during exams.', cost: 650, type: 'exam-theme', consumable: false },
  { id: 'theme_aurora', name: 'Theme: Aurora', description: 'Green and violet aurora tones during exams.', cost: 700, type: 'exam-theme', consumable: false },
  { id: 'theme_royal', name: 'Theme: Royal', description: 'Rich violet and gold tones during exams.', cost: 750, type: 'exam-theme', consumable: false },
];

export const SHOP_ITEMS_MAP = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
