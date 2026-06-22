import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  uploadMediaFile,
  downloadMediaFileFromRemote,
  getMediaList,
  createMediaFolder,
  performMediaAction,
  getMediaFolderTree,
  getMediaOptions,
  MediaDataKeys,
} from './queries';
import type {
  ParamsUploadMediaFile,
  ParamsDownloadMediaFromRemote,
  ParamsGetMediaList,
  ParamsCreateMediaFolder,
  ParamsMediaAction,
  MediaUploadResponse,
  MediaListResponse,
  CreateMediaFolderResponse,
  MediaActionResponse,
  MediaFolderTreeResponse,
  MediaOptionsResponse,
} from '../model/media.model';

// ── List media files / folders ──────────────────────────────
export const useMediaList = (
  params: ParamsGetMediaList,
): UseQueryResult<MediaListResponse, Error> => {
  return useQuery<MediaListResponse, Error>({
    queryKey: MediaDataKeys.list(params),
    queryFn: () => getMediaList(params),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};

// ── Folder tree ─────────────────────────────────────────────
export const useMediaFolderTree = (): UseQueryResult<MediaFolderTreeResponse, Error> => {
  return useQuery<MediaFolderTreeResponse, Error>({
    queryKey: MediaDataKeys.folderTree(),
    queryFn: () => getMediaFolderTree(),
  });
};

// ── Media options ────────────────────────────────────────
export const useMediaOptions = (): UseQueryResult<MediaOptionsResponse, Error> => {
  return useQuery<MediaOptionsResponse, Error>({
    queryKey: MediaDataKeys.options(),
    queryFn: () => getMediaOptions(),
  });
};

// ── Upload file from local ──────────────────────────────────
export const useMutationUploadMediaFile = (
  options = {},
): UseMutationResult<MediaUploadResponse, Error, ParamsUploadMediaFile, unknown> => {
  return useMutation({
    mutationFn: (params: ParamsUploadMediaFile) => uploadMediaFile(params),
    ...options,
  });
};

// ── Download file from remote URL ───────────────────────────
export const useMutationDownloadMediaFromRemote = (
  options = {},
): UseMutationResult<MediaUploadResponse, Error, ParamsDownloadMediaFromRemote, unknown> => {
  return useMutation({
    mutationFn: (params: ParamsDownloadMediaFromRemote) => downloadMediaFileFromRemote(params),
    ...options,
  });
};

// ── Create folder ───────────────────────────────────────────
export const useMutationCreateMediaFolder = (
  options: Record<string, unknown> = {},
): UseMutationResult<CreateMediaFolderResponse, Error, ParamsCreateMediaFolder, unknown> => {
  const queryClient = useQueryClient();
  const { onSuccess: callerOnSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (params: ParamsCreateMediaFolder) => createMediaFolder(params),
    ...rest,
    onSuccess: (...args) => {
      // Built-in invalidation always runs
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
      // Then caller's onSuccess if provided
      if (typeof callerOnSuccess === 'function') {
        (callerOnSuccess as (...a: unknown[]) => void)(...args);
      }
    },
  });
};

// ── Perform media action ────────────────────────────────────
export const useMutationMediaAction = (
  options: Record<string, unknown> = {},
): UseMutationResult<MediaActionResponse, Error, ParamsMediaAction, unknown> => {
  const queryClient = useQueryClient();
  const { onSuccess: callerOnSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (params: ParamsMediaAction) => performMediaAction(params),
    ...rest,
    onSuccess: (...args) => {
      // Built-in invalidation always runs
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
      // Then caller's onSuccess if provided
      if (typeof callerOnSuccess === 'function') {
        (callerOnSuccess as (...a: unknown[]) => void)(...args);
      }
    },
  });
};
