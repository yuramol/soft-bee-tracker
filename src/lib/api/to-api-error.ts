import type { ApiError } from '@/types/api-error';

export function toApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;

    return {
      message: error.message,
      statusCode
    };
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 500
  };
}
