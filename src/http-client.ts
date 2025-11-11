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

interface HttpClientStore {
    __ZYD_LABS_DATATABLE_HTTP_CLIENT__?: DatatableHttpClient | null;
}

const httpClientStore = globalThis as HttpClientStore;
const STORE_KEY = '__ZYD_LABS_DATATABLE_HTTP_CLIENT__';

export function registerDatatableHttpClient(client: DatatableHttpClient): void {
    httpClientStore[STORE_KEY] = client;
}

export function resolveDatatableHttpClient(): DatatableHttpClient {
    const client = httpClientStore[STORE_KEY];

    if (!client) {
        throw new Error('Datatable HTTP istemcisi kaydedilmeden kullanılamaz.');
    }

    return client;
}

export function hasDatatableHttpClient(): boolean {
    return Boolean(httpClientStore[STORE_KEY]);
}

export function resetDatatableHttpClient(): void {
    httpClientStore[STORE_KEY] = null;
}

