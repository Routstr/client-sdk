/**
 * Main Routstr Client for interacting with the decentralized AI network
 */

import type {
  RoutstrConfig,
  Model,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  Balance,
  RoutstrNodeInfo,
  StreamCallbacks,
  TransactionHistory,
  GiftWrapResult,
  UnwrapResult,
} from './types.js';

import {
  validateNsec,
  decodePrivateKey,
  getPublicKeyFromPrivateKey,
  formatPublicKey,
  getNpub,
} from './utils/nostr.js';

import {
  fetchBalances,
  getBalanceFromStoredProofs,
  getOrCreateApiToken,
  invalidateApiToken,
  refundRemainingBalance,
  importToken,
  createMintQuote,
  checkMintQuote,
  getTransactionHistory,
  addTransaction,
} from './utils/cashu.js';

import {
  wrapCashuToken,
  unwrapCashuToken,
  storeWrappedToken,
  getStoredWrappedTokens,
  removeWrappedToken,
  isValidCashuGiftWrap,
} from './utils/nip60.js';

import {
  RoutstrClientError,
  AuthenticationError,
  InsufficientBalanceError,
  InvalidModelError,
  NetworkError,
  ValidationError,
  TokenGenerationError,
  handleHttpError,
} from './utils/errors.js';

// Default configuration
const DEFAULT_CONFIG = {
  mintUrl: 'https://mint.minibits.cash/Bitcoin',
  baseUrl: 'https://api.routstr.com/',
};

export class RoutstrClient {
  private privateKey: Uint8Array;
  private publicKey: string;
  private config: Required<RoutstrConfig>;
  private models: Model[] = [];
  private nodeInfo: RoutstrNodeInfo | null = null;

  constructor(config: RoutstrConfig) {
    // Validate and decode the nsec
    if (!validateNsec(config.nsec)) {
      throw new ValidationError('Invalid nsec key provided');
    }

    const privateKey = decodePrivateKey(config.nsec);
    if (!privateKey) {
      throw new ValidationError('Failed to decode nsec key');
    }

    this.privateKey = privateKey;
    this.publicKey = getPublicKeyFromPrivateKey(privateKey);

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<RoutstrConfig>;

    // Ensure baseUrl ends with /
    if (!this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl += '/';
    }
  }

