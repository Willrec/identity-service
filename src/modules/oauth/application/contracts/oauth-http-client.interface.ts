export interface IOAuthHttpClient {
  postForm<T>(url: string, data: Record<string, string>): Promise<T>;
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
}
