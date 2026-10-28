// Minimal typings for Google Identity Services (https://accounts.google.com/gsi/client)
interface GoogleCredentialResponse {
  credential: string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (options: {
          client_id: string
          callback: (response: GoogleCredentialResponse) => void
          hd?: string
          auto_select?: boolean
        }) => void
        renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        disableAutoSelect: () => void
      }
    }
  }
}