  /**
   * Initialize the client by fetching available models
   */
  async init(): Promise<void> {
    try {
      await this.fetchModels();
    } catch (error) {
      throw new RoutstrClientError(
        `Failed to initialize client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  /**
   * Get the user's public key
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get the user's npub (Nostr public key in bech32 format)
   */
  getNpub(): string {
    return getNpub(this.publicKey);
  }

  /**
   * Get formatted public key for display
   */
  getFormattedPublicKey(): string {
    return formatPublicKey(this.publicKey);
  }

  /**
   * Fetch available models from the Routstr node
   */
  async fetchModels(): Promise<Model[]> {
    try {
      const response = await fetch(this.config.baseUrl);

      if (!response.ok) {
        throw handleHttpError(response);
      }

      const data: RoutstrNodeInfo = await response.json();
      this.models = data.models;
      this.nodeInfo = data;

      return this.models;
    } catch (error) {
      if (error instanceof RoutstrClientError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all available models
   */
  getModels(): Model[] {
    return this.models;
  }

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): Model | undefined {
    return this.models.find(model => model.id === modelId);
  }

  /**
   * Get node information
   */
  getNodeInfo(): RoutstrNodeInfo | null {
    return this.nodeInfo;
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<Balance> {
    const { apiBalance, proofsBalance } = await fetchBalances(
      this.config.mintUrl,
      this.config.baseUrl
    );

    return {
      api: Math.floor(apiBalance / 1000), // Convert from mSats to sats
      proofs: Math.floor(proofsBalance / 1000), // Convert from mSats to sats
      total: Math.floor((apiBalance + proofsBalance) / 1000),
    };
  }

  /**
   * Import a Cashu token to add funds
   */
  async importCashuToken(
    tokenString: string
  ): Promise<{ success: boolean; amount?: number; message?: string }> {
    return importToken(tokenString, this.config.mintUrl);
  }

  /**
   * Create a Lightning invoice to add funds
   */
  async createInvoice(
    amount: number
  ): Promise<{ success: boolean; invoice?: string; quoteId?: string; message?: string }> {
    const result = await createMintQuote(this.config.mintUrl, amount);

    if (result.success && result.quote) {
      const returnValue: {
        success: boolean;
        invoice?: string;
        quoteId?: string;
        message?: string;
      } = {
        success: true,
        quoteId: result.quote.quote,
      };

      if (result.quote.request !== undefined) {
        returnValue.invoice = result.quote.request;
      }

      if (result.message !== undefined) {
        returnValue.message = result.message;
      }

      return returnValue;
    }

    return result;
  }

  /**
   * Check if a Lightning invoice has been paid
   */
  async checkInvoice(
    quoteId: string
  ): Promise<{ success: boolean; paid?: boolean; message?: string }> {
    return checkMintQuote(this.config.mintUrl, quoteId);
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): TransactionHistory[] {
    return getTransactionHistory();
  }

  // NIP-60 Gift Wrap Methods

  /**
   * Wrap a Cashu token using NIP-60 Gift Wrap protocol for private transfers
   * @param token The Cashu token to wrap
   * @param recipientPubkey The recipient's Nostr public key (hex format)
   * @param note Optional note to include with the gift
   * @returns Result with the wrapped event
   */
  async wrapCashuToken(
    token: string,
    recipientPubkey: string,
    note?: string
  ): Promise<GiftWrapResult> {
    try {
      const event = await wrapCashuToken(token, recipientPubkey, this.privateKey, note);

      // Store the wrapped token locally
      storeWrappedToken(event);

      return {
        success: true,
        event,
        message: 'Token wrapped successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to wrap token',
      };
    }
  }

  /**
   * Unwrap a NIP-60 wrapped Cashu token
   * @param event The wrapped token event
   * @returns Result with the unwrapped gift content
   */
  async unwrapCashuToken(event: any): Promise<UnwrapResult> {
    try {
      // Validate it's a proper gift wrap event
      if (!isValidCashuGiftWrap(event)) {
        return {
          success: false,
          message: 'Invalid gift wrap event',
        };
      }

      const gift = await unwrapCashuToken(event, this.privateKey);

      if (!gift) {
        return {
          success: false,
          message: 'Failed to unwrap token or token not intended for this recipient',
        };
      }

      // Remove from stored wrapped tokens if it was there
      removeWrappedToken(event.id);

      return {
        success: true,
        gift,
        message: 'Token unwrapped successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unwrap token',
      };
    }
  }

  /**
   * Get all stored wrapped tokens (gifts you've sent)
   * @returns Array of wrapped token events
   */
  getStoredWrappedTokens() {
    return getStoredWrappedTokens();
  }

  /**
   * Remove a wrapped token from storage
   * @param tokenId The event ID of the wrapped token
   */
  removeWrappedToken(tokenId: string): void {
    removeWrappedToken(tokenId);
  }

  /**
   * Check if an event is a valid NIP-60 Cashu gift wrap
   * @param event The event to validate
   * @returns True if it's a valid Cashu gift wrap
   */
  isValidCashuGiftWrap(event: any): boolean {
    return isValidCashuGiftWrap(event);
  }

  /**
   * Send a chat completion request (non-streaming)
   */
  async chatCompletion(
    request: Omit<ChatCompletionRequest, 'stream'>
  ): Promise<ChatCompletionResponse> {
    const model = this.getModel(request.model);
    if (!model) {
      throw new InvalidModelError(`Model ${request.model} not found`);
    }

    // Check balance
    const balance = await this.getBalance();
    if (balance.total < model.sats_pricing.max_cost) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Need at least ${model.sats_pricing.max_cost} sats, have ${balance.total} sats`
      );
    }

    // Get or create API token
    const token = await getOrCreateApiToken(this.config.mintUrl, model.sats_pricing.max_cost);

    if (!token || typeof token === 'object') {
      throw new TokenGenerationError('Failed to generate payment token');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          invalidateApiToken();
        }
        throw handleHttpError(response);
      }

