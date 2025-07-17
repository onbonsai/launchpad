# Matcha (0x Swap API) Integration

This application now integrates with Matcha's 0x Swap API to enable token swapping directly within the app for tokens on Base chain.

## Environment Variable

Add the following environment variable to your `.env` file:

```
MATCHA_API_KEY=your_matcha_api_key_here
```

You can obtain an API key from https://0x.org/docs/0x-swap-api/introduction

## API Routes

The integration uses two API routes to protect the API key:

- `/api/matcha/price` - Fetches indicative pricing for swaps
- `/api/matcha/quote` - Fetches firm quotes ready for execution

## Usage

The Matcha integration is used in three places:

1. **Token Page** - Shows a trade component for Base chain tokens with integrated swapping
2. **TokenInfoExternal** - Shows a buy modal with integrated swapping for external tokens
3. **SwapToGenerateModal** - Executes swaps directly without UI when generating content

## Implementation Details

The integration follows the Permit2 flow:
1. Get price quote (via `/api/matcha/price`)
   - Check `issues.allowance.actual` to see current allowance
   - Get `issues.allowance.spender` (the Permit2 contract address)
2. Approve tokens if needed
   - If `issues.allowance.actual` < sellAmount, approve the spender
3. Get firm quote (via `/api/matcha/quote`)
4. Sign Permit2 message (if `permit2.eip712` exists in quote)
   - Sign the EIP-712 data
   - Append signature length (32-byte big-endian) and signature to transaction data
5. Execute transaction with the modified transaction data 