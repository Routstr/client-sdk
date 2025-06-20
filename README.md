# Routstr TypeScript Client SDK

A TypeScript SDK for interacting with the Routstr decentralized AI network. Provides automatic Cashu token management, privacy through routing, and simple authentication via Nostr.

## Features

- 🔐 **Nostr Authentication** - Simple nsec-based authentication
- 💰 **Automatic Token Management** - Handles Cashu token cycling automatically
- 🛡️ **Privacy First** - Routes requests through decentralized network for anonymity
- ⚡ **Lightning Payments** - Seamless Bitcoin Lightning integration
- 🤖 **Multiple AI Models** - Access to various AI providers and models
- 📱 **TypeScript Support** - Full type safety and IntelliSense
- 🔄 **Streaming Support** - Real-time streaming responses
- 🖼️ **Multi-modal** - Support for text and image inputs

## Installation

```bash
npm install @routstr/client-sdk
```

## Quick Start

```typescript
import { RoutstrClient } from '@routstr/client-sdk';

// Initialize client with your Nostr private key
const client = new RoutstrClient({
  nsec: 'nsec1your_private_key_here'
});

// Initialize and start chatting
await client.init();

const response = await client.chat(
  'Hello! Explain quantum computing in simple terms.',
  undefined, // Use default model
  { temperature: 0.7 }
);

console.log(response);
```

## Authentication

The SDK uses Nostr for authentication. You need a Nostr private key in `nsec` format:

```typescript
import { RoutstrClient, RoutstrConfig } from '@routstr/client-sdk';

const config: RoutstrConfig = {
  nsec: 'nsec1your_private_key_here',
  mintUrl: 'https://mint.minibits.cash/Bitcoin', // Optional: custom Cashu mint
  baseUrl: 'https://api.routstr.com/', // Optional: custom API endpoint
  defaultModel: 'qwen/qwen3-14b' // Optional: preferred model
};

const client = new RoutstrClient(config);
```

## Managing Funds

### Check Balance

```typescript
const balance = await client.getBalance();
console.log(`Total: ${balance.total} sats`);
console.log(`In Proofs: ${balance.proofs} sats`);
console.log(`In API Tokens: ${balance.api} sats`);
```

### Add Funds via Lightning

```typescript
// Create a Lightning invoice
const invoice = await client.createInvoice(1000); // 1000 sats
if (invoice.success) {
  console.log('Pay this invoice:', invoice.invoice);
  
  // Check if invoice was paid
  const paid = await client.checkInvoice(invoice.quoteId!);
  console.log('Invoice paid:', paid.paid);
}
```

### Import Cashu Tokens

```typescript
const result = await client.importCashuToken('cashuAeyJ0b2tlbiI6W3sibWludCI6...');
if (result.success) {
  console.log(`Imported ${result.amount} sats`);
}
```

## Chat Completions

### Simple Chat

```typescript
const response = await client.chat(
  'What is Bitcoin?',
  'qwen/qwen3-14b', // Optional: specific model
  {
    systemPrompt: 'You are a helpful crypto expert.',
    temperature: 0.7,
    maxTokens: 500
  }
);
```

### Advanced Chat Completion

```typescript
import { ChatMessage } from '@routstr/client-sdk';

const messages: ChatMessage[] = [
  {
    role: 'system',
    content: 'You are a helpful assistant.'
  },
  {
    role: 'user',
    content: 'Explain machine learning basics.'
  }
];

const response = await client.chatCompletion({
  model: 'qwen/qwen3-14b',
  messages,
  temperature: 0.7,
  max_tokens: 1000
});

console.log(response.choices[0].message.content);
```

### Streaming Chat

```typescript
await client.streamChatCompletion(
  {
    model: 'qwen/qwen3-14b',
    messages: [
      { role: 'user', content: 'Tell me a long story about space exploration.' }
    ]
  },
  {
    onToken: (token) => {
      process.stdout.write(token); // Print each token as it arrives
    },
    onComplete: (fullResponse) => {
      console.log('\nStream completed!');
    },
    onError: (error) => {
      console.error('Stream error:', error);
    }
  }
);
```

## Multi-modal Support

Send images along with text:

```typescript
import { ChatMessage, MessageContent } from '@routstr/client-sdk';

const messages: ChatMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'What do you see in this image?'
      },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      }
    ]
  }
];

const response = await client.chatCompletion({
  model: 'gpt-4-vision-preview',
  messages
});
```

## Model Management

### List Available Models

```typescript
await client.init(); // Fetches available models

const models = client.getModels();
models.forEach(model => {
  console.log(`${model.name}: ${model.sats_pricing.max_cost} sats max`);
});
```

### Get Specific Model

```typescript
const model = client.getModel('qwen/qwen3-14b');
if (model) {
  console.log(`Context length: ${model.context_length}`);
  console.log(`Modality: ${model.architecture.modality}`);
  console.log(`Cost: ${model.sats_pricing.completion} sats/token`);
}
```

