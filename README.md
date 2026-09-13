# @zyd-labs/datatable-kit

PrimeVue 4 + Tailwind 4 tabanlı projeler için yeniden kullanılabilir DataTable paketi. Backend tarafında `zyd-labs/laravel-datatable-kit` ile aynı sözleşmeyi takip eder ve `{ data, total }` yapısında yanıt bekler.

## Dokümantasyon

- Detaylı kullanım dokümanı: [`docs/KULLANIM.md`](docs/KULLANIM.md)

## Özellikler

- `BaseDataTable` bileşeni: Sunucu tarafı pagination/sort/filter için hazır şablon.
- Tablo ve kart sunumu aynı store state’ini paylaşır (`viewMode="table" | "cards"`).
- Adaptive mobil mod (`responsive-mode="adaptive"`): aynı state modeli ile kart listesi sunumu.
- `useDatatable` composable: Datatable backend sözleşmesine uygun GET & export çağrılarını basitleştirir.
- Pinia `useDatatableStore`: Tablolar arası durum yönetimi (`first`, `rows`, `filters`, `sortField` vb.).
- Http adapter katmanı: Projeye özel axios/fetch wrapper’ınızı kolayca bağlayın.
- TypeScript desteği: `ColumnDef`, `DataViewMode`, `ColumnCardConfig`, `ColumnMobileConfig`, `DataTableState` vb. tipler.

## Kurulum

```bash
npm install git+https://github.com/zyd-labs/datatable-kit-frontend.git#v0.4.0
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

### Çoklu Seçim (Multi-Select) Filtresi

```ts
const columns: ColumnDef[] = [
  {
    field: "status",
    header: "Durum",
    dataType: "multi-select",
    filter: {
      filterType: "multi-select",
      filterOptions: [
        { label: "Açık", value: "open" },
        { label: "Kapalı", value: "closed" },
      ],
      operator: "and",
      showOperator: false,
      showMatchModes: false,
      maxSelectedLabels: 3,
      placeholder: "Durum seç",
    },
  },
];
```

`matchMode` otomatik olarak `FilterMatchMode.IN` değerine ayarlanır ve seçilen değerler backend’e dizi olarak gönderilir. Böylece PrimeVue filtre formatını koruyarak çoklu seçim ile filtreleme yapılabilir.

## View Mode (Tablo / Kart)

Sunum (`table` / `cards`) ile veri durumu ayrıdır. Kart görünümü yeni bir fetch/filter/sort sistemi açmaz; `useDatatableStore` içindeki `first`, `rows`, `total`, `filters`, `globalFilter`, `sortField`, `sortOrder`, `loading` aynen kullanılır.

```ts
type DataViewMode = 'table' | 'cards'
```

| `viewMode` | `responsiveMode` | Sonuç |
| --- | --- | --- |
| `table` (varsayılan) | `table` (varsayılan) | Her viewport’ta tablo |
| `table` | `adaptive` | Desktop tablo, breakpoint altında kart |
| `cards` | herhangi | Her viewport’ta kart |

`viewMode="cards"` sunumda `responsiveMode`’dan önceliklidir. Görünüm tercihi pakette `localStorage`’a yazılmaz; kalıcılık istiyorsanız `v-model:viewMode` ile consumer tarafında tutun.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
    BaseDataTable,
    type ColumnDef,
    type DataViewMode,
} from '@zyd-labs/datatable-kit'

const viewMode = ref<DataViewMode>('cards')

const columns: ColumnDef[] = [
    {
        field: 'asset_display',
        header: 'Kayıt',
        sortable: true,
        card: { role: 'title', order: 1 },
    },
    {
        field: 'customer_name',
        header: 'Müşteri',
        card: { role: 'subtitle', order: 2 },
    },
    {
        field: 'status',
        header: 'Durum',
        card: { role: 'badge', order: 3 },
    },
    {
        field: 'active_work',
        header: 'Aktif İş',
        card: { role: 'meta', order: 4 },
    },
]
</script>

<template>
    <BaseDataTable
        v-model:view-mode="viewMode"
        table-key="operations"
        endpoint="/operations"
        :columns="columns"
        show-view-toggle
        card-layout="list"
    >
        <template #card="{ data }">
            <!-- custom operational card -->
        </template>
    </BaseDataTable>
</template>
```

