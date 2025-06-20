/**
 * Example: NIP-60 Gift Wrap Protocol for Private Cashu Token Transfers
 *
 * This example demonstrates how to use NIP-60 Gift Wrap protocol to privately
 * send Cashu tokens to another user using Nostr encryption.
 */

import { RoutstrClient, validateNsec } from '../src/index.js';
import { generateApiToken } from '../src/utils/cashu.js';

async function nip60GiftWrapExample() {
  console.log('🎁 NIP-60 Gift Wrap Example\n');

  // Initialize two clients (sender and receiver)
  const senderNsec = 'nsec1...'; // Replace with valid nsec
  const receiverNsec = 'nsec1...'; // Replace with another valid nsec

  if (!validateNsec(senderNsec) || !validateNsec(receiverNsec)) {
    console.error('❌ Please provide valid nsec keys for both sender and receiver');
    return;
  }

  const sender = new RoutstrClient({ nsec: senderNsec });
  const receiver = new RoutstrClient({ nsec: receiverNsec });

  try {
    await Promise.all([sender.init(), receiver.init()]);

    console.log('👤 Sender:', sender.getFormattedPublicKey());
    console.log('👤 Receiver:', receiver.getFormattedPublicKey());
    console.log();

    // Check sender's balance
    const senderBalance = await sender.getBalance();
    console.log(`💰 Sender Balance: ${senderBalance.total} sats`);

    if (senderBalance.total < 100) {
      console.log('❌ Sender needs more funds to send a gift');
      console.log('💡 Use createInvoice() or importCashuToken() to add funds');
      return;
    }

    // Step 1: Create a Cashu token to send as a gift
    console.log('\n🪙 Creating Cashu token for gift...');
    const giftAmount = 50; // sats

    // Generate a Cashu token from sender's proofs
    const cashuToken = await generateApiToken(sender.getConfig().mintUrl!, giftAmount);

    if (!cashuToken) {
      console.log('❌ Failed to create Cashu token for gift');
      return;
    }

    console.log(`✅ Created ${giftAmount} sat Cashu token`);

    // Step 2: Wrap the token using NIP-60 Gift Wrap
    console.log('\n🎁 Wrapping token with NIP-60 Gift Wrap...');
    const wrapResult = await sender.wrapCashuToken(
      cashuToken,
      receiver.getPublicKey(),
      `🎉 Here's ${giftAmount} sats! Enjoy using Routstr AI models!`
    );

    if (!wrapResult.success || !wrapResult.event) {
      console.log('❌ Failed to wrap token:', wrapResult.message);
      return;
    }

    console.log('✅ Token wrapped successfully!');
    console.log(`📧 Gift event ID: ${wrapResult.event.id}`);
    console.log(`🔐 Encrypted for recipient: ${receiver.getFormattedPublicKey()}`);

    // Step 3: Simulate receiving the gift (in real app, this would come via Nostr relay)
    console.log('\n📨 Receiver attempting to unwrap gift...');
    const unwrapResult = await receiver.unwrapCashuToken(wrapResult.event);

    if (!unwrapResult.success || !unwrapResult.gift) {
      console.log('❌ Failed to unwrap gift:', unwrapResult.message);
      return;
    }

    console.log('✅ Gift unwrapped successfully!');
    console.log(`💰 Received: ${giftAmount} sat Cashu token`);
    console.log(`💌 Note: "${unwrapResult.gift.note}"`);

    // Step 4: Import the received token
    console.log('\n💸 Importing received Cashu token...');
    const importResult = await receiver.importCashuToken(unwrapResult.gift.token);

    if (importResult.success) {
      console.log(`✅ Successfully imported ${importResult.amount} sats!`);

      // Check updated balance
      const receiverBalance = await receiver.getBalance();
      console.log(`💰 Receiver New Balance: ${receiverBalance.total} sats`);
    } else {
      console.log('❌ Failed to import token:', importResult.message);
    }

    // Step 5: Demonstrate stored wrapped tokens management
    console.log('\n📦 Managing Stored Wrapped Tokens:');
    const storedTokens = sender.getStoredWrappedTokens();
    console.log(`📊 Sender has ${storedTokens.length} stored wrapped tokens`);

    if (storedTokens.length > 0) {
      console.log('🔍 Recent wrapped tokens:');
      storedTokens.slice(-3).forEach((token, index) => {
        const recipient = token.tags.find(tag => tag[0] === 'p')?.[1];
        const timestamp = new Date(token.created_at * 1000).toLocaleString();
        console.log(`   ${index + 1}. To: ${recipient?.slice(0, 16)}... at ${timestamp}`);
      });
    }

    // Step 6: Validate gift wrap events
    console.log('\n🔍 Validating Gift Wrap Events:');
    const isValid = receiver.isValidCashuGiftWrap(wrapResult.event);
    console.log(`✅ Event validation: ${isValid ? 'Valid NIP-60 Cashu gift' : 'Invalid'}`);

    console.log('\n🎉 NIP-60 Gift Wrap demonstration completed!');
    console.log('\n💡 In a real application:');
    console.log('   • Send wrapped events via Nostr relays');
    console.log('   • Listen for incoming gift events');
    console.log('   • Automatically process received gifts');
    console.log('   • Show gift history in the UI');
  } catch (error) {
    console.error('❌ Error in NIP-60 gift wrap example:', error);
  }
}

// Real-world usage patterns
async function realWorldNip60Usage() {
  console.log('\n🌍 Real-World NIP-60 Usage Patterns:\n');

  console.log('1. 🎁 Sending AI Credits as Gifts:');
  console.log(
    '   const gift = await client.wrapCashuToken(token, friendPubkey, "Try this AI model!");'
  );
  console.log('   await publishToNostr(gift.event);');

  console.log('\n2. 📱 Mobile App Integration:');
  console.log('   // Listen for incoming gifts');
  console.log('   relay.on("event", async (event) => {');
  console.log('     if (client.isValidCashuGiftWrap(event)) {');
  console.log('       const result = await client.unwrapCashuToken(event);');
  console.log('       if (result.success) showGiftNotification(result.gift);');
  console.log('     }');
  console.log('   });');

  console.log('\n3. 💼 Business Use Cases:');
  console.log('   • Customer rewards and incentives');
  console.log('   • Affiliate payouts in AI credits');
  console.log('   • Educational platform token distribution');
  console.log('   • Gaming rewards and achievements');

  console.log('\n4. 🔐 Privacy Benefits:');
  console.log('   • End-to-end encrypted token transfers');
  console.log('   • No on-chain transaction fees');
  console.log('   • Pseudonymous via Nostr pubkeys');
  console.log('   • No KYC or account requirements');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  nip60GiftWrapExample()
    .then(() => realWorldNip60Usage())
    .catch(console.error);
}
