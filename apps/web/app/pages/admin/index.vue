<script setup lang="ts">
import type { Company, CompanyStatus, Page } from '~/types';

definePageMeta({ middleware: 'auth', roles: ['ADMIN'] });

const api = useApi();
const tabs: CompanyStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const status = ref<CompanyStatus>('PENDING');
const page = ref(1);

const { data, pending, refresh } = await useAsyncData(
  'admin-companies',
  () => api<Page<Company>>('/admin/companies', { query: { status: status.value, page: page.value } }),
  { watch: [status, page] },
);

const error = ref<string | null>(null);
const busyId = ref<string | null>(null);

function selectTab(tab: CompanyStatus) {
  status.value = tab;
  page.value = 1;
}

async function act(company: Company, action: 'approve' | 'reject' | 'suspend') {
  let body: { reason: string } | undefined;
  if (action === 'reject') {
    const reason = window.prompt(`Why are you rejecting ${company.name}? The owner will see this.`);
    if (!reason) return;
    body = { reason };
  }
  if (action === 'suspend' && !window.confirm(`Suspend ${company.name}?`)) return;

  error.value = null;
  busyId.value = company.id;
  try {
    await api(`/admin/companies/${company.id}/${action}`, { method: 'PATCH', body });
    await refresh();
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    busyId.value = null;
  }
}

const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.perPage)) : 1));
</script>

<template>
  <section>
    <h1>Companies</h1>
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab" :class="{ active: tab === status }" @click="selectTab(tab)">
        {{ tab.toLowerCase() }}
      </button>
    </div>

    <FormError :message="error" />
    <p v-if="pending" class="muted">Loading…</p>
    <p v-else-if="!data?.items.length" class="muted">No {{ status.toLowerCase() }} companies.</p>

    <div v-else class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Owner</th>
            <th>Signed up</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="company in data.items" :key="company.id">
            <td>
              <strong>{{ company.name }}</strong>
              <div class="muted small">{{ company.address || company.website || '—' }}</div>
              <div v-if="company.rejectionReason" class="muted small">Reason: {{ company.rejectionReason }}</div>
            </td>
            <td>
              {{ company.owner.name }}
              <div class="muted small">{{ company.owner.email }}</div>
            </td>
            <td>{{ new Date(company.createdAt).toLocaleDateString() }}</td>
            <td><StatusBadge :status="company.status" /></td>
            <td class="actions">
              <template v-if="company.status === 'PENDING'">
                <button class="btn" :disabled="busyId === company.id" @click="act(company, 'approve')">Approve</button>
                <button class="btn btn-ghost" :disabled="busyId === company.id" @click="act(company, 'reject')">Reject</button>
              </template>
              <button v-else-if="company.status === 'APPROVED'" class="btn btn-ghost" :disabled="busyId === company.id" @click="act(company, 'suspend')">Suspend</button>
              <button v-else class="btn" :disabled="busyId === company.id" @click="act(company, 'approve')">Approve</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btn btn-ghost" :disabled="page <= 1" @click="page--">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button class="btn btn-ghost" :disabled="page >= totalPages" @click="page++">Next</button>
    </div>
  </section>
</template>
