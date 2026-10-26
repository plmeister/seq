import { IncomingMessage } from 'http'

export function getUserId(req: IncomingMessage): string {
  const headers = req.headers
  // Trust Authelia/Traefik headers
  const remoteUser = headers['remote-user'] || headers['x-remote-user']
  if (typeof remoteUser === 'string' && remoteUser) {
    return remoteUser
  }
  const remoteEmail = headers['remote-email'] || headers['x-remote-email']
  if (typeof remoteEmail === 'string' && remoteEmail) {
    return remoteEmail
  }
  // Fallback for local dev
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return url.searchParams.get('user') || 'anonymous'
}
