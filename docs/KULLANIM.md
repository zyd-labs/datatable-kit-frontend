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
npm install git+https://github.com/zyd-labs/datatable-kit-frontend.git#v0.4.0
```

Peer dependency uyumunu kontrol edin:

- `vue@^3.3.0`
- `primevue@^4.0.0`
- `pinia@^3.0.0`
- `@vueuse/core@^14.0.0`
- `@zyd-labs/primevue-lookup@>=0.1.0 <1.0.0`

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
- Tüm datatable type'ları (`ColumnDef`, `ColumnCardConfig`, `ColumnCardRole`, `ColumnMobileConfig`, `ColumnMobileRole`, `DataViewMode`, `CardLayout`, `ResponsiveMode`, vb.)

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
- `expandedRows` (opsiyonel): Satır açılım durumu (`v-model:expanded-rows` destekler).
- `selectionMode` (opsiyonel): `'single' | 'multiple'`.
- `responsiveMode` (opsiyonel, varsayılan `'table'`): `'table' | 'adaptive'`.
- `mobileBreakpoint` (opsiyonel, varsayılan `768`): Adaptive modda mobil eşik (px).
- `viewMode` (opsiyonel, varsayılan `'table'`): `'table' | 'cards'`. `v-model:viewMode` destekler.
- `showViewToggle` (opsiyonel, varsayılan `false`): Tablo/kart görünüm düğmesini gösterir. Adaptive mobil kart zorlamasında gizlenir.
- `cardLayout` (opsiyonel, varsayılan `'list'`): `'list' | 'grid'`.
- `cardMinWidth` (opsiyonel, varsayılan `320`): Grid kartlarında minimum genişlik (px).
- `cardGap` (opsiyonel, varsayılan `12`): Kartlar arası boşluk (px).

### Event'ler

- `selection-change(rows)`: Seçili satırlar değiştiğinde tetiklenir.
- `filter-change(filters)`: Filtre değiştiğinde tetiklenir.
- `row-toggle(data)`: Expand/collapse durumunda tetiklenir.
- `update:expandedRows(value)`: Expand state iki yönlü bağlandığında tetiklenir.
- `update:viewMode(value)`: Tablo/kart sunumu değiştiğinde tetiklenir.
- `card-click({ data, originalEvent })`: Kart gövdesine tıklanınca tetiklenir. Seçim ile aynı şey değildir. Kurulum anında listener varsa Enter/Space ve focus halkası da bağlanır; event her durumda emit edilir.

### Slot'lar

- `header-actions`: Üst alandaki özel aksiyonlar.
- `actions`: Satır bazlı aksiyon alanı (tablo sütunu / kart).
- `expansion`: Satır detay içeriği.
- `empty`: Boş durum içeriği (`hasActiveFilters`, `globalFilter` slot props).
- `card`: Kanonik kart içeriği (`data`, `index`, `selected`, `expanded`, `columns`, `toggleSelection`, `toggleExpand`).
- `mobile-card`: Uyumluluk alias’ı; `#card` yoksa kullanılır. Yeni kod için `#card` tercih edin.

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
- `card`: Kart sunumu meta (`ColumnCardConfig`). Yoksa `mobile` fallback.
- `mobile`: Adaptive mobil / kart uyumluluk meta (`ColumnMobileConfig`).

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

## 13) View Mode, Kart Sunumu ve Adaptive Mobil

Sunum (`table` / `cards`) ile sunucu durumu ayrıdır. Tablo ↔ kart geçişi
`first` / `rows` / `filters` / `globalFilter` / `sort` / `selection` sıfırlamaz
ve gereksiz refetch tetiklemez.

### `viewMode`

Varsayılan `'table'`. `v-model:view-mode` desteklenir. Paket görünümü
`localStorage`’a yazmaz.

| `viewMode` | `responsiveMode` | Sonuç |
| --- | --- | --- |
| `table` | `table` | Her viewport’ta tablo |
| `table` | `adaptive` | Desktop tablo, `mobileBreakpoint` altında kart |
| `cards` | herhangi | Her viewport’ta kart |

`viewMode="cards"` sunumda `responsiveMode`’dan önceliklidir.

`showViewToggle` yalnızca tablo sunumunun gerçekten seçilebildiği yerde görünür.
`responsiveMode="adaptive"` + mobil viewport kartı zorlar; Table düğmesi orada
yanıltıcı olacağı için toggle gizlenir. Desktop explicit table/cards geçişi
ve `viewMode="cards"` (her viewport) değişmez.

```vue
<BaseDataTable
  v-model:view-mode="viewMode"
  table-key="operations"
  endpoint="/operations"
  :columns="columns"
  show-view-toggle
  card-layout="list"
>
  <template #card="{ data }">
    <!-- domain kartı consumer’dadır -->
  </template>
</BaseDataTable>
```