### Kart layout

- `cardLayout`: `'list'` (varsayılan, tek sütun) veya `'grid'` (`auto-fit` + `cardMinWidth`)
- `cardMinWidth`: grid için minimum kart genişliği, varsayılan `320`
- `cardGap`: kartlar arası boşluk (px), varsayılan `12`
- `showViewToggle`: tablo/kart ikon düğmesi (`pi-list` / `pi-th-large`)

Grid, uygulama-özel kolon sayısı hardcode etmez:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min-width)), 1fr));
```

### Kart sütun meta

`column.card` yoksa `column.mobile` kullanılır; ikisi de yoksa ilk uygun kolon `title`, kalanlar `meta` olur.

```ts
card?: {
  visible?: boolean
  role?: 'title' | 'subtitle' | 'meta' | 'badge'
  order?: number
  label?: string
}
```

Kart görünürlüğü `card.visible` → `mobile.visible` → `column.visible !== false` sırasıyla çözülür. Desktop MultiSelect ile gizlenen sütunlar kart layout’unu bozmaz.

### Slot’lar

- `#card="{ data, index, selected, expanded, columns, toggleSelection, toggleExpand }"` — kanonik özel kart
- `#mobile-card` — uyumluluk alias’ı (`#card` yoksa kullanılır)
- `#header-actions`, `#actions`, `#expansion`, `#empty` — tablo ile aynı sözleşmeler

`@card-click` payload: `{ data, originalEvent }`. Checkbox, aksiyon ve expand `stopPropagation` kullanır; kart tıklama seçim değildir.

## Responsive / Mobile Mode

`responsiveMode` varsayılanı `"table"` olduğundan mevcut kurulumlar yükseltme sonrası davranış değiştirmez.

```vue
<BaseDataTable
  table-key="users"
  endpoint="/users"
  :columns="columns"
  responsive-mode="adaptive"
  :mobile-breakpoint="768"
/>
```

Adaptive modda breakpoint üstünde mevcut DataTable, altında mobil kart listesi render edilir. İkisi aynı store state’ini (`first`, `rows`, `filters`, `sortField`, `sortOrder`, `globalFilter`) kullanır.

### Mobil sütun meta

```ts
const columns: ColumnDef[] = [
  {
    field: "name",
    header: "Ad Soyad",
    mobile: { role: "title", order: 1 },
  },
  {
    field: "email",
    header: "E-posta",
    mobile: { role: "subtitle", order: 2 },
  },
  {
    field: "status",
    header: "Durum",
    render: StatusBadge,
    mobile: { role: "badge", order: 3 },
  },
  {
    field: "city",
    header: "Şehir",
    mobile: { role: "meta", label: "Şehir", order: 4 },
  },
];
```

### Özel mobil kart (uyumluluk)

Yeni kod için `#card` kullanın. `#mobile-card` adaptive mobil ve kart sunumunda `#card` yoksa alias olarak çalışmaya devam eder.

```vue
<BaseDataTable
  table-key="vehicles"
  endpoint="/vehicles"
  :columns="columns"
  responsive-mode="adaptive"
>
  <template #mobile-card="{ data }">
    <div>
      <strong>{{ data.plate }}</strong>
      <div>{{ data.brand }} {{ data.model }}</div>
    </div>
  </template>

  <template #actions="{ data }">
    <!-- mevcut actions slot aynı şekilde çalışır -->
  </template>
</BaseDataTable>
```

Detaylar: [`docs/KULLANIM.md`](docs/KULLANIM.md)

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
