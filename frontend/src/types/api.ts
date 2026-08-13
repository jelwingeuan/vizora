export type HealthResponse = {
  status: string
  service: string
}

export type BackendConnectionStatus =
  | 'checking'
  | 'connected'
  | 'offline'