      const result: ChatCompletionResponse = await response.json();

      // Refund any remaining balance
      await refundRemainingBalance(this.config.mintUrl, this.config.baseUrl);

      // Add transaction to history
      addTransaction({
        type: 'spent',
        amount: model.sats_pricing.max_cost,
        timestamp: Date.now(),
        status: 'success',
        model: request.model,
        message: 'Chat completion',
        balance: balance.total - model.sats_pricing.max_cost,
      });

      return result;
    } catch (error) {
      if (error instanceof RoutstrClientError) {
        throw error;
      }
      throw new NetworkError(
        `Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send a streaming chat completion request
   */
  async streamChatCompletion(
    request: Omit<ChatCompletionRequest, 'stream'>,
    callbacks?: StreamCallbacks
  ): Promise<void> {
    const model = this.getModel(request.model);
    if (!model) {
      throw new InvalidModelError(`Model ${request.model} not found`);
    }

    // Check balance
    const balance = await this.getBalance();
    if (balance.total < model.sats_pricing.max_cost) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Need at least ${model.sats_pricing.max_cost} sats, have ${balance.total} sats`
      );
    }

    // Get or create API token
    const token = await getOrCreateApiToken(this.config.mintUrl, model.sats_pricing.max_cost);

    if (!token || typeof token === 'object') {
      throw new TokenGenerationError('Failed to generate payment token');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          invalidateApiToken();
        }
        throw handleHttpError(response);
      }

      if (!response.body) {
        throw new NetworkError('Response body is not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6);

              if (jsonData === '[DONE]') {
                // Stream is complete
                callbacks?.onComplete?.(accumulatedContent);
                break;
              }

              try {
                const parsedData: ChatCompletionChunk = JSON.parse(jsonData);

                if (
                  parsedData.choices &&
                  parsedData.choices[0] &&
                  parsedData.choices[0].delta &&
                  parsedData.choices[0].delta.content
                ) {
                  const newContent = parsedData.choices[0].delta.content;
                  accumulatedContent += newContent;
                  callbacks?.onToken?.(newContent);
                }
              } catch (parseError) {
                // Ignore parsing errors for streaming chunks
                console.warn('Failed to parse streaming chunk:', parseError);
              }
            }
          }
        }

        // Refund any remaining balance
        await refundRemainingBalance(this.config.mintUrl, this.config.baseUrl);

        // Add transaction to history
        addTransaction({
          type: 'spent',
          amount: model.sats_pricing.max_cost,
          timestamp: Date.now(),
          status: 'success',
          model: request.model,
          message: 'Streaming chat completion',
          balance: balance.total - model.sats_pricing.max_cost,
        });
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown streaming error');
        callbacks?.onError?.(errorObj);
        throw errorObj;
      }
    } catch (error) {
      if (error instanceof RoutstrClientError) {
        throw error;
      }
      throw new NetworkError(
        `Streaming chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Simple chat method for quick interactions
   */
  async chat(
    message: string,
    model?: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const selectedModel = model || this.config.defaultModel || this.models[0]?.id;

    if (!selectedModel) {
      throw new InvalidModelError('No model specified and no default model available');
    }

    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: message,
    });

    const chatRequest: Omit<ChatCompletionRequest, 'stream'> = {
      model: selectedModel,
      messages,
    };

    if (options?.temperature !== undefined) {
      chatRequest.temperature = options.temperature;
    }

    if (options?.maxTokens !== undefined) {
      chatRequest.max_tokens = options.maxTokens;
    }

    const response = await this.chatCompletion(chatRequest);

    return (response.choices[0]?.message.content as string) || '';
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Omit<RoutstrConfig, 'nsec'>>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    // Ensure baseUrl ends with /
    if (!this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl += '/';
    }
  }

  /**
   * Get current configuration (excluding sensitive data)
   */
  getConfig(): Omit<Required<RoutstrConfig>, 'nsec'> {
    const { nsec, ...safeConfig } = this.config;
    return safeConfig;
  }
}
