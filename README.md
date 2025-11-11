# @zyd-labs/datatable-kit

PrimeVue 4 + Tailwind 4 tabanlı projeler için yeniden kullanılabilir DataTable paketi. Backend tarafında `zyd-labs/laravel-datatable-kit` ile aynı sözleşmeyi takip eder ve `{ data, total }` yapısında yanıt bekler.

## Özellikler

- `BaseDataTable` bileşeni: Sunucu tarafı pagination/sort/filter için hazır şablon.
- `useDatatable` composable: Datatable backend sözleşmesine uygun GET & export çağrılarını basitleştirir.
- Pinia `useDatatableStore`: Tablolar arası durum yönetimi (`first`, `rows`, `filters`, `sortField` vb.).
- Http adapter katmanı: Projeye özel axios/fetch wrapper’ınızı kolayca bağlayın.
- TypeScript desteği: `ColumnDef`, `DataTableState`, `DataTableFilter` vb. tipler.

## Kurulum

```bash
npm install git+https://github.com/zyd-labs/datatable-kit-frontend.git#v0.1.0
# veya pnpm / yarn eşdeğerleri
```

`package.json` içinde git dependency olarak eklediğinizde Vite alias kullanmanıza gerek kalmadan `@zyd-labs/datatable-kit` üzerinden erişebilirsiniz.

## Http İstemcisini Kaydetme

Paket dahili olarak http istemcisi barındırmaz; mevcut axios instance’ınızı veya alternatifinizi kaydetmeniz gerekir. Uygulama bootstrap aşamasında bir kere çağırmanız yeterli.

```ts
// resources/js/plugins/datatable.ts
import { registerDatatableHttpClient } from "@zyd-labs/datatable-kit";
import { http } from "@/services/http"; // axios instance

export function installDatatableHttpClient(): void {
  registerDatatableHttpClient({
    get: (url, config) => http.get(url, config),
  });
}
```

```ts
// resources/js/main.ts
import { installDatatableHttpClient } from "./plugins/datatable";

installDatatableHttpClient();
```

Bu sayede interceptor, auth header ve hata yönetimi projenizde tanımlandığı şekilde çalışmaya devam eder.

## Kullanım

### BaseDataTable

```vue
<template>
  <BaseDataTable
    table-key="users"
    endpoint="/users"
    :columns="columns"
    :global-filter-fields="['name', 'email']"
    default-sort-field="created_at"
    :default-sort-order="-1"
  />
</template>

<script setup lang="ts">
import { BaseDataTable } from "@zyd-labs/datatable-kit";
import type { ColumnDef } from "@zyd-labs/datatable-kit";

const columns: ColumnDef[] = [
  {
    field: "name",
    header: "Ad Soyad",
    sortable: true,
    filter: true,
    dataType: "text",
  },
  {
    field: "email",
    header: "E-posta",
    sortable: true,
    filter: true,
    dataType: "text",
  },
  {
    field: "created_at",
    header: "Kayıt Tarihi",
    sortable: true,
    filter: true,
    dataType: "date",
  },
];
</script>
```

### Composable / Store

```ts
import { useDatatable } from "@zyd-labs/datatable-kit";

const { fetchData, exportData } = useDatatable("/users");

const result = await fetchData({
  first: 0,
  rows: 25,
  filters: {
    name: {
      operator: "and",
      constraints: [{ matchMode: "contains", value: "Ali" }],
    },
  },
});

console.log(result.data, result.total);
```

## Sütun & Filtre Konfigürasyonu

- `filter` alanı `boolean` ya da detaylı ayar gerektiren durumlarda obje olarak verilebilir.
- `defaultFilter` ile tablo ilk açıldığında uygulanan varsayılan filtreyi belirleyebilirsiniz.
- `render` ile Vue bileşeni veya fonksiyon referansı sağlayarak hücreyi özelleştirebilirsiniz.

```ts
const columns: ColumnDef[] = [
  {
    field: "status",
    header: "Durum",
    dataType: "boolean",
    filter: {
      filterType: "select",
      filterOptions: [
        { label: "Aktif", value: 1 },
        { label: "Pasif", value: 0 },
      ],
    },
    render: (row) => (row.status ? "Aktif" : "Pasif"),
  },
];
```

## Export Akışı

`BaseDataTable` içindeki “Excel indir” butonu, backend’den `responseType: 'blob'` ile gelen yanıtı otomatik indirir. Backend tarafında `Content-Disposition` başlığına dosya adını ekleyerek istemciye iletebilirsiniz.

## Geliştirme

Monorepo yaklaşımı kullanıyorsanız:

```bash
cd packages/datatable-kit
npm install
npm run build
```

Tiplerin doğru çözümlenebilmesi için proje kök `tsconfig.json` içinde `@zyd-labs/datatable-kit` alias’ının `packages/datatable-kit/src` klasörünü göstermesi yeterlidir.
