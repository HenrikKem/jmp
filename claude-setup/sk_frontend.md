---
name: frontend-react
description: >
  Build and modify React frontend components, pages, hooks, and UI patterns.
  Use this skill whenever the task involves React components, pages, layouts, forms, tables,
  modals, state management, API integration, routing, or any user interface work. Also trigger
  when someone mentions 'component', 'page', 'form', 'table', 'dashboard', 'sidebar', 'modal',
  'dialog', 'UI', 'frontend', 'client', 'view', 'screen', 'layout', 'Tailwind', 'hook',
  'useEffect', 'useState', 'React Query', or asks how something should look or behave in the browser.
---

# Frontend Skill (React)

Patterns and conventions for React frontends paired with a NestJS API.

## Stack

- **Framework**: React 18+ (Vite)
- **Styling**: Tailwind CSS 3+
- **Components**: shadcn/ui (copy-paste pattern, when needed)
- **State**: React Query (TanStack Query) for server state, Zustand for client state
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios (configured instance)
- **Location**: `apps/web/src/`

## Before Writing Any Frontend Code

1. Read `CLAUDE.md` or project README for domain context and UI language
2. Read the API skill to understand the endpoint contract you're consuming
3. Run `find apps/web/src -name "*.tsx" -o -name "*.ts" | head -50` to see what exists
4. Run `cat apps/web/src/types/index.ts` to see existing type definitions

## Directory Structure

```
apps/web/src/
├── main.tsx
├── App.tsx
├── api/
│   ├── client.ts              # Axios instance with interceptors
│   └── {domain}.api.ts        # API functions per domain
├── components/
│   ├── ui/                    # Generic reusable (Button, Input, Modal, Table)
│   ├── layout/                # Shell, Sidebar, Header, PageContainer
│   └── domain/                # Domain-specific components
├── hooks/
│   ├── useAuth.ts
│   └── use{Domain}.ts         # React Query hooks per domain
├── pages/
│   ├── auth/
│   ├── dashboard/
│   └── {domain}/
├── stores/
│   └── auth.store.ts          # Zustand for auth state
├── types/
│   └── index.ts               # Shared TypeScript types
├── utils/
│   ├── formatters.ts
│   └── constants.ts
└── routes.tsx
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component file | PascalCase | `OrderCard.tsx` |
| Hook file | camelCase with `use` prefix | `useOrders.ts` |
| API file | camelCase with `.api` suffix | `orders.api.ts` |
| Page component | PascalCase with `Page` suffix | `OrdersListPage.tsx` |
| Store file | camelCase with `.store` suffix | `auth.store.ts` |

## Component Pattern

Functional components only. No class components.

```tsx
interface OrderCardProps {
  order: Order;
  onClick?: (id: string) => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(order.id)}
    >
      <h3 className="font-semibold text-gray-900">{order.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{order.status}</p>
    </div>
  );
}
```

### Rules

- Always export named (not default) — except pages
- Always define Props interface
- Keep components focused — max ~150 lines, split if larger
- Use `function` declaration (not arrow) for components
- Tailwind classes directly in JSX — no CSS files

## API Layer Pattern

```typescript
// api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await useAuthStore.getState().refresh();
        return api(error.config);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
```

```typescript
// api/{domain}.api.ts
import { api } from './client';
import type { Order, PaginatedResponse, CreateOrderDto } from '../types';

export const ordersApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`).then(r => r.data),
  create: (dto: CreateOrderDto) =>
    api.post<Order>('/orders', dto).then(r => r.data),
  update: (id: string, dto: Partial<CreateOrderDto>) =>
    api.put<Order>(`/orders/${id}`, dto).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/orders/${id}`).then(r => r.data),
};
```

## React Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';

export function useOrders(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
```

## Form Pattern (React Hook Form + Zod)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const orderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export function OrderForm({ onSubmit }: { onSubmit: (data: OrderFormData) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
        Save
      </button>
    </form>
  );
}
```

## Page Layout Pattern

```tsx
export default function OrdersListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useOrders({ search, page, pageSize: 20 });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.items.length) return <EmptyState message="No orders found" />;

  return (
    <PageContainer title="Orders" action={{ label: 'New Order', onClick: () => { /* open modal */ } }}>
      <input
        type="search" placeholder="Search..." value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full max-w-md rounded-md border-gray-300 shadow-sm mb-6"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((o) => <OrderCard key={o.id} order={o} />)}
      </div>
    </PageContainer>
  );
}
```

## Routing

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, lazy: () => import('./pages/dashboard/DashboardPage') },
      { path: '{domain}', lazy: () => import('./pages/{domain}/{Domain}ListPage') },
      { path: '{domain}/:id', lazy: () => import('./pages/{domain}/{Domain}DetailPage') },
    ],
  },
  { path: '/login', lazy: () => import('./pages/auth/LoginPage') },
]);
```

## Auth Store (Zustand)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      login: async (email, password) => {
        const { accessToken, user } = await authApi.login(email, password);
        set({ accessToken, user });
      },
      refresh: async () => {
        const { accessToken } = await authApi.refresh();
        set({ accessToken });
      },
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'app-auth' },
  ),
);
```

## Types

```typescript
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Define domain types here, matching the API response shape
```

## State Management Rules

- **Server state** → React Query. Never store API data in Zustand.
- **Auth state** → Zustand with `persist` middleware
- **UI state** → `useState` in the component. Only lift to Zustand if shared across routes.
- **Form state** → React Hook Form. Never manually manage form inputs with useState.
- **URL state** → React Router `useSearchParams` for filters, pagination, search.

## UI Principles

1. **Function over form** — every element must serve a purpose
2. **Localized labels** — use the project's configured language for user-facing text
3. **Fast navigation** — sidebar always visible, global search in header
4. **Dense but readable** — show more data, less whitespace
5. **Loading states** — always show skeleton or spinner
6. **Error states** — always show actionable error messages
7. **Empty states** — always show helpful message + CTA

## Checklist for New Page/Component

- [ ] Types defined in `types/index.ts`
- [ ] API function in `api/{domain}.api.ts`
- [ ] React Query hook in `hooks/use{Domain}.ts`
- [ ] Loading, error, and empty states handled
- [ ] Form validation with Zod schema
- [ ] Localized labels for user-facing text
- [ ] Responsive (works on md and lg breakpoints minimum)
- [ ] Route added to `routes.tsx`
- [ ] No `any` types
- [ ] No `console.log` left in code
