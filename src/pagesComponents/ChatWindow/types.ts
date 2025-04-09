export type Language = 'en' | 'th' | 'zh';

export type StreamEntry = {
  timestamp: Date;
  type:
    | 'create_wallet'
    | 'request_faucet_funds'
    | 'get_balance'
    | 'swap_token'
    | 'transfer_token'
    | 'transfer_nft'
    | 'user'
    | 'tools'
    | 'agent'
    | 'completed';
  content: string;
  attachments?: Attachment[];
};

export type AnimatedData = {
  earned: number;
  spent: number;
  nftsOwned: number;
  tokensOwned: number;
  transactions: number;
  thoughts: number;
};

export type AgentMessage = {
  data?: string;
  event: 'agent' | 'tools' | 'completed' | 'error';
  functions?: string[];
  attachments?: Attachment[];
};

export type Attachment = {
  source?: string;
  url?: string;
  title?: string;
  button: {
    label: string;
    text?: string;
    url?: string;
    payload?: Payload;
    useLabel?: boolean;
  }
};

export type Payload = {
  action: string;
  data: any;
};