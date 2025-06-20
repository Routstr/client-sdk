/**
 * Streaming Chat Example for Routstr SDK
 * 
 * This example demonstrates how to use streaming chat completions
 * for real-time AI responses.
 */

import { RoutstrClient, RoutstrConfig, ChatMessage } from '../src';

async function streamingExample() {
  const config: RoutstrConfig = {
    nsec: 'nsec1your_private_key_here',
  };

  try {
    const client = new RoutstrClient(config);
    await client.init();

    console.log('🚀 Starting streaming chat example...');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that explains things step by step.'
      },
      {
        role: 'user',
        content: 'Can you explain how Bitcoin mining works? Please be detailed.'
      }
    ];

    // Get the first available model
    const models = client.getModels();
    if (models.length === 0) {
      throw new Error('No models available');
    }

    const selectedModel = models[0];
    console.log(`🤖 Using model: ${selectedModel.name}`);

    // Check balance
    const balance = await client.getBalance();
    console.log(`💰 Balance: ${balance.total} sats`);

    if (balance.total < selectedModel.sats_pricing.max_cost) {
      console.log('💸 Insufficient balance for this model');
      return;
    }

    console.log('\n🎯 Starting stream...\n');

    let fullResponse = '';

    await client.streamChatCompletion(
      {
        model: selectedModel.id,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        onToken: (token: string) => {
          // Print each token as it arrives (in real app, update UI)
          console.log(token);
          fullResponse += token;
        },
        onComplete: (complete: string) => {
          console.log('\n\n✅ Stream completed!');
          console.log(`📝 Full response length: ${complete.length} characters`);
          
          // Check updated balance
          client.getBalance().then(newBalance => {
            console.log(`💰 New balance: ${newBalance.total} sats`);
          });
        },
        onError: (error: Error) => {
          console.error('\n❌ Stream error:', error.message);
        }
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
streamingExample().catch(console.error); 