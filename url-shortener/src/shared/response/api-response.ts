export interface ApiResponseBody<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const ApiResponse = {
  success<T>(message: string, data?: T): ApiResponseBody<T> {
    return {
      success: true,
      message,
      data,
    };
  },

  error(message: string): ApiResponseBody<never> {
    return {
      success: false,
      message,
    };
  },
};
