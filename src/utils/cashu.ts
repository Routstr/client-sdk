/**
 * Cashu utility functions for token management and payments
 */

import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
import type { Balance, TransactionHistory } from '../types.js';

const MSATS_PER_SAT = 1000;
const DEFAULT_TOKEN_AMOUNT = 50;

export interface CashuProof {
  amount: number;
  secret: string;
  C: string;
  id: string;
  [key: string]: unknown;
}

export interface MintQuoteResponse {
  quote: string;
  request?: string;
  state: MintQuoteState;
  expiry?: number;
}

/**
 * Storage key for Cashu proofs
 */
const CASHU_PROOFS_KEY = 'routstr_cashu_proofs';
const CURRENT_TOKEN_KEY = 'routstr_current_token';
const TRANSACTION_HISTORY_KEY = 'routstr_transaction_history';

/**
 * Get balance from stored Cashu proofs
 */
export function getBalanceFromStoredProofs(): number {
  try {
    if (typeof localStorage === 'undefined') return 0;

    const storedProofs = localStorage.getItem(CASHU_PROOFS_KEY);
    if (!storedProofs) return 0;

    const proofs = JSON.parse(storedProofs) as CashuProof[];
    return proofs.reduce((total, proof) => total + proof.amount, 0);
  } catch (error) {
    console.error('Error getting balance from stored proofs:', error);
    return 0;
  }
}

/**
 * Fetch balances from both stored proofs and API
 */
export async function fetchBalances(
  mintUrl: string,
  baseUrl: string
): Promise<{ apiBalance: number; proofsBalance: number }> {
  let apiBalance = 0;
  let proofsBalance = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem(CURRENT_TOKEN_KEY);

      if (token) {
        const response = await fetch(`${baseUrl}v1/wallet/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 402) {
            // Invalidate current token since it's out of balance
            invalidateApiToken();
            console.warn('API token invalidated due to insufficient balance.');
          } else {
            console.error(
              `Failed to fetch wallet balance: ${response.status} ${response.statusText}`
            );
          }
        } else {
          const data = await response.json();
          apiBalance = data.balance;
          if (apiBalance > 0) {
            // Refund remaining balance
            await refundRemainingBalance(mintUrl, baseUrl);
            apiBalance = 0;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching API balance:', error);
  }

  // Always get proofs balance
  proofsBalance = getBalanceFromStoredProofs() * MSATS_PER_SAT;

  return { apiBalance, proofsBalance };
}

/**
 * Generate a new Cashu token for API usage
 */
export async function generateApiToken(mintUrl: string, amount: number): Promise<string | null> {
  try {
    if (typeof localStorage === 'undefined') return null;

    // Check if amount is a decimal and round up if necessary
    if (amount % 1 !== 0) {
      amount = Math.ceil(amount);
    }

    // Get stored proofs
    const storedProofs = localStorage.getItem(CASHU_PROOFS_KEY);
    if (!storedProofs) {
      console.warn('No Cashu tokens found for generating API token');
      return null;
    }

    const proofs = JSON.parse(storedProofs) as CashuProof[];

    // Initialize wallet for this mint
    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    // Generate the token using the wallet directly
    const { send, keep } = await wallet.send(amount, proofs);

    if (!send || send.length === 0) {
      return null;
    }

    // Update stored proofs with remaining proofs
    localStorage.setItem(CASHU_PROOFS_KEY, JSON.stringify(keep));

    // Create a token string in the proper Cashu format
    const tokenObj = {
      token: [{ mint: mintUrl, proofs: send }],
    };

    return `cashuA${btoa(JSON.stringify(tokenObj))}`;
  } catch (error) {
    if (error instanceof Error && error.message.includes('funds')) {
      return null;
    }
    console.error('Failed to generate API token:', error);
    return null;
  }
}

/**
 * Get or create an API token for requests
 */
export async function getOrCreateApiToken(
  mintUrl: string,
  amount: number = DEFAULT_TOKEN_AMOUNT
): Promise<string | null | { hasTokens: false }> {
  try {
    if (typeof localStorage === 'undefined') return null;

    // Try to get existing token
    const storedToken = localStorage.getItem(CURRENT_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Check if any tokens are available
    const storedProofs = localStorage.getItem(CASHU_PROOFS_KEY);
    if (!storedProofs) {
      return { hasTokens: false };
    }

    // Generate new token if none exists
    const newToken = await generateApiToken(mintUrl, amount);
    if (newToken) {
      localStorage.setItem(CURRENT_TOKEN_KEY, newToken);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('Error in token management:', error);
    return null;
  }
}

/**
 * Invalidate the current API token
 */
export function invalidateApiToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CURRENT_TOKEN_KEY);
  }
}

/**
 * Refund remaining balance from API token back to proofs
 */
export async function refundRemainingBalance(
  mintUrl: string,
  baseUrl: string,
  token?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (typeof localStorage === 'undefined') {
      return { success: false, message: 'LocalStorage not available' };
    }

    // Use provided token or try to get existing token from localStorage
    const storedToken = token || localStorage.getItem(CURRENT_TOKEN_KEY);
    if (!storedToken) {
      return { success: true, message: 'No token to refund' };
    }

    if (!baseUrl) {
      return { success: false, message: 'No base URL configured' };
    }

    // Ensure baseUrl ends with a slash
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const response = await fetch(`${normalizedBaseUrl}v1/wallet/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storedToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Refund request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.token) {
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);
      await wallet.loadMint();

      const result = await wallet.receive(data.token);
      const proofs = Array.isArray(result) ? result : [];

      if (proofs && proofs.length > 0) {
        const storedProofs = localStorage.getItem(CASHU_PROOFS_KEY);
        const existingProofs = storedProofs ? JSON.parse(storedProofs) : [];
        localStorage.setItem(CASHU_PROOFS_KEY, JSON.stringify([...existingProofs, ...proofs]));
      }
    }

    // Clear the current token since it's been refunded
    invalidateApiToken();

    return { success: true, message: 'Refund completed successfully' };
  } catch (error) {
    console.error('Error refunding balance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during refund',
    };
  }
}

