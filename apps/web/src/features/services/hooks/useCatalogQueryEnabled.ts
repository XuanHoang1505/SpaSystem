import { useAuthStore } from '@/stores/authStore';

/**
 * Catalog reads wait for the session restore: an owner's Bearer changes the answer (BR-CAT-01),
 * and a guest answer fetched during the restore would stay cached under the same key.
 */
export const useCatalogQueryEnabled = () => useAuthStore((state) => state.status !== 'restoring');
