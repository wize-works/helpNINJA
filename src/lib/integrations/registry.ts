import { Provider } from './types'
import email from './providers/email'
import slack from './providers/slack'

const REGISTRY: Record<string, Provider> = { email, slack }
export function getProvider(key: string) { return REGISTRY[key] }
