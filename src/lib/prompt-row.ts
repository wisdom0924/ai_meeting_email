export type PromptSource = "seed" | "user" | "recording_end";

export type PromptRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  summary_prompt: string;
  details_prompt: string;
  client_key: string | null;
  source: PromptSource;
};
