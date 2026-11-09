/** Leaves the app for the payment gateway; a function of its own so tests can replace it. */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
