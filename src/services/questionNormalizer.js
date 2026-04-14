function sanitize(value) {
  return String(value || "").trim();
}

function collapseRepeatedCharacters(word) {
  return word.replace(/([a-z])\1{2,}/gi, "$1$1");
}

const PHRASE_REPLACEMENTS = [
  [/\bla\s*bda\b/gi, "lambda"],
  [/\bla,bda\b/gi, "lambda"],
  [/\blamda\b/gi, "lambda"],
  [/\blmabda\b/gi, "lambda"],
  [/\blabmda\b/gi, "lambda"],
  [/\bwheree\b/gi, "where"],
  [/\bwhree\b/gi, "where"],
  [/\bimprovment\b/gi, "improvement"],
  [/\bimprovemnt\b/gi, "improvement"],
  [/\bimporvement\b/gi, "improvement"],
  [/\bimrpovement\b/gi, "improvement"],
  [/\bproove\b/gi, "proof"],
  [/\brepoo\b/gi, "repo"],
  [/\bappp\b/gi, "app"],
  [/\bwhatecver\b/gi, "whatever"],
  [/\bexpolain|expolaining|explian\b/gi, "explain"],
  [/\bdoirectly\b/gi, "directly"],
  [/\bhasppened\b/gi, "happened"],
  [/\bautocorect\b/gi, "autocorrect"],
  [/\bwhere is the bugs\b/gi, "where are the bugs"],
  [/\bwhat improvement this code needs the most\b/gi, "what improvements does this code need most"],
  [/\bhow the app copy the repo\b/gi, "how the app copies the repo"]
];

function normalizeQuestionText(question) {
  const raw = sanitize(question);

  if (!raw) {
    return "";
  }

  let normalized = raw
    .replace(/[^\w\s/@.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  normalized = normalized
    .split(" ")
    .map(collapseRepeatedCharacters)
    .join(" ");

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function normalizeUserQuestion(question) {
  const originalQuestion = sanitize(question);
  const normalizedQuestion = normalizeQuestionText(originalQuestion);

  return {
    originalQuestion,
    normalizedQuestion,
    changed: normalizedQuestion !== originalQuestion.toLowerCase()
  };
}

module.exports = {
  normalizeUserQuestion,
  normalizeQuestionText
};
