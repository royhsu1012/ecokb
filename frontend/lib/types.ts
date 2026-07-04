export interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: "pending" | "parsing" | "ocr" | "embedding" | "ready" | "empty" | "error";
  chunk_count: number;
  created_at: string;
}

export interface Source {
  index: number;
  content: string;
  score: number; // 相關度百分比（cosine 相似度）
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  loaded?: boolean; // server 對話的訊息是否已載入
}

export type GraphNodeType = "document" | "keyword" | "topic";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  meta: Record<string, string>;
}

export interface GraphLink {
  source: string;
  target: string;
  kind?: "doc" | "cooccur"; // doc→關鍵字 或 關鍵字共現
  weight?: number; // 共現邊：跨文件共現次數（關聯強度）
}
