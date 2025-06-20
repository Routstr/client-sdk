/**
 * Nostr utility functions for authentication and key management
 */

import { nip19, getPublicKey as getPublicKeyFromPrivate, finalizeEvent } from 'nostr-tools';
import type { Event } from 'nostr-tools';

/**
 * Decode an nsec private key to get the raw bytes
 */
export function decodePrivateKey(nsec: string): Uint8Array | null {
  try {
    const { type, data } = nip19.decode(nsec);
    if (type !== 'nsec') return null;
    return data as Uint8Array;
  } catch (error) {
    console.error('Error decoding nsec:', error);
    return null;
  }
}

/**
 * Get public key from private key bytes
 */
export function getPublicKeyFromPrivateKey(privateKey: Uint8Array): string {
  return getPublicKeyFromPrivate(privateKey);
}

/**
 * Validate an nsec key format and content
 */
export function validateNsec(nsec: string): boolean {
  try {
    if (!nsec.startsWith('nsec1')) return false;
    const privateKey = decodePrivateKey(nsec);
    return privateKey !== null;
  } catch {
    return false;
  }
}

/**
 * Sign an event with a private key
 */
export function signEventWithPrivateKey(
  event: {
    kind: number;
    created_at: number;
    tags: string[][];
    content: string;
  },
  privateKey: Uint8Array
): Event {
  const unsignedEvent = {
    ...event,
    pubkey: getPublicKeyFromPrivate(privateKey),
  };

  return finalizeEvent(unsignedEvent, privateKey);
}

/**
 * Format a public key to npub format for display
 */
export function formatPublicKey(publicKey: string): string {
  try {
    return nip19.npubEncode(publicKey);
  } catch (error) {
    console.error('Error formatting public key:', error);
    return publicKey.slice(0, 10) + '...' + publicKey.slice(-10);
  }
}

/**
 * Get the npub representation of a public key
 */
export function getNpub(publicKey: string): string {
  return nip19.npubEncode(publicKey);
} 