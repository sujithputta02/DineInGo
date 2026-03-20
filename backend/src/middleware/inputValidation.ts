import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query, param } from 'express-validator';

/**
 * SECURITY: Input Validation & Sanitization Middleware
 * Implements strict schema-based validation following OWASP guidelines
 * - Type checking
 * - Length limits
 * - Reject unexpected fields
 * - Sanitization of user inputs
 */

/**
 * Validation error handler middleware
 * Returns 400 with detailed validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err: any) => ({
        field: err.param || err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Middleware to reject unexpected fields
 * Only allows specified fields in request body
 */
export const rejectUnexpectedFields = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      const unexpectedFields = Object.keys(req.body).filter(
        key => !allowedFields.includes(key)
      );
      
      if (unexpectedFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unexpected fields in request',
          unexpectedFields
        });
      }
    }
    next();
  };
};

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * User Registration Validation
 */
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Display name contains invalid characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
];

/**
 * User Login Validation
 */
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 1, max: 128 })
    .withMessage('Invalid password'),
];

/**
 * Review Submission Validation
 */
export const validateReviewSubmission = [
  body('rating')
    .isFloat({ min: 0.5, max: 5 })
    .withMessage('Rating must be between 0.5 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Comment must be 10-5000 characters'),
  body('userId')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Invalid user ID'),
  body('userName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('User name must be 1-100 characters'),
];

/**
 * Booking Validation
 */
export const validateBooking = [
  body('date')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('guests')
    .isInt({ min: 1, max: 100 })
    .withMessage('Guests must be between 1 and 100'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special requests must be max 1000 characters'),
];

/**
 * Event Registration Validation
 */
export const validateEventRegistration = [
  body('numberOfGuests')
    .isInt({ min: 1, max: 100 })
    .withMessage('Number of guests must be between 1 and 100'),
  body('selectedSeatIds')
    .optional()
    .isArray()
    .withMessage('Selected seats must be an array'),
];

/**
 * Password Reset Validation
 */
export const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

/**
 * Search Query Validation
 */
export const validateSearchQuery = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be 1-200 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
];

/**
 * Business Search Query Validation
 */
export const validateBusinessSearch = [
  query('type')
    .optional()
    .isIn(['restaurant', 'event', 'both', 'all'])
    .withMessage('Invalid business type'),
  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape()
    .withMessage('Location must not exceed 100 characters'),
  query('cuisine')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .escape()
    .withMessage('Cuisine must not exceed 50 characters'),
];

/**
 * MongoDB ObjectId Validation
 */
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

/**
 * Sanitize and validate pagination
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be >= 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export default {
  handleValidationErrors,
  rejectUnexpectedFields,
  validateUserRegistration,
  validateUserLogin,
  validateReviewSubmission,
  validateBooking,
  validateEventRegistration,
  validatePasswordReset,
  validateSearchQuery,
  validateBusinessSearch,
  validateObjectId,
  validatePagination
};


/**
 * ADMIN INPUT VALIDATION
 * Strict validation for admin operations
 */

/**
 * Validate admin OTP request
 */
export const validateAdminOtpRequest = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .trim()
    .escape(),
];

/**
 * Validate admin OTP verification
 */
export const validateAdminOtpVerification = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .trim()
    .escape(),
  body('otp')
    .isString()
    .withMessage('OTP must be a string')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must contain only digits')
    .trim(),
];

/**
 * Validate admin notification
 */
export const validateAdminNotification = [
  body('title')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim()
    .escape(),
  body('message')
    .isString()
    .withMessage('Message must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .trim()
    .escape(),
  body('type')
    .optional()
    .isIn(['info', 'warning', 'error', 'success'])
    .withMessage('Type must be one of: info, warning, error, success'),
  body('targetType')
    .optional()
    .isIn(['all', 'users', 'businesses'])
    .withMessage('Target type must be one of: all, users, businesses'),
];

/**
 * Validate admin user status toggle
 */
export const validateAdminUserStatusToggle = [
  body('userId')
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ min: 1, max: 128 })
    .withMessage('User ID must be between 1 and 128 characters')
    .trim(),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * Validate admin business status toggle
 */
export const validateAdminBusinessStatusToggle = [
  body('businessId')
    .isString()
    .withMessage('Business ID must be a string')
    .isLength({ min: 1, max: 128 })
    .withMessage('Business ID must be between 1 and 128 characters')
    .trim(),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * Validate add admin
 */
export const validateAddAdmin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .trim()
    .escape(),
  body('role')
    .isIn(['admin', 'super_admin'])
    .withMessage('Role must be either admin or super_admin'),
];

/**
 * Validate remove admin
 */
export const validateRemoveAdmin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .trim()
    .escape(),
];


/**
 * BUSINESS INPUT VALIDATION
 * Comprehensive validation for business operations
 */

/**
 * Validate business registration/creation
 */
export const validateBusinessCreation = [
  body('name')
    .isString()
    .withMessage('Business name must be a string')
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name must be between 2 and 200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .trim(),
  body('cuisine')
    .optional()
    .isString()
    .withMessage('Cuisine must be a string')
    .isLength({ max: 100 })
    .withMessage('Cuisine must not exceed 100 characters')
    .trim(),
  body('address')
    .isString()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters')
    .trim(),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  body('priceRange')
    .optional()
    .isIn(['$', '$$', '$$$', '$$$$'])
    .withMessage('Price range must be $, $$, $$$, or $$$$'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10000'),
];

/**
 * Validate business update
 */
export const validateBusinessUpdate = [
  body('name')
    .optional()
    .isString()
    .withMessage('Business name must be a string')
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name must be between 2 and 200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .trim(),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

/**
 * Validate staff member addition
 */
export const validateStaffMember = [
  body('name')
    .isString()
    .withMessage('Staff name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Staff name must be between 2 and 100 characters')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  body('role')
    .isString()
    .withMessage('Role is required')
    .isIn(['manager', 'waiter', 'chef', 'host', 'admin'])
    .withMessage('Invalid role'),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
];

/**
 * Validate promotion creation
 */
export const validatePromotion = [
  body('title')
    .isString()
    .withMessage('Promotion title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .trim()
    .escape(),
  body('description')
    .isString()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
    .trim(),
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('validFrom')
    .isISO8601()
    .withMessage('Valid from date must be in ISO 8601 format'),
  body('validUntil')
    .isISO8601()
    .withMessage('Valid until date must be in ISO 8601 format'),
];

/**
 * Validate campaign creation
 */
export const validateCampaign = [
  body('name')
    .isString()
    .withMessage('Campaign name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Name must be between 3 and 200 characters')
    .trim()
    .escape(),
  body('message')
    .isString()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .trim(),
  body('targetAudience')
    .optional()
    .isIn(['all', 'regulars', 'new', 'inactive'])
    .withMessage('Invalid target audience'),
];

/**
 * Validate review reply
 */
export const validateReviewReply = [
  body('reply')
    .isString()
    .withMessage('Reply is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Reply must be between 1 and 1000 characters')
    .trim(),
];
