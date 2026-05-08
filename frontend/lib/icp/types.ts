export type Clip = {
  blob: string;
  created_at: number;
  expires_at: number;
  burn_after_read: boolean;
};

export type ClipInput = {
  id: string;
  blob: string;
  expires_after?: number;
  burn_after_read: boolean;
};

export type ClipStats = {
  max_seconds_to_live: number;
  total_clips_created: number;
  available_clips: number;
};
