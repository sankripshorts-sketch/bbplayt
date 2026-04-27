import type { KnowledgeEntry } from '../knowledge/types';
import { getOllamaConfig } from '../config/ollamaConfig';
import { topKnowledgeForRag } from '../knowledge/search';
import { isAbortError, ollamaFetch, OLLAMA_RAG_TIMEOUT_MS } from './ollamaHttp';

const CHAT_PATH = '/chat';

function buildPromptParts(args: {
  userQuestion: string;
  entries: KnowledgeEntry[];
  locale: string;
  runtimeContext?: string;
  conversationContext?: string;
}) {
  const { userQuestion, entries, locale, runtimeContext, conversationContext } = args;
  const isRu = !locale.startsWith('en');
  const system = isRu
    ? 'Ты — помощник поддержки в мобильном приложении BlackBears Play.\n\n' +
      'BlackBears Play — сеть компьютерных клубов. В приложении пользователи могут смотреть клубы, бронировать игровые места, узнавать тарифы, читать новости, смотреть акции, проверять профиль, баланс и пользоваться меню еды.\n\n' +
      'Твоя роль:\n' +
      '- помогать пользователю разобраться с приложением и услугами BlackBears Play;\n' +
      '- отвечать только на основе переданной справочной информации и контекста сообщения;\n' +
      '- не придумывать цены, адреса, правила, свободные места, акции, график работы или технические детали;\n' +
      '- если в справочной информации есть нужный факт, дать готовый прямой ответ, а не писать, где его можно узнать;\n' +
      '- если данных не хватает для точного ответа, кратко объяснить, какой именно детали не хватает, и задать один уточняющий вопрос;\n' +
      '- если вопрос связан с конкретным клубом, датой, тарифом или бронью, попросить только недостающую деталь: клуб, дату, время, тариф или номер ПК;\n' +
      '- если пользователь просит «по всем зонам», «про все зоны» или «по каждой зоне», считай, что зона уже указана как "все зоны": не переспрашивай зону повторно;\n' +
      '- не выполнять действия от имени пользователя, а только объяснять, что он может сделать в приложении.\n\n' +
      'Обязательная проверка перед ответом:\n' +
      '- помимо соблюдения роли, проверь пробелы во всем тексте ответа: между словами, после знаков препинания, между числами и единицами измерения;\n' +
      '- исправь любые склейки слов, чисел и единиц измерения до отправки ответа;\n' +
      '- особенно проверь места вокруг предлогов и времени: пиши «с 10:00 до 02:00», а не «с10:00», «до02:00» или «10:00до02:00».\n\n' +
      'Стиль ответа:\n' +
      '- язык: русский;\n' +
      '- тон: дружелюбный, уверенный, как администратор клуба;\n' +
      '- отвечай кратко и по делу;\n' +
      '- начинай с ответа на вопрос пользователя, без вступлений вроде «информацию можно найти»;\n' +
      '- не отправляй пользователя искать ответ на сайте, в соцсетях или у администратора, если ответ уже есть в переданной справке;\n' +
      '- если справка описывает путь в приложении, сформулируй его как конкретное действие: «Откройте ...», «Выберите ...»;\n' +
      '- если пишешь цены по зонам, используй короткий список, а не markdown-таблицу;\n' +
      '- пиши единицы времени с пробелом: «10 минут», «3 часа»;\n' +
      '- всегда ставь пробелы между числами и словами/единицами измерения: «150 рублей», «100 руб/час», «24 часа»;\n' +
      '- не допускай слитного написания вида «150рублейзачас», «100руб/час», «2часа»;\n' +
      '- перед отправкой проверь орфографию, пунктуацию, грамматику и синтаксис;\n' +
      '- перед отправкой сделай финальную вычитку: исправь опечатки и проверь, что между словами и числами везде есть корректные пробелы;\n' +
      '- если пользователь спрашивает про конкретный клуб, отвечай в единственном числе и явно укажи этот клуб;\n' +
      '- время указывай в формате HH:MM (например, 10:00 и 02:00);\n' +
      '- не используй канцелярит;\n' +
      '- не упоминай “базу знаний”, “контекст”, “промпт”, “модель” или “Ollama”;\n' +
      '- не пиши длинные списки, если пользователь не просит подробностей;\n' +
      '- если есть пошаговая инструкция, дай ее короткими пунктами.\n\n' +
      'Правила безопасности:\n' +
      '- не запрашивай пароль, токены, коды подтверждения или персональные данные;\n' +
      '- не советуй обходить правила клуба, оплаты или бронирования;\n' +
      '- если пользователь пишет агрессивно, отвечай спокойно и нейтрально;\n' +
      '- если вопрос не относится к BlackBears Play, вежливо верни разговор к приложению или клубам.\n\n' +
      'Если информации достаточно — дай прямой ответ.\n' +
      'Если информации недостаточно — не выдумывай; задай один уточняющий вопрос или скажи, каких данных нет в приложении.\n\n' +
      'Важно: используй только факты из справочной информации ниже. Не заменяй ответ фразой о том, где его можно узнать, если факт уже передан ниже.'
    : 'You are the support chatbot in the BlackBears Play mobile app.\n\n' +
      'BlackBears Play is a network of computer clubs. In the app, users can view clubs, book gaming seats, check rates, read news, view promotions, check their profile and balance, and use the food menu.\n\n' +
      'Your role:\n' +
      '- help users understand the app and BlackBears Play services;\n' +
      '- answer only from the provided help information and message context;\n' +
      '- do not invent prices, addresses, rules, available seats, promotions, opening hours, or technical details;\n' +
      '- if the provided help contains the needed fact, give a ready direct answer instead of saying where to find it;\n' +
      '- if there is not enough data for an exact answer, briefly name the missing detail and ask one clarifying question;\n' +
      '- if the question depends on a specific club, date, rate, or booking, ask only for the missing detail: club, date, time, rate, or PC number;\n' +
      '- if the user asks for "all zones" or "each zone", treat zone as already specified ("all zones") and do not ask to clarify the zone again;\n' +
      '- do not perform actions for the user, only explain what they can do in the app.\n\n' +
      'Required check before answering:\n' +
      '- besides following the role, check spacing across the whole answer: between words, after punctuation, and between numbers and units;\n' +
      '- fix any glued words, numbers, or units before sending the answer;\n' +
      '- especially check spacing around prepositions and time: write “from 10:00 to 02:00”, not “from10:00”, “to02:00”, or “10:00to02:00”.\n\n' +
      'Answer style:\n' +
      '- language: English;\n' +
      '- tone: friendly and confident, like a club administrator;\n' +
      '- be brief and practical;\n' +
      '- start with the answer to the user question, without intros like “you can find this information”;\n' +
      '- do not send the user to the website, socials, or administrator when the provided help already contains the answer;\n' +
      '- if the help describes an app path, phrase it as a concrete action: “Open ...”, “Choose ...”;\n' +
      '- check spelling, punctuation, grammar, and syntax before sending;\n' +
      '- always keep proper spacing between numbers and words/units: “150 rubles”, “24 hours”, “100 rub/hour”;\n' +
      '- do not output glued forms like “150rubles”, “2hours”, or similar;\n' +
      '- do a final proofreading pass before sending: fix typos and spacing issues between words and numbers;\n' +
      '- if the user asks about a specific club, answer in singular and mention that club explicitly;\n' +
      '- format time as HH:MM (for example, 10:00 and 02:00);\n' +
      '- avoid bureaucratic wording;\n' +
      '- do not mention “knowledge base”, “context”, “prompt”, “model”, or “Ollama”;\n' +
      '- do not write long lists unless the user asks for details;\n' +
      '- if steps are useful, give short bullet points.\n\n' +
      'Safety rules:\n' +
      '- do not ask for passwords, tokens, verification codes, or personal data;\n' +
      '- do not suggest bypassing club, payment, or booking rules;\n' +
      '- if the user is aggressive, answer calmly and neutrally;\n' +
      '- if the question is unrelated to BlackBears Play, politely bring the conversation back to the app or clubs.\n\n' +
      'If there is enough information, give a direct answer.\n' +
      'If there is not enough information, do not invent it; ask one clarifying question or say which app data is missing.\n\n' +
      'Important: use only facts from the help information below. Do not replace an answer with directions on where to find it when the fact is already provided below.';

  let userBlock: string;
  const conversationBlock = conversationContext?.trim()
    ? isRu
      ? `\n\nИстория диалога (последние сообщения):\n${conversationContext.trim()}\nИспользуй эту историю, чтобы правильно понять короткие ответы пользователя в текущем вопросе.`
      : `\n\nConversation history (recent messages):\n${conversationContext.trim()}\nUse this history to correctly interpret short user follow-ups in the current question.`
    : '';
  if (entries.length) {
    const parts = entries.map((e, i) => `---\n[${i + 1}] ${e.question}\n${e.answer}`);
    const runtimeBlock = runtimeContext?.trim()
      ? isRu
        ? `\n\nОперативные данные из API:\n${runtimeContext.trim()}`
        : `\n\nLive API data:\n${runtimeContext.trim()}`
      : '';
    userBlock = isRu
      ? `Справочная информация:\n${parts.join('\n')}${runtimeBlock}${conversationBlock}\n\nВопрос пользователя:\n${userQuestion}\n\nОтветь пользователю как помощник BlackBears Play.`
      : `Help information:\n${parts.join('\n')}${runtimeBlock}${conversationBlock}\n\nUser question:\n${userQuestion}\n\nAnswer as the BlackBears Play assistant.`;
  } else {
    const runtimeBlock = runtimeContext?.trim()
      ? isRu
        ? `\n\nОперативные данные из API:\n${runtimeContext.trim()}`
        : `\n\nLive API data:\n${runtimeContext.trim()}`
      : '';
    userBlock = isRu
      ? `Справочная информация:\nНет подходящей справочной информации.${runtimeBlock}${conversationBlock}\n\nВопрос пользователя:\n${userQuestion}\n\nОтветь пользователю как помощник BlackBears Play. Не выдумывай факты.`
      : `Help information:\nNo matching help information.${runtimeBlock}${conversationBlock}\n\nUser question:\n${userQuestion}\n\nAnswer as the BlackBears Play assistant. Do not invent facts.`;
  }

  return { system, userBlock };
}

