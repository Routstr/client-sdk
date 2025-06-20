/**
 * Advanced Usage Example for Routstr SDK
 * 
 * This example demonstrates advanced features including:
 * - Wallet management
 * - Error handling
 * - Transaction history
 * - Multi-modal content (images)
 * - Model selection and optimization
 */

import { 
  RoutstrClient, 
  RoutstrConfig, 
  ChatMessage, 
  MessageContent,
  isInsufficientBalanceError,
  isNetworkError,
  ValidationError
} from '../src';

async function advancedExample() {
  const config: RoutstrConfig = {
    nsec: 'nsec1your_private_key_here',
    defaultModel: 'qwen/qwen3-14b', // Set a preferred default model
  };

  try {
    const client = new RoutstrClient(config);
    await client.init();

    console.log('🚀 Advanced Routstr SDK Example');
    console.log('===============================\n');

    // Display user information
    console.log('👤 User Information:');
    console.log(`   npub: ${client.getNpub()}`);
    console.log(`   pubkey: ${client.getPublicKey()}`);
    
    // Display node information
    const nodeInfo = client.getNodeInfo();
    if (nodeInfo) {
      console.log('\n🏠 Node Information:');
      console.log(`   Name: ${nodeInfo.name}`);
      console.log(`   Version: ${nodeInfo.version}`);
      console.log(`   Models: ${nodeInfo.models.length}`);
    }

    // Analyze available models
    console.log('\n🤖 Model Analysis:');
    const models = client.getModels();
    const sortedModels = models.sort((a, b) => a.sats_pricing.max_cost - b.sats_pricing.max_cost);
    
    console.log('   Cheapest models:');
    sortedModels.slice(0, 3).forEach(model => {
      console.log(`   - ${model.name}: ${model.sats_pricing.max_cost} sats`);
    });

    // Check balance and transaction history
    console.log('\n💰 Wallet Status:');
    const balance = await client.getBalance();
    console.log(`   Total: ${balance.total} sats`);
    console.log(`   In Proofs: ${balance.proofs} sats`);
    console.log(`   In API Tokens: ${balance.api} sats`);

    const history = client.getTransactionHistory();
    console.log(`   Transaction History: ${history.length} transactions`);
    
    if (history.length > 0) {
      console.log('   Recent transactions:');
      history.slice(-3).forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleString();
        console.log(`   - ${tx.type}: ${tx.amount} sats on ${date}`);
      });
    }

    // Demonstrate wallet management
    if (balance.total < 100) {
      console.log('\n💸 Low balance detected. Creating Lightning invoice...');
      
      const invoice = await client.createInvoice(1000);
      if (invoice.success && invoice.invoice) {
        console.log('⚡ Lightning Invoice:');
        console.log(`   ${invoice.invoice}`);
        console.log(`   Quote ID: ${invoice.quoteId}`);
        
        // In a real app, you'd show this as a QR code and poll for payment
        console.log('\n💡 To test payment checking:');
        console.log('   const paid = await client.checkInvoice(quoteId);');
      }
      
      // Example of importing a Cashu token
      console.log('\n🪙 To import Cashu tokens:');
      console.log('   const result = await client.importCashuToken(tokenString);');
      
      return; // Exit if no balance for demonstration
    }

    // Demonstrate multi-modal chat with image
    console.log('\n🖼️  Multi-modal Chat Example:');
    try {
      // Find a model that supports images
      const multimodalModel = models.find(model => 
        model.architecture.input_modalities.includes('image')
      );

      if (multimodalModel && balance.total >= multimodalModel.sats_pricing.max_cost) {
        console.log(`   Using model: ${multimodalModel.name}`);
        
        const messagesWithImage: ChatMessage[] = [
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
                  url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                }
              }
            ]
          }
        ];

        const response = await client.chatCompletion({
          model: multimodalModel.id,
          messages: messagesWithImage,
          max_tokens: 200
        });

        console.log('🤖 AI Response:', response.choices[0]?.message.content);
      } else {
        console.log('   No multimodal models available or insufficient balance');
      }
    } catch (error) {
      console.log('   Multimodal example failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Demonstrate conversation with context
    console.log('\n💬 Conversation Example:');
    const conversationMessages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that remembers context.'
      },
      {
        role: 'user',
        content: 'My name is Alice and I love programming in TypeScript.'
      }
    ];

    // Find an affordable model for this demo
    const affordableModel = sortedModels.find(model => 
      balance.total >= model.sats_pricing.max_cost
    );

    if (affordableModel) {
      console.log(`   Using model: ${affordableModel.name}`);
      
      // First message
      const response1 = await client.chatCompletion({
        model: affordableModel.id,
        messages: conversationMessages
      });

      console.log('🤖 AI:', response1.choices[0]?.message.content);

      // Add AI response to conversation
      conversationMessages.push(response1.choices[0]?.message);

      // Follow-up message
      conversationMessages.push({
        role: 'user',
        content: 'What programming language did I say I love?'
      });

      const response2 = await client.chatCompletion({
        model: affordableModel.id,
        messages: conversationMessages
      });

      console.log('🤖 AI:', response2.choices[0]?.message.content);
    }

    // Show final balance
    const finalBalance = await client.getBalance();
    console.log(`\n💰 Final balance: ${finalBalance.total} sats`);

  } catch (error) {
    console.log('\n❌ Error occurred:');
    
    if (isInsufficientBalanceError(error)) {
      console.log('💸 Insufficient balance:', error.message);
      console.log('   Please add more funds to continue');
    } else if (isNetworkError(error)) {
      console.log('🌐 Network error:', error.message);
      console.log('   Please check your internet connection');
    } else if (error instanceof ValidationError) {
      console.log('🔍 Validation error:', error.message);
      console.log('   Please check your configuration');
    } else {
      console.log('   Unknown error:', error);
    }
  }
}

// Run the example
advancedExample().catch(console.error); 