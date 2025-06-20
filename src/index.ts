/**
 * Routstr TypeScript Client SDK
 * 
 * A TypeScript SDK for interacting with the Routstr decentralized AI network.
 * Provides automatic Cashu token management, privacy through routing, and 
 * simple authentication via Nostr.
 */

// Main client
export { RoutstrClient } from './client.js';

// Types
export type {
  RoutstrConfig,
  Model,
  MessageContent,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  Balance,
  TransactionHistory,
  RoutstrNodeInfo,
  StreamCallbacks,
  RoutstrError,
  StreamEventMap,
  StreamEventListener,
} from './types.js';

// Error classes
export {
  RoutstrClientError,
  AuthenticationError,
  InsufficientBalanceError,
  InvalidModelError,
  NetworkError,
  ValidationError,
  TokenGenerationError,
  handleHttpError,
  isRoutstrError,
  isAuthenticationError,
  isInsufficientBalanceError,
  isNetworkError,
  isValidationError,
} from './utils/errors.js';

// Utility functions (optional exports for advanced users)
export {
  validateNsec,
  formatPublicKey,
  getNpub,
} from './utils/nostr.js';

export {
  getBalanceFromStoredProofs,
  getTransactionHistory,
} from './utils/cashu.js';

// NIP-60 Gift Wrap exports
export {
  wrapCashuToken,
  unwrapCashuToken,
  storeWrappedToken,
  getStoredWrappedTokens,
  removeWrappedToken,
  isValidCashuGiftWrap,
} from './utils/nip60.js';

export type {
  GiftWrap,
  WrappedTokenEvent,
  GiftWrapResult,
  UnwrapResult,
} from './types.js'; 