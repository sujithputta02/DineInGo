/**
 * Email Security Validator
 * Multi-layered email validation to block disposable/temporary emails
 * Prevents fake signups from throwaway domains like kierko.com
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface DisposableEmailCache {
  domains: Set<string>;
  lastUpdated: number;
}

class EmailSecurityValidator {
  private disposableDomainsCache: DisposableEmailCache = {
    domains: new Set(),
    lastUpdated: 0
  };
  
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly GITHUB_BLOCKLIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the validator by loading blocklist
   */
  private async initialize() {
    try {
      await this.loadDisposableDomainsFromGitHub();
      console.log('[EmailSecurity] ✅ Loaded disposable email blocklist');
    } catch (error) {
      console.warn('[EmailSecurity] ⚠️  Failed to load GitHub blocklist, using fallback');
      this.loadFallbackBlocklist();
    }
  }

  /**
   * Load disposable domains from GitHub (free, auto-updated)
   * Uses a shorter timeout and graceful fallback to prevent 504 errors
   */
  private async loadDisposableDomainsFromGitHub(): Promise<void> {
    try {
      const response = await axios.get(this.GITHUB_BLOCKLIST_URL, { 
        timeout: 5000,  // Reduced from 10000 to 5 seconds for faster fallback
        headers: {
          'User-Agent': 'DineInGo-EmailValidator/1.0'
        }
      });
      
      if (!response.data || response.status !== 200) {
        throw new Error('Invalid response from GitHub');
      }
      
      const domains = response.data
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('#'))
        .map((domain: string) => domain.trim().toLowerCase())
        .filter((domain: string) => domain.length > 0);

      this.disposableDomainsCache.domains = new Set(domains);
      this.disposableDomainsCache.lastUpdated = Date.now();
      
      console.log(`[EmailSecurity] Loaded ${domains.length} disposable domains from GitHub`);
    } catch (error) {
      console.warn('[EmailSecurity] Failed to load GitHub blocklist:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to load GitHub blocklist');
    }
  }

  /**
   * Fallback blocklist with most common throwaway domains
   */
  private loadFallbackBlocklist(): void {
    const commonDisposableDomains = [
      'kierko.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
      'mailinator.com', 'throwaway.email', 'maildrop.cc', 'getnada.com',
      'yopmail.com', 'fakeinbox.com', 'mohmal.com', 'sharklasers.com',
      'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'grr.la',
      'discard.email', 'trashmail.com', 'mail-temp.com', 'temp-mail.org',
      'emailondeck.com', 'mytemp.email', 'tempail.com', 'tmail.ws',
      'burnermail.io', 'mailnesia.com', 'mintemail.com', 'inbox.com',
      'emailtemporar.ro', 'inboxes.com', 'getairmail.com', 'jetable.org'
    ];

    this.disposableDomainsCache.domains = new Set(commonDisposableDomains);
    this.disposableDomainsCache.lastUpdated = Date.now();
  }

  /**
   * Refresh cache if expired
   * Gracefully handles network failures without blocking the request
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const cacheAge = Date.now() - this.disposableDomainsCache.lastUpdated;
    if (cacheAge > this.CACHE_TTL) {
      try {
        // Use Promise.race with timeout to prevent hanging
        await Promise.race([
          this.loadDisposableDomainsFromGitHub(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache refresh timeout')), 8000)
          )
        ]);
      } catch (error) {
        console.warn('[EmailSecurity] Failed to refresh blocklist, using existing cache:', 
          error instanceof Error ? error.message : 'Unknown error');
        // Don't throw - continue with existing cache
      }
    }
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
  }

  /**
   * Check if email is from disposable domain
   * Returns false if validation can't complete (network error, timeout, etc)
   */
  public async isDisposableEmail(email: string): Promise<boolean> {
    if (!email || !email.includes('@')) {
      return true; // Invalid email format
    }

    try {
      await this.refreshCacheIfNeeded();
    } catch (error) {
      // If cache refresh fails due to network issue, continue with existing cache
      console.warn('[EmailSecurity] Cache refresh failed, using existing cache');
    }

    const domain = this.extractDomain(email);
    return this.disposableDomainsCache.domains.has(domain);
  }

  /**
   * Validate email format
   */
  public isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Check for suspicious patterns
   */
  public hasSuspiciousPatterns(email: string): boolean {
    const suspiciousPatterns = [
      /\+.*@/, // Plus sign addressing (can be legitimate but often used for spam)
      /\d{10,}@/, // Long number sequences before @
      /test|temp|fake|spam|trash|disposable/i, // Suspicious keywords
      /^[a-z]{30,}@/, // Extremely long local part (often random generated)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Check for common typos in popular domains
   */
  public hasCommonDomainTypo(email: string): boolean {
    const domain = this.extractDomain(email);
    const legitimateDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    
    // Check for slight misspellings (e.g., gmial.com, yahooo.com)
    for (const legit of legitimateDomains) {
      if (domain !== legit && this.levenshteinDistance(domain, legit) <= 2) {
        return true; // Likely a typo
      }
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance (string similarity)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Comprehensive validation (main entry point)
   * Designed to never throw - always returns a validation result
   */
  public async validateEmail(email: string): Promise<{
    isValid: boolean;
    reason?: string;
    domain?: string;
  }> {
    try {
      // 1. Format validation
      if (!this.isValidEmailFormat(email)) {
        return {
          isValid: false,
          reason: 'Invalid email format'
        };
      }

      const domain = this.extractDomain(email);

      // 2. Check for disposable domains (with graceful error handling)
      let isDisposable = false;
      try {
        isDisposable = await this.isDisposableEmail(email);
      } catch (error) {
        console.warn('[EmailSecurity] Error checking disposable email:', 
          error instanceof Error ? error.message : 'Unknown error');
        // Don't fail validation on network error - continue to other checks
      }
      
      if (isDisposable) {
        return {
          isValid: false,
          reason: 'Disposable email addresses are not allowed',
          domain
        };
      }

      // 3. Check for suspicious patterns
      if (this.hasSuspiciousPatterns(email)) {
        return {
          isValid: false,
          reason: 'Email contains suspicious patterns',
          domain
        };
      }

      // 4. Check for domain typos
      if (this.hasCommonDomainTypo(email)) {
        return {
          isValid: false,
          reason: 'Possible typo in email domain. Please double-check.',
          domain
        };
      }

      return {
        isValid: true,
        domain
      };
    } catch (error) {
      console.error('[EmailSecurity] Unexpected error in validateEmail:', 
        error instanceof Error ? error.message : 'Unknown error');
      // Default to allowing the email if something unexpected happens
      // This prevents service unavailability due to validation errors
      return {
        isValid: true,
        reason: 'Validation skipped due to service issue'
      };
    }
  }

  /**
   * Manual domain blacklist check (for additional custom blocks)
   */
  public addToBlacklist(domain: string): void {
    this.disposableDomainsCache.domains.add(domain.toLowerCase());
  }

  /**
   * Get statistics
   */
  public getStats(): { totalBlockedDomains: number; lastUpdated: Date } {
    return {
      totalBlockedDomains: this.disposableDomainsCache.domains.size,
      lastUpdated: new Date(this.disposableDomainsCache.lastUpdated)
    };
  }
}

// Singleton instance
export const emailSecurityValidator = new EmailSecurityValidator();
