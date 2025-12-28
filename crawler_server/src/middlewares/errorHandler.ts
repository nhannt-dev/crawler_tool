import { Request, Response, NextFunction } from 'express';
import { IErrorResponse } from '../types';

/**
 * Global Error Handler Middleware
 * 
 * Bắt tất cả errors từ controllers và services
 * Format error response thống nhất
 */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);

  // Determine status code
  let statusCode = 500;
  let errorType = 'Internal Server Error';

  // Custom error handling based on error message
  if (error.message.includes('not found') || error.message.includes('Not Found')) {
    statusCode = 404;
    errorType = 'Not Found';
  } else if (
    error.message.includes('required') ||
    error.message.includes('Invalid') ||
    error.message.includes('must be') ||
    error.message.includes('Validation')
  ) {
    statusCode = 400;
    errorType = 'Bad Request';
  } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
    statusCode = 409;
    errorType = 'Conflict';
  }

  // Format error response
  const errorResponse: IErrorResponse = {
    success: false,
    error: errorType,
    message: error.message || 'An unexpected error occurred',
    statusCode
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 * Xử lý khi route không tồn tại
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
};

/**
 * Async Handler Wrapper
 * Wrap async route handlers để tự động catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
