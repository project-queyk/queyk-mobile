/**
 * Authentication Configuration
 *
 * This file contains configuration settings for the authentication system.
 */

export const AUTH_CONFIG = {
  /**
   * Allowed email domain for sign-in
   * Only users with email addresses ending with this domain will be allowed to sign in.
   *
   *
   * To allow all domains, set this to null or an empty string.
   */
  ALLOWED_EMAIL_DOMAIN: process.env.EXPO_PUBLIC_SCHOOL_EMAIL_DOMAIN,

  /**
   * Whether to enforce domain restriction
   * Set to false to allow any email domain
   */
  ENFORCE_DOMAIN_RESTRICTION: true,
} as const;

/**
 * Helper function to validate email domain
 * @param email - The email address to validate
 * @returns true if the email domain is allowed, false otherwise
 */
export const isValidEmailDomain = (email: string): boolean => {
  if (
    !AUTH_CONFIG.ENFORCE_DOMAIN_RESTRICTION ||
    !AUTH_CONFIG.ALLOWED_EMAIL_DOMAIN
  ) {
    return true; // Allow all domains if restriction is disabled
  }

  return email.toLowerCase().endsWith(AUTH_CONFIG.ALLOWED_EMAIL_DOMAIN);
};

/**
 * Get a user-friendly error message for domain restriction
 * @param attemptedEmail - The email that was attempted
 * @returns Error message string
 */
export const getDomainRestrictionMessage = (attemptedEmail: string): string => {
  return `Only ${AUTH_CONFIG.ALLOWED_EMAIL_DOMAIN} email addresses are allowed. You signed in with: ${attemptedEmail}`;
};
