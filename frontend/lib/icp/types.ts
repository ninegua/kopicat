export type Clip = {
  blob: Uint8Array;
  created_at: number;
  expires_at: number;
  burn_after_read: boolean;
};

export type ClipInput = {
  id: string;
  blob: Uint8Array;
  expires_after?: number;
  burn_after_read: boolean;
  sha256?: Uint8Array;
};
