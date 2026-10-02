export const THEMIS_MAX_MESSAGE_LENGTH = 2000
export const THEMIS_MAX_HISTORY = 19
export const THEMIS_MAX_CONVERSATION_LENGTH = 24_000

export type ThemisMessage = {
  role: "user" | "assistant"
  content: string
}

export const themis = {
  name: "THEMIS",
  subtitle: "Η ψηφιακή βοηθός σας",
}
