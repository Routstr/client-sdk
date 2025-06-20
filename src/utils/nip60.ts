/**
 * NIP-60 Gift Wrap Protocol implementation for Cashu tokens
 * Enables private, encrypted token transfers via Nostr
 */

import { Event, getEventHash, finalizeEvent, nip04 } from 'nostr-tools';
import { getPublicKeyFromPrivateKey } from './nostr.js';

export interface GiftWrap {
  token: string;
  recipientPubkey: string;
  note?: string;
}

/**
 * Wraps a Cashu token using NIP-60 Gift Wrap Protocol
 * @param token The Cashu token to wrap
 * @param recipientPubkey The recipient's Nostr public key
 * @param senderPrivateKey The sender's private key (Uint8Array format)
 * @param note Optional note to the recipient
 * @returns The wrapped event
 */
export async function wrapCashuToken(
  token: string,
  recipientPubkey: string,
  senderPrivateKey: Uint8Array,
  note?: string
): Promise<Event> {
  const senderPubkey = getPublicKeyFromPrivateKey(senderPrivateKey);

  // Encrypt the token for the recipient
  const encryptedContent = await nip04.encrypt(
    senderPrivateKey,
    recipientPubkey,
    JSON.stringify({ token, note })
  );

  const event: Event = {
    kind: 1059, // NIP-60 Gift Wrap kind
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', recipientPubkey],
      ['gift', 'cashu'],
    ],
    content: encryptedContent,
    id: '', // Will be set by getEventHash
    sig: '', // Will be set by finalizeEvent
  };

  // Set the event ID and sign the event
  event.id = getEventHash(event);
  return finalizeEvent(event, senderPrivateKey);
}

/**
 * Unwraps a NIP-60 wrapped Cashu token
 * @param event The wrapped event
 * @param recipientPrivateKey The recipient's private key (Uint8Array format)
 * @returns The unwrapped gift content
 */
export async function unwrapCashuToken(
  event: Event,
  recipientPrivateKey: Uint8Array
): Promise<GiftWrap | null> {
  try {
    const recipientPubkey = getPublicKeyFromPrivateKey(recipientPrivateKey);

    // Verify this gift is for us
    const isForUs = event.tags.some(tag => tag[0] === 'p' && tag[1] === recipientPubkey);

    if (!isForUs) return null;

    // Verify it's a Cashu gift
    const isCashuGift = event.tags.some(tag => tag[0] === 'gift' && tag[1] === 'cashu');

    if (!isCashuGift) return null;

    // Decrypt the content
    const decryptedContent = await nip04.decrypt(recipientPrivateKey, event.pubkey, event.content);

    const giftContent = JSON.parse(decryptedContent);

    return {
      token: giftContent.token,
      recipientPubkey,
      note: giftContent.note,
    };
  } catch (error) {
    console.error('Error unwrapping token:', error);
    return null;
  }
}

/**
 * Store a wrapped Cashu token in local storage
 * @param wrappedToken The NIP-60 wrapped token event
 */
export function storeWrappedToken(wrappedToken: Event): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const storedTokens = localStorage.getItem('routstr_wrapped_cashu_tokens') || '[]';
    const tokens = JSON.parse(storedTokens);
    tokens.push(wrappedToken);
    localStorage.setItem('routstr_wrapped_cashu_tokens', JSON.stringify(tokens));
  } catch (error) {
    console.error('Error storing wrapped token:', error);
  }
}

/**
 * Get all stored wrapped tokens
 * @returns Array of wrapped token events
 */
export function getStoredWrappedTokens(): Event[] {
  try {
    if (typeof localStorage === 'undefined') return [];

    const storedTokens = localStorage.getItem('routstr_wrapped_cashu_tokens');
    if (!storedTokens) return [];
    return JSON.parse(storedTokens);
  } catch (error) {
    console.error('Error getting wrapped tokens:', error);
    return [];
  }
}

/**
 * Remove a wrapped token from storage
 * @param tokenId The event ID of the wrapped token to remove
 */
export function removeWrappedToken(tokenId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const tokens = getStoredWrappedTokens();
    const updatedTokens = tokens.filter(token => token.id !== tokenId);
    localStorage.setItem('routstr_wrapped_cashu_tokens', JSON.stringify(updatedTokens));
  } catch (error) {
    console.error('Error removing wrapped token:', error);
  }
}

/**
 * Check if an event is a valid NIP-60 Cashu gift wrap
 * @param event The event to check
 * @returns True if it's a valid Cashu gift wrap
 */
export function isValidCashuGiftWrap(event: Event): boolean {
  if (event.kind !== 1059) return false;

  const hasRecipient = event.tags.some(tag => tag[0] === 'p');
  const isCashuGift = event.tags.some(tag => tag[0] === 'gift' && tag[1] === 'cashu');

  return hasRecipient && isCashuGift;
}
