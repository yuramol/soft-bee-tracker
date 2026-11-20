export interface ApiError {
  message: string;
  statusCode?: number;
  // optional machine-readable kind (e.g. concurrent review status change)
  code?: string;
}
