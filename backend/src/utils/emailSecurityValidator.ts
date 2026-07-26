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
   */
  private async loadDisposableDomainsFromGitHub(): Promise<void> {
    try {
      const response = await axios.get(this.GITHUB_BLOCKLIST_URL, { timeout: 10000 });
      const domains = response.data
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('#'))
        .map((domain: string) => domain.trim().toLowerCase());

      this.disposableDomainsCache.domains = new Set(domains);
      this.disposableDomainsCache.lastUpdated = Date.now();
      
      console.log(`[EmailSecurity] Loaded ${domains.length} disposable domains`);
    } catch (error) {
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
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const cacheAge = Date.now() - this.disposableDomainsCache.lastUpdated;
    if (cacheAge > this.CACHE_TTL) {
      try {
        await this.loadDisposableDomainsFromGitHub();
      } catch (error) {
        console.warn('[EmailSecurity] Failed to refresh blocklist, using existing cache');
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
   */
  public async isDisposableEmail(email: string): Promise<boolean> {
    if (!email || !email.includes('@')) {
      return true; // Invalid email format
    }

    await this.refreshCacheIfNeeded();

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
   */
  public async validateEmail(email: string): Promise<{
    isValid: boolean;
    reason?: string;
    domain?: string;
  }> {
    // 1. Format validation
    if (!this.isValidEmailFormat(email)) {
      return {
        isValid: false,
        reason: 'Invalid email format'
      };
    }

    const domain = this.extractDomain(email);

    // 2. Check for disposable domains
    const isDisposable = await this.isDisposableEmail(email);
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
