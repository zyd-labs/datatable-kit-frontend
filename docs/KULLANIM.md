# @zyd-labs/datatable-kit Kullanım Dokümanı

Bu doküman, `@zyd-labs/datatable-kit` paketini üretim ortamına uygun şekilde
entegre etmek için uçtan uca kullanım rehberidir.

## 1) Hızlı Başlangıç

## Amaç

PrimeVue DataTable üzerinde server-side pagination, sort, filter ve export
akışlarını tek bir bileşen/composable/store katmanıyla standartlaştırmak.

## Temel Sözleşme

Paket, backend'den aşağıdaki formatta yanıt bekler:

```json
{
  "data": [],
  "total": 0
}
```

## Kurulum

```bash
npm install git+https://github.com/zyd-labs/datatable-kit-frontend.git#v0.2.0
```

Peer dependency uyumunu kontrol edin:

- `vue@^3.3.0`
- `primevue@^4.0.0`
- `pinia@^3.0.0`
- `@vueuse/core@^14.0.0`
- `@zyd-labs/primevue-lookup@^0.1.0`

## 2) HTTP İstemcisi Entegrasyonu (Zorunlu)

Paket, kendi içinde axios/fetch instance taşımaz. Uygulama başlangıcında
bir kez `registerDatatableHttpClient(...)` çağrılmalıdır.

```ts
// src/plugins/datatable.ts
import { registerDatatableHttpClient } from "@zyd-labs/datatable-kit";
import { http } from "@/services/http";

export function installDatatableKit(): void {
  registerDatatableHttpClient({
    get: (url, config) => http.get(url, config),
  });
}
```

```ts
// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { installDatatableKit } from "./plugins/datatable";

const app = createApp(App);
app.use(createPinia());

installDatatableKit();
app.mount("#app");
```

### Kritik Notlar

- İstemci register edilmeden kullanımda runtime hata alınır.
- Auth header/interceptor/error handling tamamen sizin HTTP katmanınızdan gelir.
- Test senaryolarında `resetDatatableHttpClient()` ile temiz başlangıç yapılabilir.

## 3) Export Edilen API Yüzeyi

Paket girişinden (`@zyd-labs/datatable-kit`) erişilenler:

- `BaseDataTable`
- `useDatatable(...)`
- `useDatatableStore()`
- `registerDatatableHttpClient(...)`
- `resolveDatatableHttpClient()`
- `hasDatatableHttpClient()`
- `resetDatatableHttpClient()`
- Tüm datatable type'ları (`ColumnDef`, `DataTableState`, vb.)

## 4) `BaseDataTable` Kullanımı

## Minimum Örnek

```vue
<template>
  <BaseDataTable
    table-key="users"
    endpoint="/users"
    :columns="columns"
    :global-filter-fields="['name', 'email']"
    default-sort-field="created_at"
    :default-sort-order="-1"
    :default-rows="25"
    selection-mode="multiple"
    @selection-change="onSelectionChange"
    @filter-change="onFilterChange"
  />
</template>

<script setup lang="ts">
import { BaseDataTable } from "@zyd-labs/datatable-kit";
import type { ColumnDef } from "@zyd-labs/datatable-kit";

const columns: ColumnDef[] = [
  { field: "name", header: "Ad Soyad", sortable: true, filter: true },
  { field: "email", header: "E-posta", sortable: true, filter: true },
  { field: "created_at", header: "Kayıt Tarihi", dataType: "date", sortable: true, filter: true },
];

const onSelectionChange = (rows: unknown[]) => {
  console.log(rows);
};

const onFilterChange = (filters: Record<string, unknown>) => {
  console.log(filters);
};
</script>
```

### Props

- `tableKey` (zorunlu): Store üzerinde tablo durumunu ayıran benzersiz anahtar.
- `endpoint` (zorunlu): Veri ve export çağrılarında kullanılacak endpoint.
- `columns` (zorunlu): Sütun, filtre, render ve varsayılan filtre tanımı.
- `globalFilterFields` (opsiyonel): PrimeVue global aramada kullanılacak alanlar.
- `defaultSortField` / `defaultSortOrder` (opsiyonel): İlk yükleme sıralaması.
- `defaultRows` (opsiyonel, varsayılan `10`): Sayfa başına kayıt.
- `actionsHeader` (opsiyonel, varsayılan `"İşlemler"`): Aksiyon sütunu başlığı.
- `expandedRows` (opsiyonel): Satır açılım durumu.
- `selectionMode` (opsiyonel): `'single' | 'multiple'`.

### Event'ler

- `selection-change(rows)`: Seçili satırlar değiştiğinde tetiklenir.
- `filter-change(filters)`: Filtre değiştiğinde tetiklenir.
- `row-toggle(data)`: Expand/collapse durumunda tetiklenir.

### Slot'lar

- `header-actions`: Sol üst alandaki özel aksiyonlar.
- `actions`: Satır bazlı aksiyon sütunu.
- `expansion`: Satır detay içeriği.

### `defineExpose` ile açılan metotlar

`ref` üzerinden erişilebilir:

- `refreshData()`
- `clearFilters()`
- `exportTable()`
- `getSelectedRows()`
- `clearSelection()`

## 5) Sütun Tanımı (`ColumnDef`) Detayları

`ColumnDef` ile görselleştirme, sıralama, filtreleme ve varsayılan filtre davranışı
merkezi olarak kontrol edilir.

## Sık kullanılan alanlar

