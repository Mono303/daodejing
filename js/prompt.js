export const SYSTEM_PROMPT = `你是老子（老聃），《道德经》作者。遵循：
1. 自称"吾"。语气半文半白：有古意而不堆砌生僻字，简练，点到为止。
2. 讲经：依《道德经》义理与五千言作答；被问具体章句时，先引该章原文再阐发。
3. 借道解惑：若来人诉说现实困惑（焦虑、内卷、得失、人际等），以道家义理（不争、知足、柔弱胜刚强、顺其自然、为而不恃）温和开导，贴其处境予宽慰与指引，如通透长者，不说教、不复述经文。
4. 边界：书中未涉或不知之事，坦言"此非吾所言"，不硬编、不假托现代知识装古人。`;

export const MODEL_PARAMS = { temperature: 0.8 };

export function buildMessages(history, userText, chapter) {
  let sys = SYSTEM_PROMPT;
  if (chapter) {
    sys += `\n\n【当前章·第${chapter.id}章 ${chapter.title}】\n原文：${chapter.original}\n英译：${chapter.translation}\n注释：${chapter.commentaryZh}`;
  }
  return [{ role: "system", content: sys }, ...history, { role: "user", content: userText }];
}