/**
 * Import a Cashu token from string
 */
export async function importToken(
  tokenString: string,
  mintUrl: string
): Promise<{ success: boolean; amount?: number; message?: string }> {
  try {
    if (typeof localStorage === 'undefined') {
      return { success: false, message: 'LocalStorage not available' };
    }

    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    const result = await wallet.receive(tokenString);
    const proofs = Array.isArray(result) ? result : [];

    if (!proofs || proofs.length === 0) {
      return { success: false, message: 'Invalid token format' };
    }

    const storedProofs = localStorage.getItem(CASHU_PROOFS_KEY);
    const existingProofs = storedProofs ? JSON.parse(storedProofs) : [];
    localStorage.setItem(CASHU_PROOFS_KEY, JSON.stringify([...existingProofs, ...proofs]));

    const importedAmount = proofs.reduce(
      (total: number, proof: CashuProof) => total + proof.amount,
      0
    );

    return {
      success: true,
      amount: importedAmount,
      message: `Successfully imported ${importedAmount} sats`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('already spent')) {
      return { success: false, message: 'This token has already been spent' };
    }
    return { success: false, message: errorMessage };
  }
}

/**
 * Create a mint quote for receiving Lightning payments
 */
export async function createMintQuote(
  mintUrl: string,
  amount: number
): Promise<{ success: boolean; quote?: MintQuoteResponse; message?: string }> {
  try {
    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    const quote = await wallet.createMintQuote(amount);

    return {
      success: true,
      quote,
      message: 'Quote created successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create mint quote',
    };
  }
}

/**
 * Check if a mint quote has been paid
 */
export async function checkMintQuote(
  mintUrl: string,
  quoteId: string
): Promise<{ success: boolean; paid?: boolean; message?: string }> {
  try {
    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    const quote = await wallet.checkMintQuote(quoteId);

    return {
      success: true,
      paid: quote.state === MintQuoteState.PAID,
      message: quote.state === MintQuoteState.PAID ? 'Quote has been paid' : 'Quote not yet paid',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check mint quote',
    };
  }
}

/**
 * Get transaction history
 */
export function getTransactionHistory(): TransactionHistory[] {
  try {
    if (typeof localStorage === 'undefined') return [];

    const stored = localStorage.getItem(TRANSACTION_HISTORY_KEY);
    if (!stored) return [];

    return JSON.parse(stored) as TransactionHistory[];
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

/**
 * Add transaction to history
 */
export function addTransaction(transaction: TransactionHistory): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const history = getTransactionHistory();
    history.push(transaction);
    localStorage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error adding transaction to history:', error);
  }
}
