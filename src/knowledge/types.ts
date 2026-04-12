/** Категории в `assets/knowledge.json` и удалённом JSON */
export type KnowledgeCategory =
  | 'booking'
  | 'payment'
  | 'account'
  | 'club'
  | 'equipment'
  | 'support';

const KNOWLEDGE_CATEGORY_SET = new Set<string>([
  'booking',
  'payment',
  'account',
  'club',
  'equipment',
  'support',
]);

export function isKnowledgeCategory(s: string): s is KnowledgeCategory {
  return KNOWLEDGE_CATEGORY_SET.has(s);
}

export type KnowledgeEntry = {
  id: string;
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords: string[];
};
