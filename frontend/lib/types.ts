export interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: "pending" | "parsing" | "ocr" | "embedding" | "ready" | "error";
  chunk_count: number;
  created_at: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}
