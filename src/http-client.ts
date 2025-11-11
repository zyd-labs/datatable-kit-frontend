declare const window: Window & typeof globalThis;

export interface DatatableHttpRequestConfig {
    params?: Record<string, unknown>;
    headers?: Record<string, string | number | boolean>;
    responseType?: 'json' | 'blob' | 'arraybuffer' | string;
    [key: string]: unknown;
}

export interface DatatableHttpResponse<T = unknown> {
    data: T;
    headers?: Record<string, string | string[] | undefined>;
}

export interface DatatableHttpClient {
    get<T = unknown>(url: string, config?: DatatableHttpRequestConfig): Promise<DatatableHttpResponse<T>>;
}

let httpClient: DatatableHttpClient | null = null;

export function registerDatatableHttpClient(client: DatatableHttpClient): void {
    httpClient = client;
}

export function resolveDatatableHttpClient(): DatatableHttpClient {
    if (httpClient === null) {
        throw new Error('Datatable HTTP istemcisi kaydedilmeden kullanılamaz.');
    }

    return httpClient;
}

export function hasDatatableHttpClient(): boolean {
    return httpClient !== null;
}

export function resetDatatableHttpClient(): void {
    httpClient = null;
}