- `field`: Backend alan adı.
- `filterField`: Filtreleme için alternatif backend alan adı.
- `header`: Kolon başlığı.
- `sortable`: Sıralama aktif/pasif.
- `filter`: `boolean` veya `ColumnFilterConfig`.
- `dataType`: `'text' | 'numeric' | 'date' | 'boolean' | 'multi-select'`.
- `render`: Hücre özelleştirmesi (fonksiyon veya Vue component).
- `defaultFilter`: İlk yükleme filtresi.
- `visible`: Başlangıçta görünürlük.

## 6) Filtre Tipleri ve Davranışları

`filter.filterType` aşağıdaki tipleri destekler:

- `text`
- `select`
- `multi-select`
- `lookup`
- `lookup-multiple`
- `date`
- `date-range`
- `boolean`

Varsayılan `matchMode` eşleşmeleri:

- `text` -> `contains`
- `select`, `lookup`, `boolean` -> `equals`
- `multi-select`, `lookup-multiple` -> `in`
- `date` -> `dateIs`
- `date-range` -> `between`

### Çoklu seçim örneği

```ts
const columns = [
  {
    field: "status",
    header: "Durum",
    filter: {
      filterType: "multi-select",
      filterOptions: [
        { label: "Açık", value: "open" },
        { label: "Kapalı", value: "closed" },
      ],
      showMatchModes: false,
      showOperator: false,
      maxSelectedLabels: 3,
      placeholder: "Durum seç",
    },
  },
];
```

### Lookup örneği

```ts
const columns = [
  {
    field: "customer_id",
    header: "Müşteri",
    filter: {
      filterType: "lookup",
      lookupEndpoint: "/lookups/customers",
      lookupOptionLabel: "name",
      lookupOptionValue: "id",
      filterPlaceholder: "Müşteri seç",
    },
  },
];
```

## 7) Backend'e Gönderilen İstek Yapısı

`BaseDataTable`, isteğe aşağıdaki alanları gönderir:

- `first`
- `rows`
- `filters`
- `global`
- `sortField` (varsa)
- `sortOrder` (varsa)
- `export=1` (sadece export akışında)

Boş filtre constraint'leri otomatik temizlenir. Tarih değerleri payload'a
`YYYY-MM-DD` formatında normalize edilir.

## 8) Export Akışı

`exportTable()` akışı:

1. Mevcut filtre/sort/pagination state'ini alır.
2. `responseType: "blob"` ile endpoint'e `export=1` parametresi gönderir.
3. `content-disposition` header'ından dosya adı çözmeye çalışır.
4. Blob indirimi tarayıcıda otomatik tetiklenir.

Backend tarafında `Content-Disposition` header'ı set edilmelidir:

```http
Content-Disposition: attachment; filename="users-2026-04-30.xlsx"
```

## 9) Store Kullanımı (`useDatatableStore`)

Store tablo durumunu `tables[tableKey]` altında tutar:

- `first`, `rows`, `sortField`, `sortOrder`, `filters`
- `data`, `total`, `loading`
- `selectedColumns`

### Doğrudan store patch örneği

```ts
import { useDatatableStore } from "@zyd-labs/datatable-kit";

const store = useDatatableStore();
store.patch("users", { rows: 50, first: 0 });
```

## 10) Composable Kullanımı (`useDatatable`)

UI dışında manuel veri çekimi gerektiğinde kullanın:

```ts
import { useDatatable } from "@zyd-labs/datatable-kit";

const { fetchData, exportData } = useDatatable("/users");

const result = await fetchData({
  first: 0,
  rows: 25,
  filters: {
    name: { operator: "and", constraints: [{ value: "Ali", matchMode: "contains" }] },
  },
});

console.log(result.data, result.total);
```

## 11) Geliştirme ve Yerel Paket Akışı

Lokal geliştirme senaryosunda:

```bash
npm install
npm run build
```

Consumer uygulamada alias çözümü gerekiyorsa `tsconfig.json` içinde
`@zyd-labs/datatable-kit` hedefini kaynak klasöre yönlendirin.

## 12) Sorun Giderme

### "Datatable HTTP istemcisi kaydedilmeden kullanılamaz."

Neden: `registerDatatableHttpClient(...)` çağrısı eksik veya geç çalışıyor.

Çözüm: App bootstrap içinde Pinia sonrası, datatable kullanımından önce çağırın.

### Filtre değişiyor ama istek gitmiyor

Neden: Temizlenmiş filtre payload'ı bir öncekiyle aynı.

Çözüm: `filter-change` event payload'ını loglayıp gerçekten farklı constraint
gönderildiğini doğrulayın.

### Export dosya adı gelmiyor

Neden: Backend `content-disposition` header'ı dönmüyor.

Çözüm: Header ekleyin; yoksa istemci varsayılan `export.xlsx` ile indirir.

### Kolon görünürlüğü beklenenden farklı

Neden: `localStorage` içinde `dt-columns-{tableKey}` kayıtlı.

Çözüm: İlgili key'i temizleyin veya `tableKey` değiştirin.

## 13) Üretim Öncesi Kontrol Listesi

- HTTP adapter register edildi.
- Endpoint `{ data, total }` döndürüyor.
- Filtre alan adları backend ile eşleşiyor (`field` / `filterField`).
- Sort alanları backend whitelist içinde.
- Export endpoint'i `blob` ve `content-disposition` ile uyumlu.
- Boş durum, loading ve hata toast davranışları test edildi.
- Mobil görünümde paginator ve filtre menüsü doğrulandı.
