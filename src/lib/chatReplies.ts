const CANNED_REPLIES = [
  "Got it — I'll take care of that on your calendar.",
  "Sounds good, I've made a note of that.",
  "Consider it scheduled! Anything else you'd like to add?",
  "Done. Let me know if you need to adjust the time.",
  "I've penciled that in for you.",
];

export function pickCannedReply(): string {
  const index = Math.floor(Math.random() * CANNED_REPLIES.length);
  return CANNED_REPLIES[index];
}
