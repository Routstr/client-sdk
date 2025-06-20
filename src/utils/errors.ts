/**
 * Error handling utilities for the Routstr SDK
 */

import type { RoutstrError } from '../types.js';

export class RoutstrClientError extends Error implements RoutstrError {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'RoutstrClientError';
    this.code = code;
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
    if (details !== undefined) {
      this.details = details;
    }

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, RoutstrClientError);
    }
  }
}

export class AuthenticationError extends RoutstrClientError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class InsufficientBalanceError extends RoutstrClientError {
  constructor(message: string = 'Insufficient balance') {
    super(message, 'INSUFFICIENT_BALANCE', 402);
    this.name = 'InsufficientBalanceError';
  }
}

export class InvalidModelError extends RoutstrClientError {
  constructor(message: string = 'Invalid model specified') {
    super(message, 'INVALID_MODEL', 400);
    this.name = 'InvalidModelError';
  }
}

export class NetworkError extends RoutstrClientError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ValidationError extends RoutstrClientError {
  constructor(message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class TokenGenerationError extends RoutstrClientError {
  constructor(message: string = 'Failed to generate Cashu token') {
    super(message, 'TOKEN_GENERATION_ERROR');
    this.name = 'TokenGenerationError';
  }
}

/**
 * Handle HTTP response errors
 */
export function handleHttpError(response: Response): RoutstrClientError {
  const { status, statusText } = response;

  switch (status) {
    case 400:
      return new ValidationError(`Bad request: ${statusText}`);
    case 401:
      return new AuthenticationError(`Unauthorized: ${statusText}`);
    case 402:
      return new InsufficientBalanceError(`Payment required: ${statusText}`);
    case 404:
      return new RoutstrClientError(`Not found: ${statusText}`, 'NOT_FOUND', 404);
    case 429:
      return new RoutstrClientError(`Rate limited: ${statusText}`, 'RATE_LIMITED', 429);
    case 500:
      return new RoutstrClientError(`Server error: ${statusText}`, 'SERVER_ERROR', 500);
    default:
      return new NetworkError(`HTTP ${status}: ${statusText}`);
  }
}

/**
 * Check if an error is a specific Routstr error type
 */
export function isRoutstrError(error: unknown): error is RoutstrClientError {
  return error instanceof RoutstrClientError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isInsufficientBalanceError(error: unknown): error is InsufficientBalanceError {
  return error instanceof InsufficientBalanceError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
} 