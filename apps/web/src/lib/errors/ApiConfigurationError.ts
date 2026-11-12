/** The API base URL is missing or invalid: show a configuration error, never retry. */
export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}
