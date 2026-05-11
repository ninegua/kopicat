import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import type { Clip, ClipInput } from './types';
import { idlFactory } from '$generated/backend-did';

const DEFAULT_HOST = 'https://icp-api.io';
const LOCAL_HOST = 'http://localhost:4943';

const canisterIdEnv = import.meta.env?.VITE_CANISTER_ID || '';

const isLocal = () => {
  const host = import.meta.env?.VITE_AGENT_HOST || DEFAULT_HOST;
  return host === LOCAL_HOST || host.includes('localhost') || host.includes('127.0.0.1');
};

let agentPromise: Promise<HttpAgent> | null = null;
let identity: Ed25519KeyIdentity | null = null;

async function getAgent(): Promise<HttpAgent> {
  if (agentPromise) return agentPromise;

  if (!identity) {
    const seed = isLocal() ? new Uint8Array(32).fill(0) : new Uint8Array(32);
    identity = Ed25519KeyIdentity.generate(seed);
  }

  const host = import.meta.env?.VITE_AGENT_HOST || DEFAULT_HOST;

  agentPromise = HttpAgent.create({
    host,
    identity,
    shouldFetchRootKey: isLocal(),
  });

  return agentPromise;
}

function getCanisterId(): Principal {
  if (!canisterIdEnv) {
    throw new Error('VITE_CANISTER_ID is not set. Please configure the canister ID.');
  }
  return Principal.fromText(canisterIdEnv);
}

interface CanisterActor {
  create_clip: (input: {
    id: string;
    blob: string;
    expires_after?: bigint | bigint[];
    burn_after_read: boolean;
  }) => Promise<{ ok?: string; err?: string }>;
  get_clip: (id: string) => Promise<[] | [Clip]>;
}

let actorPromise: Promise<CanisterActor> | null = null;

async function getActor(): Promise<CanisterActor> {
  if (actorPromise) return actorPromise;

  const agent = await getAgent();
  const canisterId = getCanisterId();

  const actor = Actor.createActor<CanisterActor>(idlFactory, {
    agent,
    canisterId,
    effectiveCanisterId: canisterId,
  });

  actorPromise = Promise.resolve(actor);
  return actorPromise;
}

export async function createClip(input: ClipInput): Promise<{ ok: string } | { error: string }> {
  try {
    const actor = await getActor();

    const result = await actor.create_clip({
      id: input.id,
      blob: input.blob,
      expires_after: input.expires_after !== undefined ? [BigInt(input.expires_after)] : [],
      burn_after_read: input.burn_after_read,
    });

    if ('ok' in result && result.ok) {
      return { ok: result.ok };
    }
    if ('err' in result && result.err) {
      return { error: result.err };
    }

    return { error: 'Unknown result format' };
  } catch (err) {
    console.log(err);
    return { error: 'Network Error. Please check your connection and try again.' };
  }
}

export async function fetchClip(id: string): Promise<Clip | null> {
  try {
    const actor = await getActor();

    const result = await actor.get_clip(id);

    const clip = result.pop();
    if (clip) {
      return {
        blob: clip.blob,
        created_at: Number(clip.created_at),
        expires_at: Number(clip.expires_at),
        burn_after_read: clip.burn_after_read,
      };
    }
  } catch (err) {
    console.log(err);
  }
  return null;
}
