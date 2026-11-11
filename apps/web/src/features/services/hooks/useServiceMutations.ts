import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type {
  ChangeCatalogStatusRequest,
  CreateServiceCategoryRequest,
  CreateServiceRequest,
  UpdateServiceCategoryRequest,
  UpdateServiceRequest,
} from '@spa/shared-types';
import { callCatalog, callCatalogVoid } from '@/lib/api/catalog';

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateServiceRequest) => callCatalog((api) => api.createService(body)),
    onSuccess: (detail) => {
      queryClient.setQueryData(catalogQueryKeys.service(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.categories });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateServiceRequest }) =>
      callCatalog((api) => api.updateService(id, body)),
    onSuccess: (detail, { id }) => {
      queryClient.setQueryData(catalogQueryKeys.service(id), detail);
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.service(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useChangeServiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeCatalogStatusRequest }) =>
      callCatalogVoid((api) => api.changeServiceStatus(id, body)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.service(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useUploadServiceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File | Blob }) =>
      callCatalog((api) => api.uploadServiceImage(id, file)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.service(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useDeleteServiceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callCatalogVoid((api) => api.deleteServiceImage(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.service(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateServiceCategoryRequest) => callCatalog((api) => api.createCategory(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.categories });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateServiceCategoryRequest }) =>
      callCatalog((api) => api.updateCategory(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.categories });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callCatalogVoid((api) => api.deleteCategory(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.categories });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.services() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}
