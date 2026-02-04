import { Provider } from './types'
import email from './providers/email'
import slack from './providers/slack'
import teams from './providers/teams'
import discord from './providers/discord'
import zoom from './providers/zoom'

/**
 * Registry of all integration providers
 */
const REGISTRY: Record<string, Provider> = {
    email,
    slack,
    teams,
    discord,
    zoom
};

/**
 * Get an integration provider by key
 */
export function getProvider(key: string): Provider | undefined {
    const provider = REGISTRY[key];
    if (!provider) {
        console.error(`Provider not found: ${key}`);
    }
    return provider;
}

/**
 * For backward compatibility
 */
export function getIntegrationProvider(key: string): Provider | undefined {
    return getProvider(key);
}
