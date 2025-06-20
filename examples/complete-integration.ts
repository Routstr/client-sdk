/**
 * Complete Integration Example for Routstr SDK
 * 
 * This example demonstrates a complete workflow including:
 * - Client initialization and authentication
 * - Wallet setup and funding
 * - Model selection and optimization
 * - Multi-turn conversations
 * - Error handling and recovery
 * - Transaction monitoring
 */

import {
  RoutstrClient,
  RoutstrConfig,
  ChatMessage,
  isInsufficientBalanceError,
  isNetworkError,
  ValidationError,
} from '../src';

class RoutstrApp {
  private client: RoutstrClient;
  private conversationHistory: ChatMessage[] = [];

  constructor(nsec: string) {
    const config: RoutstrConfig = {
      nsec,
      defaultModel: 'qwen/qwen3-14b',
      // Use default endpoints or customize as needed
    };

    this.client = new RoutstrClient(config);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Routstr client...');
    
    try {
      await this.client.init();
      console.log('✅ Client initialized successfully');
      
      // Display user info
      console.log(`👤 Your npub: ${this.client.getNpub()}`);
      
      // Show available models
      await this.displayAvailableModels();
      
      // Check wallet status
      await this.checkWalletStatus();
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Display available models with pricing
   */
  private async displayAvailableModels(): Promise<void> {
    const models = this.client.getModels();
    console.log(`\n🤖 Available Models (${models.length} total):`);
    
    // Sort by cost for better display
    const sortedModels = models
      .sort((a, b) => a.sats_pricing.max_cost - b.sats_pricing.max_cost)
      .slice(0, 5); // Show top 5 cheapest

    sortedModels.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.name}`);
      console.log(`     Cost: ${model.sats_pricing.max_cost} sats max`);
      console.log(`     Context: ${model.context_length.toLocaleString()} tokens`);
      console.log(`     Modality: ${model.architecture.modality}`);
    });
  }

  /**
   * Check wallet status and handle funding if needed
   */
  private async checkWalletStatus(): Promise<void> {
    const balance = await this.client.getBalance();
    console.log(`\n💰 Wallet Status:`);
    console.log(`   Total Balance: ${balance.total} sats`);
    console.log(`   Available in Proofs: ${balance.proofs} sats`);
    console.log(`   In Active Tokens: ${balance.api} sats`);

    // Check transaction history
    const history = this.client.getTransactionHistory();
    if (history.length > 0) {
      console.log(`   Recent transactions: ${history.length}`);
      const lastTx = history[history.length - 1];
      const lastDate = new Date(lastTx.timestamp).toLocaleString();
      console.log(`   Last: ${lastTx.type} of ${lastTx.amount} sats on ${lastDate}`);
    }

    // Handle low balance
    if (balance.total < 100) {
      console.log('\n💸 Low balance detected. Setting up funding...');
      await this.setupFunding();
    }
  }

  /**
   * Set up funding options for the wallet
   */
  private async setupFunding(): Promise<void> {
    try {
      // Create a Lightning invoice for 1000 sats
      const invoice = await this.client.createInvoice(1000);
      
      if (invoice.success && invoice.invoice) {
        console.log('\n⚡ Lightning Invoice Created:');
        console.log(`   Amount: 1000 sats`);
        console.log(`   Invoice: ${invoice.invoice}`);
        console.log(`   Quote ID: ${invoice.quoteId}`);
        console.log('\n💡 Instructions:');
        console.log('   1. Pay the invoice above with any Lightning wallet');
        console.log('   2. Funds will be automatically added to your balance');
        console.log('   3. You can then start using the AI models');
        
        // In a real app, you might:
        // - Show a QR code for the invoice
        // - Poll for payment confirmation
        // - Update the UI when payment is received
        
        console.log('\n🔄 To check payment status:');
        console.log(`   const paid = await client.checkInvoice('${invoice.quoteId}');`);
      }
      
      // Show Cashu token import option
      console.log('\n🪙 Alternative: Import Cashu Token');
      console.log('   If you have a Cashu token, use:');
      console.log('   const result = await client.importCashuToken(tokenString);');
      
    } catch (error) {
      console.error('❌ Failed to create funding options:', error);
    }
  }

  /**
   * Start an interactive chat session
   */
  async startChat(): Promise<void> {
    const balance = await this.client.getBalance();
    
    if (balance.total < 50) {
      console.log('💸 Insufficient balance for chat. Please add funds first.');
      return;
    }

    console.log('\n💬 Starting interactive chat session...');
    console.log('   Type "exit" to end the conversation');
    console.log('   Type "balance" to check your balance');
    console.log('   Type "history" to see conversation history\n');

    // Initialize conversation with a system prompt
    this.conversationHistory = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise but informative.'
      }
    ];

    // Simulate user inputs for demonstration
    const demoInputs = [
      'Hello! Can you explain what Routstr is?',
      'How does the payment system work?',
      'What are the benefits of using Nostr for authentication?'
    ];

    for (const input of demoInputs) {
      await this.processUserInput(input);
      console.log('\n' + '─'.repeat(50) + '\n');
    }
  }

  /**
   * Process a user input and get AI response
   */
  private async processUserInput(input: string): Promise<void> {
    console.log(`👤 User: ${input}`);

    // Handle special commands
    if (input.toLowerCase() === 'balance') {
      const balance = await this.client.getBalance();
      console.log(`💰 Current balance: ${balance.total} sats`);
      return;
    }

    if (input.toLowerCase() === 'history') {
      this.showConversationHistory();
      return;
    }

    if (input.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      return;
    }

    try {
      // Add user message to conversation
      this.conversationHistory.push({
        role: 'user',
        content: input
      });

      // Get the most affordable model that can handle this conversation
      const model = await this.selectOptimalModel();
      
      console.log(`🤖 Using model: ${model.name} (${model.sats_pricing.max_cost} sats)`);

      // Stream the response for real-time feedback
      let response = '';
      console.log('🤖 Assistant: ');
      
      await this.client.streamChatCompletion(
        {
          model: model.id,
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
                     onToken: (token) => {
             // In a real app, update UI with token
             console.log(token);
             response += token;
           },
          onComplete: (fullResponse) => {
            console.log('\n');
            // Add assistant response to conversation history
            this.conversationHistory.push({
              role: 'assistant',
              content: fullResponse
            });
          },
          onError: (error) => {
            console.error('\n❌ Stream error:', error.message);
          }
        }
      );

      // Show updated balance
      const newBalance = await this.client.getBalance();
      console.log(`💰 Balance after response: ${newBalance.total} sats`);

    } catch (error) {
      await this.handleChatError(error);
    }
  }

  /**
   * Select the optimal model based on balance and requirements
   */
  private async selectOptimalModel() {
    const models = this.client.getModels();
    const balance = await this.client.getBalance();

    // Find affordable models
    const affordableModels = models.filter(
      model => balance.total >= model.sats_pricing.max_cost
    );

    if (affordableModels.length === 0) {
      throw new Error('No affordable models available with current balance');
    }

    // Sort by cost efficiency (performance vs cost)
    // For this demo, we'll just pick the cheapest available
    const selectedModel = affordableModels.sort(
      (a, b) => a.sats_pricing.max_cost - b.sats_pricing.max_cost
    )[0];

    return selectedModel;
  }

  /**
   * Handle various types of chat errors
   */
  private async handleChatError(error: unknown): Promise<void> {
    console.log('\n❌ Error occurred:');

    if (isInsufficientBalanceError(error)) {
      console.log('💸 Insufficient balance for this request');
      console.log('   Please add more funds to continue chatting');
      await this.setupFunding();
    } else if (isNetworkError(error)) {
      console.log('🌐 Network error occurred');
      console.log('   Please check your internet connection and try again');
    } else if (error instanceof ValidationError) {
      console.log('🔍 Configuration error');
      console.log('   Please check your client configuration');
    } else {
      console.log('   Unknown error:', error);
    }
  }

  /**
   * Display conversation history
   */
  private showConversationHistory(): void {
    console.log('\n📜 Conversation History:');
    this.conversationHistory
      .filter(msg => msg.role !== 'system')
      .forEach((message, index) => {
        const role = message.role === 'user' ? '👤' : '🤖';
        const content = typeof message.content === 'string' 
          ? message.content 
          : message.content.find(c => c.type === 'text')?.text || '[Non-text content]';
        
        console.log(`${index + 1}. ${role} ${message.role}: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`);
      });
  }

  /**
   * Clean up and show final statistics
   */
  async cleanup(): Promise<void> {
    console.log('\n📊 Session Summary:');
    
    const balance = await this.client.getBalance();
    console.log(`   Final balance: ${balance.total} sats`);
    
    const history = this.client.getTransactionHistory();
    const sessionTransactions = history.filter(
      tx => tx.timestamp > Date.now() - 3600000 // Last hour
    );
    
    if (sessionTransactions.length > 0) {
      const totalSpent = sessionTransactions
        .filter(tx => tx.type === 'spent')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log(`   Transactions this session: ${sessionTransactions.length}`);
      console.log(`   Total spent: ${totalSpent} sats`);
    }
    
    const conversationLength = this.conversationHistory.filter(
      msg => msg.role !== 'system'
    ).length;
    console.log(`   Messages exchanged: ${conversationLength}`);
  }
}

// Example usage
async function runCompleteExample() {
  // Replace with your actual nsec
  const userNsec = 'nsec1your_private_key_here';
  
  try {
    const app = new RoutstrApp(userNsec);
    
    // Initialize the application
    await app.initialize();
    
    // Start interactive chat
    await app.startChat();
    
    // Clean up and show statistics
    await app.cleanup();
    
  } catch (error) {
    console.error('Application error:', error);
  }
}

// Run the example (uncomment to execute)
// runCompleteExample().catch(console.error);

export { RoutstrApp }; 