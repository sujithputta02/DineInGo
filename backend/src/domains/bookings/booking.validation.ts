import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../../middleware/inputValidation';

/**
 * Validation rules for creating a standard booking
 */
export const validateCreateBookingRules = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('date')
    .notEmpty()
    .withMessage('Date is required'),
  body('time')
    .notEmpty()
    .withMessage('Time is required'),
  body('seats')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Seats must be between 1 and 100'),
  body('guests')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Guests must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Validation rules for table booking (slot hold/reserve/cancel)
 */
export const validateTableBookingRules = [
  body('restaurantId')
    .notEmpty()
    .withMessage('restaurantId is required'),
  body('tableId')
    .notEmpty()
    .withMessage('tableId is required'),
  body('date')
    .notEmpty()
    .withMessage('date is required'),
  body('time')
    .notEmpty()
    .withMessage('time is required'),
  body('userId')
    .notEmpty()
    .withMessage('userId is required'),
  body('guests')
    .notEmpty()
    .withMessage('guests count is required'),
  body('status')
    .notEmpty()
    .isIn(['blocked', 'reserved', 'cancelled', 'confirmed'])
    .withMessage('status must be one of: blocked, reserved, cancelled, confirmed'),
  handleValidationErrors
];

/**
 * Validation rules for booking ID URL parameter
 */
export const validateBookingIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  handleValidationErrors
];

/**
 * Validation rules for dynamic fee query parameters
 */
export const validateDynamicFeeRules = [
  query('restaurantId')
    .notEmpty()
    .withMessage('restaurantId query parameter is required'),
  query('date')
    .notEmpty()
    .withMessage('date query parameter is required'),
  query('time')
    .notEmpty()
    .withMessage('time query parameter is required'),
  handleValidationErrors
];
