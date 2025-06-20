/**
 * Core type definitions for the Routstr SDK
 */

import type { Event } from 'nostr-tools';

export interface RoutstrConfig {
  /** The user's Nostr private key in nsec format */
  nsec: string;
  /** The Cashu mint URL for token generation */
  mintUrl?: string;
  /** The Routstr API base URL */
  baseUrl?: string;
  /** Default model to use if none specified */
  defaultModel?: string;
}

export interface Model {
  id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: readonly string[];
    output_modalities: readonly string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: number;
    completion: number;
    request: number;
    image: number;
    web_search: number;
    internal_reasoning: number;
  };
  sats_pricing: {
    prompt: number;
    completion: number;
    request: number;
    image: number;
    web_search: number;
    internal_reasoning: number;
    max_cost: number;
  };
  per_request_limits: Record<string, number | undefined>;
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export interface Balance {
  /** Balance in stored Cashu proofs (sats) */
  proofs: number;
  /** Balance in active API tokens (sats) */
  api: number;
  /** Total balance (sats) */
  total: number;
}

export interface TransactionHistory {
  type: 'spent' | 'mint' | 'send' | 'import' | 'refund' | 'gift_sent' | 'gift_received';
  amount: number;
  timestamp: number;
  status: 'success' | 'failed';
  model?: string;
  message?: string;
  balance?: number;
}

export interface RoutstrNodeInfo {
  name: string;
  description: string;
  version: string;
  npub: string;
  mint: string;
  http_url: string;
  onion_url: string;
  models: Model[];
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export interface RoutstrError extends Error {
  code: string;
  statusCode?: number | undefined;
  details?: unknown;
}

/** NIP-60 Gift Wrap interfaces */
export interface GiftWrap {
  /** The Cashu token string */
  token: string;
  /** Recipient's public key */
  recipientPubkey: string;
  /** Optional note to the recipient */
  note?: string;
}

export interface WrappedTokenEvent extends Event {
  /** NIP-60 kind 1059 */
  kind: 1059;
}

export interface GiftWrapResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The wrapped event if successful */
  event?: Event;
  /** Error message if failed */
  message?: string;
}

export interface UnwrapResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The unwrapped gift content if successful */
  gift?: GiftWrap;
  /** Error message if failed */
  message?: string;
}

// Event emitter types for streaming
export interface StreamEventMap {
  token: string;
  complete: string;
  error: Error;
}

export type StreamEventListener<T extends keyof StreamEventMap> = (data: StreamEventMap[T]) => void;