- `showViewToggle`: ikon-only tablo/kart düğmesi (`pi-list` / `pi-th-large`).
  Adaptive mobilde gösterilmez.
- `cardLayout`: `'list'` (varsayılan) veya `'grid'`.
- `cardMinWidth`: grid minimum genişliği, varsayılan `320`.
- `cardGap`: px cinsinden boşluk, varsayılan `12`.

Grid, sabit kolon sayısı hardcode etmez:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min-width)), 1fr));
```

### Adaptive (mevcut davranış, kırılmaz)

```vue
<BaseDataTable
  table-key="users"
  endpoint="/users"
  :columns="columns"
  responsive-mode="adaptive"
  :mobile-breakpoint="768"
/>
```

- `responsiveMode="table"`: yalnızca desktop DataTable.
- `responsiveMode="adaptive"` + viewport `<= mobileBreakpoint`: kart listesi.
- `responsiveMode="adaptive"` + viewport `> mobileBreakpoint`: desktop DataTable.
- Aynı anda iki sunum mount edilmez.
- Backend sözleşmesi değişmez (`first`, `rows`, `filters`, `global`, `sortField`, `sortOrder`, `export`).

### `ColumnCardConfig` / `ColumnMobileConfig`

Kart meta çözümü: `column.card` → `column.mobile` → otomatik layout.

```ts
card?: {
  visible?: boolean;
  role?: 'title' | 'subtitle' | 'meta' | 'badge';
  order?: number;
  label?: string;
}
```

`mobile` aynı şekildedir ve mevcut consumer’lar için geçerlidir. İkisini
hemen kopyalamanız gerekmez.

Kurallar:

- `card.visible ?? mobile.visible === false`: kartta gösterilmez.
- `visible === true`: kart için uygundur.
- `visible` tanımsızsa: `column.visible !== false` kullanılır.
- Desktop MultiSelect ile gizlenen sütunlar kart kimliğini bozmaz.
- `order` varsa sıralama buna göre; yoksa kolon sırası korunur.
- `title` yoksa ilk **explicit rolü olmayan** uygun kolon title olur.
- Explicit rolü olan kolonlar (ör. `badge`) otomatik title olmaz.
- Tüm uygun kolonların title-olmayan explicit rolü varsa title uydurulmaz.
- Birden fazla `title`: ilki birincil, diğerleri subtitle alanına akar.
- `label` meta etiketini override eder; yoksa `header` kullanılır.
- `render` tablo ve kart için ortaktır.

### `#card` ve `#mobile-card`

Kanonik slot: `#card="{ data, index, selected, expanded, columns, toggleSelection, toggleExpand }"`.

`#mobile-card` uyumluluk API’sidir. `#card` yoksa alias olarak çalışır.
Yeni kod `#card` kullanmalıdır.

Paket altyapısı aynı kalır:

- selection chrome
- expansion
- actions
- toolbar / pagination / filters / sort / export

`@card-click="{ data, originalEvent }"` kart gövdesi tıklamasıdır ve listener
tespitinden bağımsız emit edilir.
Checkbox, aksiyon, expand ve diğer interactive/odaklanabilir kontroller
`card-click` üretmez; seçim ayrıdır. Kurulum anında `@card-click` (veya `.once`)
varsa kart Enter/Space ile de açılır. Bu tespit reaktif değildir. Kartın
kendisi `role="button"` yapılmaz.

### Kart UX özeti

- Toolbar: global arama, Filtreler, Sırala, Yenile, Export, isteğe bağlı görünüm düğmesi
- Filtreler: Drawer + mevcut filter model (live apply)
- Aktif filtre chip’leri
- Sıralama: Drawer (artan/azalan + sıralamayı kaldır)
- Pagination: PrimeVue `Paginator` + `DATATABLE_ROWS_PER_PAGE_OPTIONS`
- Selection / expansion / actions / empty mevcut API ile çalışır
- Loading: listede 4, grid’de 6 Skeleton kart

## 14) Üretim Öncesi Kontrol Listesi

- HTTP adapter register edildi.
- Endpoint `{ data, total }` döndürüyor.
- Filtre alan adları backend ile eşleşiyor (`field` / `filterField`).
- Sort alanları backend whitelist içinde.
- Export endpoint'i `blob` ve `content-disposition` ile uyumlu.
- Boş durum, loading ve hata toast davranışları test edildi.
- `responsiveMode="table"` ile mevcut desktop davranış korundu.
- `responsiveMode="adaptive"` ile breakpoint üstü/altı sunumlar doğrulandı.
- `viewMode="cards"` desktop’ta kart render eder; state korunur.
- `#card` özel kartı, `#mobile-card` uyumluluk alias’ını doğrulayın.
- Kart filtre Drawer, sort, pagination, selection ve expansion test edildi.
