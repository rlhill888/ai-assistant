import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Default model for all Claude calls in this app. Override per-call if a
// specific route needs a different tier (e.g. Haiku for cheap classification).
export const CLAUDE_MODEL = "claude-opus-4-8";

// Cache the client on globalThis so Next.js dev-mode hot reloads reuse the
// same instance instead of constructing a new one on every module reload.
const globalForClaude = globalThis as unknown as {
  claudeClient?: Anthropic;
};

export function getClaudeClient(): Anthropic {
  if (!globalForClaude.claudeClient) {
    globalForClaude.claudeClient = new Anthropic();
  }
  return globalForClaude.claudeClient;
}
