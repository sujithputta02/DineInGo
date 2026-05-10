/**
 * SECURITY: Secret & API Key Management
 * Centralized management of all secrets and API keys
 * - All keys loaded from environment variables
 * - No hardcoded secrets
 * - Validation of required keys on startup
 * - Secure key rotation support
 */

interface SecretConfig {
  name: string;
  envVar: string;
  required: boolean;
  description: string;
}

/**
 * Define all secrets and their configuration
 */
const SECRETS_CONFIG: SecretConfig[] = [
  {
    name: 'MONGODB_URI',
    envVar: 'MONGODB_URI',
    required: true,
    description: 'MongoDB connection string'
  },
  {
    name: 'JWT_SECRET',
    envVar: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret'
  },
  {
    name: 'FIREBASE_API_KEY',
    envVar: 'FIREBASE_API_KEY',
    required: true,
    description: 'Firebase API key'
  },
  {
    name: 'FIREBASE_AUTH_DOMAIN',
    envVar: 'FIREBASE_AUTH_DOMAIN',
    required: true,
    description: 'Firebase auth domain'
  },
  {
    name: 'FIREBASE_PROJECT_ID',
    envVar: 'FIREBASE_PROJECT_ID',
    required: true,
    description: 'Firebase project ID'
  },
  {
    name: 'SARVAM_API_KEY',
    envVar: 'SARVAM_API_KEY',
    required: false,
    description: 'Sarvam AI API key'
  },
  {
    name: 'OPENROUTER_API_KEY',
    envVar: 'OPENROUTER_API_KEY',
    required: false,
    description: 'OpenRouter API key'
  },
  {
    name: 'STRIPE_SECRET_KEY',
    envVar: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key'
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    envVar: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook secret'
  },
  {
    name: 'ADMIN_CODE',
    envVar: 'ADMIN_CODE',
    required: true,
    description: 'Admin login code'
  },
  {
    name: 'EMAIL_SERVICE_API_KEY',
    envVar: 'EMAIL_SERVICE_API_KEY',
    required: false,
    description: 'Email service API key'
  },
  {
    name: 'REDIS_PASSWORD',
    envVar: 'REDIS_PASSWORD',
    required: false,
    description: 'Redis password'
  },
  {
    name: 'SESSION_SECRET',
    envVar: 'SESSION_SECRET',
    required: true,
    description: 'Session encryption secret'
  },
  {
    name: 'GOOGLE_MAPS_API_KEY',
    envVar: 'GOOGLE_MAPS_API_KEY',
    required: true,
    description: 'Google Maps API key for geocoding and places'
  }
];

/**
 * Secret Manager Class
 * Handles loading, validation, and access to secrets
 */
class SecretManager {
  private secrets: Map<string, string> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize and validate all secrets
   * Should be called on application startup
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('✓ Secret Manager already initialized');
      return;
    }

    console.log('\n🔐 Initializing Secret Manager...');
    
    const missingSecrets: string[] = [];
    const loadedSecrets: string[] = [];

    for (const secret of SECRETS_CONFIG) {
      const value = process.env[secret.envVar];

      if (!value) {
        if (secret.required) {
          missingSecrets.push(`${secret.name} (${secret.description})`);
        } else {
          console.log(`⚠️  Optional secret not configured: ${secret.name}`);
        }
      } else {
        this.secrets.set(secret.name, value);
        loadedSecrets.push(secret.name);
      }
    }

    if (missingSecrets.length > 0) {
      console.error('\n❌ CRITICAL: Missing required secrets:');
      missingSecrets.forEach(secret => console.error(`   - ${secret}`));
      console.error('\nPlease set these environment variables before starting the application.');
      process.exit(1);
    }

    console.log(`✓ Successfully loaded ${loadedSecrets.length} secrets`);
    console.log(`✓ All required secrets are configured\n`);
    
    this.initialized = true;
  }

  /**
   * Get a secret by name
   * @param name - Secret name
   * @returns Secret value
   * @throws Error if secret not found
   */
  public getSecret(name: string): string {
    if (!this.initialized) {
      throw new Error('SecretManager not initialized. Call initialize() first.');
    }

    const value = this.secrets.get(name);
    if (!value) {
      throw new Error(`Secret not found: ${name}`);
    }

    return value;
  }

  /**
   * Check if a secret exists
   */
  public hasSecret(name: string): boolean {
    return this.secrets.has(name);
  }

  /**
   * Get all loaded secret names (for debugging)
   * Does NOT return actual values
   */
  public getLoadedSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Validate that a secret meets minimum requirements
   */
  public validateSecret(name: string, minLength: number = 8): boolean {
    const value = this.getSecret(name);
    return value.length >= minLength;
  }

  /**
   * Rotate a secret (update in memory)
   * In production, this should trigger key rotation in external services
   */
  public rotateSecret(name: string, newValue: string): void {
    if (!newValue || newValue.length < 8) {
      throw new Error('New secret value must be at least 8 characters');
    }

    this.secrets.set(name, newValue);
    console.log(`✓ Secret rotated: ${name}`);
    
    // TODO: In production, trigger key rotation in external services
    // - Stripe key rotation
    // - API key rotation
    // - etc.
  }

  /**
   * Mask a secret for logging (show only last 4 characters)
   */
  public maskSecret(name: string): string {
    const value = this.getSecret(name);
    if (value.length <= 4) {
      return '****';
    }
    return '***' + value.slice(-4);
  }
}

// Export singleton instance
export const secretManager = new SecretManager();

/**
 * Helper functions for common secrets
 */
export const getMongoDBUri = (): string => secretManager.getSecret('MONGODB_URI');
export const getJWTSecret = (): string => secretManager.getSecret('JWT_SECRET');
export const getSessionSecret = (): string => secretManager.getSecret('SESSION_SECRET');
export const getAdminCode = (): string => secretManager.getSecret('ADMIN_CODE');
export const getGoogleMapsApiKey = (): string => secretManager.getSecret('GOOGLE_MAPS_API_KEY');
export const getSarvamApiKey = (): string | null => {
  try {
    return secretManager.getSecret('SARVAM_API_KEY');
  } catch {
    return null;
  }
};
export const getOpenRouterApiKey = (): string | null => {
  try {
    return secretManager.getSecret('OPENROUTER_API_KEY');
  } catch {
    return null;
  }
};
export const getStripeSecretKey = (): string | null => {
  try {
    return secretManager.getSecret('STRIPE_SECRET_KEY');
  } catch {
    return null;
  }
};

export default secretManager;