type OllamaChatResponse = {
  message?: { content?: string; role?: string };
  error?: string;
};

export class OllamaRagError extends Error {
  constructor(
    message: string,
    readonly code: 'no_key' | 'http' | 'empty' | 'network',
  ) {
    super(message);
    this.name = 'OllamaRagError';
  }
}

/**
 * RAG: подбирает карточки из `allEntries`, отправляет в Ollama /api/chat, возвращает ответ ассистента.
 */
export async function completeWithOllamaRag(args: {
  userQuestion: string;
  allEntries: KnowledgeEntry[];
  /** Сколько карточек передать в контекст */
  topK?: number;
  locale: string;
  runtimeContext?: string;
  conversationContext?: string;
}): Promise<string> {
  const { userQuestion, allEntries, locale, topK = 5, runtimeContext, conversationContext } = args;
  const { baseUrl, model, apiKey } = getOllamaConfig();
  if (!apiKey) {
    throw new OllamaRagError('Ollama API key is not configured', 'no_key');
  }

  const ranked = topKnowledgeForRag(userQuestion, allEntries, topK);
  const { system, userBlock } = buildPromptParts({
    userQuestion,
    entries: ranked,
    locale,
    runtimeContext,
    conversationContext,
  });

  const url = `${baseUrl}${CHAT_PATH}`;
  let res: Response;
  try {
    res = await ollamaFetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userBlock },
          ],
          options: {
            /** Низкая температура держит факты, орфографию и пунктуацию стабильнее. */
            temperature: 0.35,
            top_p: 0.9,
          },
        }),
      },
      OLLAMA_RAG_TIMEOUT_MS,
    );
  } catch (e) {
    if (isAbortError(e)) {
      throw new OllamaRagError('Ollama request timed out', 'network');
    }
    throw new OllamaRagError('Network error while calling Ollama', 'network');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new OllamaRagError(
      `Ollama HTTP ${res.status}: ${errText.slice(0, 300)}`,
      'http',
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) {
    throw new OllamaRagError(String(data.error).slice(0, 300), 'http');
  }
  const text = data.message?.content?.replace(/\r/g, '').trim();
  if (!text) {
    throw new OllamaRagError('Empty reply from Ollama', 'empty');
  }
  return text;
}
