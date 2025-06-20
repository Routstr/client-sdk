/**
 * Basic Usage Example for Routstr SDK
 * 
 * This example shows how to get started with the Routstr SDK for basic chat interactions.
 */

import { RoutstrClient, RoutstrConfig, isInsufficientBalanceError } from '../src';

async function basicExample() {
  // Your Nostr private key (nsec format)
  // In production, store this securely and never expose it
  const userNsec = 'nsec1your_private_key_here';

  // Create client configuration
  const config: RoutstrConfig = {
    nsec: userNsec,
    // Optional: customize mint and API URLs
    // mintUrl: 'https://mint.minibits.cash/Bitcoin',
    // baseUrl: 'https://api.routstr.com/',
    // defaultModel: 'qwen/qwen3-14b'
  };

  try {
    // Initialize the client
    const client = new RoutstrClient(config);
    
    // Initialize by fetching available models
    await client.init();
    
    console.log('🚀 Routstr client initialized!');
    console.log('📢 Your npub:', client.getNpub());
    
    // Check available balance
    const balance = await client.getBalance();
    console.log('💰 Current balance:', balance.total, 'sats');
    
    // List available models
    const models = client.getModels();
    console.log('🤖 Available models:', models.length);
    models.forEach(model => {
      console.log(`  - ${model.name} (${model.sats_pricing.max_cost} sats max)`);
    });

    // Simple chat interaction
    if (balance.total > 0) {
      const response = await client.chat(
        'Hello! Can you explain what Bitcoin is in simple terms?',
        undefined, // Use default model
        {
          systemPrompt: 'You are a helpful assistant that explains complex topics simply.',
          temperature: 0.7
        }
      );
      
      console.log('🤖 AI Response:', response);
    } else {
      console.log('💸 No balance available. Please add funds to start chatting.');
      
      // Create an invoice to add funds
      const invoice = await client.createInvoice(1000); // 1000 sats
      if (invoice.success) {
        console.log('⚡ Lightning invoice created:', invoice.invoice);
        console.log('🆔 Quote ID:', invoice.quoteId);
        console.log('💡 Pay this invoice to add 1000 sats to your balance');
      }
    }
    
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      console.error('💸 Insufficient balance:', error.message);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

// Run the example
basicExample().catch(console.error); 