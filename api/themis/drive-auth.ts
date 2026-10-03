import { GoogleAuth } from "google-auth-library"

/** Authentication is invoked only by an operator's Drive command, never by website visitors. */
export function driveAccessToken(credentialsFile: string) {
  if (!credentialsFile.trim()) throw new Error("Set THEMIS_GOOGLE_CREDENTIALS_FILE to the backend's Google credential file.")
  const auth = new GoogleAuth({ keyFilename: credentialsFile, scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    clientOptions: { transporterOptions: { timeout: 15_000, retry: false } } })
  return async () => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const token = await Promise.race([auth.getAccessToken(), new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Google authentication timed out.")), 15_000)
      })])
      if (!token) throw new Error("Google authentication unavailable.")
      return token
    } catch { throw new Error("Google authentication unavailable. Check the backend identity and folder sharing.") }
    finally { clearTimeout(timeout) }
  }
}