## Error Handling

```typescript
import { 
  isInsufficientBalanceError, 
  isNetworkError, 
  ValidationError 
} from '@routstr/client-sdk';

try {
  const response = await client.chat('Hello!');
} catch (error) {
  if (isInsufficientBalanceError(error)) {
    console.log('Please add more funds:', error.message);
  } else if (isNetworkError(error)) {
    console.log('Network issue:', error.message);
  } else if (error instanceof ValidationError) {
    console.log('Configuration error:', error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

## Transaction History

```typescript
const history = client.getTransactionHistory();
history.forEach(tx => {
  const date = new Date(tx.timestamp).toLocaleString();
  console.log(`${tx.type}: ${tx.amount} sats on ${date}`);
});
```

## Configuration

### Update Configuration

```typescript
client.updateConfig({
  baseUrl: 'https://my-custom-routstr-node.com/',
  defaultModel: 'anthropic/claude-3-sonnet'
});
```

### Get Current Configuration

```typescript
const config = client.getConfig();
console.log('Current base URL:', config.baseUrl);
console.log('Default model:', config.defaultModel);
```

## User Information

```typescript
// Get your Nostr public key
const pubkey = client.getPublicKey();
console.log('Your pubkey:', pubkey);

// Get formatted npub
const npub = client.getNpub();
console.log('Your npub:', npub);

// Get display format
const formatted = client.getFormattedPublicKey();
console.log('Formatted:', formatted);
```

## NIP-60 Gift Wrap Protocol

Send Cashu tokens privately to other Nostr users using encrypted gift wraps:

### Wrapping Tokens

```typescript
// Wrap a Cashu token for another user
const result = await client.wrapCashuToken(
  cashuTokenString,
  recipientPublicKey, // hex format
  'Here are some AI credits!' // optional note
);

if (result.success) {
  // Send the wrapped event via Nostr relay
  console.log('Gift wrapped!', result.event);
}
```

### Unwrapping Gifts

```typescript
// Unwrap a received gift (from Nostr relay)
const unwrapResult = await client.unwrapCashuToken(giftEvent);

if (unwrapResult.success && unwrapResult.gift) {
  console.log('Gift received:', unwrapResult.gift.note);
  
  // Import the token
  const imported = await client.importCashuToken(unwrapResult.gift.token);
  console.log(`Added ${imported.amount} sats to wallet`);
}
```

### Managing Gift History

```typescript
// Get stored wrapped tokens (gifts you've sent)
const sentGifts = client.getStoredWrappedTokens();
console.log(`You've sent ${sentGifts.length} gifts`);

// Validate gift wrap events
const isValid = client.isValidCashuGiftWrap(event);
console.log('Valid gift:', isValid);

// Remove old wrapped token from storage
client.removeWrappedToken(eventId);
```

## API Reference

### RoutstrClient

Main client class for interacting with Routstr.

#### Constructor

```typescript
new RoutstrClient(config: RoutstrConfig)
```

#### Methods

- `init()` - Initialize client and fetch available models
- `chat(message, model?, options?)` - Simple chat method
- `chatCompletion(request)` - Full chat completion
- `streamChatCompletion(request, callbacks?)` - Streaming chat
- `getBalance()` - Get current balance
- `getModels()` - Get available models
- `getModel(id)` - Get specific model
- `createInvoice(amount)` - Create Lightning invoice
- `checkInvoice(quoteId)` - Check invoice payment status
- `importCashuToken(token)` - Import Cashu token
- `getTransactionHistory()` - Get transaction history

**NIP-60 Gift Wrap Methods:**
- `wrapCashuToken(token, recipientPubkey, note?)` - Wrap token for private transfer
- `unwrapCashuToken(event)` - Unwrap received gift
- `getStoredWrappedTokens()` - Get sent gifts history
- `removeWrappedToken(eventId)` - Remove stored wrapped token
- `isValidCashuGiftWrap(event)` - Validate gift wrap event

### Types

Key TypeScript interfaces:

```typescript
interface RoutstrConfig {
  nsec: string;
  mintUrl?: string;
  baseUrl?: string;
  defaultModel?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

interface Balance {
  proofs: number;
  api: number;
  total: number;
}
```

## Examples

Check the `examples/` directory for complete working examples:

- [`basic-usage.ts`](examples/basic-usage.ts) - Getting started
- [`streaming-chat.ts`](examples/streaming-chat.ts) - Real-time streaming
- [`advanced-usage.ts`](examples/advanced-usage.ts) - Advanced features
- [`complete-integration.ts`](examples/complete-integration.ts) - Full workflow
- [`nip60-gift-wrap.ts`](examples/nip60-gift-wrap.ts) - NIP-60 Gift Wrap protocol for private token transfers

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Requirements

- Node.js 16+
- TypeScript 5.0+

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/routstr/client-sdk/issues)
- Documentation: [https://docs.routstr.com](https://docs.routstr.com)
- Community: [Nostr](https://nostr.com)

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.
