import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type {
  ChangeCatalogStatusRequest,
  CreatePackageRequest,
  UpdatePackageRequest,
} from '@spa/shared-types';
import { callCatalog, callCatalogVoid } from '@/lib/api/catalog';

export function useCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePackageRequest) => callCatalog((api) => api.createPackage(body)),
    onSuccess: (detail) => {
      queryClient.setQueryData(catalogQueryKeys.package(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.packages() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePackageRequest }) =>
      callCatalog((api) => api.updatePackage(id, body)),
    onSuccess: (detail, { id }) => {
      queryClient.setQueryData(catalogQueryKeys.package(id), detail);
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.packages() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.package(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useChangePackageStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeCatalogStatusRequest }) =>
      callCatalogVoid((api) => api.changePackageStatus(id, body)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.packages() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.package(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useUploadPackageImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File | Blob }) =>
      callCatalog((api) => api.uploadPackageImage(id, file)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.packages() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.package(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useDeletePackageImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callCatalogVoid((api) => api.deletePackageImage(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.packages() });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.package(id) });
      queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}
