import api from "@admin/utils/api";
import type {
  CreateMediaFolderResponse,
  MediaActionResponse,
  MediaFolderTreeResponse,
  MediaListResponse,
  MediaOptionsResponse,
  MediaUploadResponse,
  ParamsCreateMediaFolder,
  ParamsDownloadMediaFromRemote,
  ParamsGetMediaList,
  ParamsMediaAction,
  ParamsUploadMediaFile,
} from "../model/media.model";

// ── Query Keys ──────────────────────────────────────────────
export const MediaDataKeys = {
  all: ["media"] as const,
  list: (params: ParamsGetMediaList) =>
    [
      ...MediaDataKeys.all,
      "list",
      params.folder_id,
      params.view_in,
      params.page,
      params.per_page,
      params.sort_by,
      params.filter,
      params.search,
    ] as const,
  upload: () => [...MediaDataKeys.all, "upload"] as const,
  downloadUrl: () => [...MediaDataKeys.all, "downloadUrl"] as const,
  createFolder: () => [...MediaDataKeys.all, "createFolder"] as const,
  folderTree: () => [...MediaDataKeys.all, "folderTree"] as const,
  options: () => [...MediaDataKeys.all, "options"] as const,
};

const domainUrl: string = "/v1/media";

// ── List media files / folders ──────────────────────────────
export const getMediaList = async (params: ParamsGetMediaList): Promise<MediaListResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.set("folder_id", String(params.folder_id ?? 0));
  searchParams.set("view_in", params.view_in ?? "all_media");
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.per_page !== undefined) searchParams.set("per_page", String(params.per_page));
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.filter && params.filter !== "everything") searchParams.set("filter", params.filter);
  if (params.search) searchParams.set("search", params.search);

  const url: string = `${domainUrl}/list?${searchParams.toString()}`;
  const { data } = await api.get<MediaListResponse>(url);
  return data as MediaListResponse;
};

// ── Upload file from local (multipart/form-data) ───────────
export const uploadMediaFile = async (
  params: ParamsUploadMediaFile,
): Promise<MediaUploadResponse> => {
  const url: string = `${domainUrl}/files/upload`;

  const formData = new FormData();

  // Required: file
  formData.append("file", params.file);

  if (params.folder_id !== undefined) formData.append("folder_id", params.folder_id);
  if (params.visibility !== undefined) formData.append("visibility", params.visibility);
  if (params.access_mode !== undefined) formData.append("access_mode", params.access_mode);
  if (params.filename !== undefined) formData.append("filename", params.filename);
  if (params.dzuuid !== undefined) formData.append("dzuuid", params.dzuuid);
  if (params.dzchunkindex !== undefined) formData.append("dzchunkindex", params.dzchunkindex);
  if (params.dztotalchunkcount !== undefined)
    formData.append("dztotalchunkcount", params.dztotalchunkcount);
  if (params.dztotalfilesize !== undefined)
    formData.append("dztotalfilesize", params.dztotalfilesize);
  if (params.dzchunksize !== undefined) formData.append("dzchunksize", params.dzchunksize);

  const { data } = await api.post<MediaUploadResponse>(url, formData);
  return data as MediaUploadResponse;
};

// ── Download file from remote URL ───────────────────────────
export const downloadMediaFileFromRemote = async (
  params: ParamsDownloadMediaFromRemote,
): Promise<MediaUploadResponse> => {
  const url: string = `${domainUrl}/files/download-url`;

  const payload: Record<string, string> = {
    url: params.url,
    folder_id: params.folder_id ?? "0",
  };
  if (params.visibility !== undefined) payload.visibility = params.visibility;
  if (params.access_mode !== undefined) payload.access_mode = params.access_mode;

  const { data } = await api.post<MediaUploadResponse>(url, payload);

  return data as MediaUploadResponse;
};

// ── Create folder ───────────────────────────────────────────
export const createMediaFolder = async (
  params: ParamsCreateMediaFolder,
): Promise<CreateMediaFolderResponse> => {
  const url: string = `${domainUrl}/folders`;

  const payload = {
    name: params.name,
    parent_id: String(params.parent_id),
    ...(params.color ? { color: params.color } : {}),
  };

  const { data } = await api.post<CreateMediaFolderResponse>(url, payload);
  return data as CreateMediaFolderResponse;
};

// ── Perform media action (POST /v1/media/actions) ───────────
export const performMediaAction = async (
  params: ParamsMediaAction,
): Promise<MediaActionResponse> => {
  const url: string = `${domainUrl}/actions`;

  const payload: Record<string, unknown> = {
    action: params.action,
    selected: params.selected,
  };

  if (params.destination !== undefined) payload.destination = params.destination;
  if (params.imageId !== undefined) payload.imageId = params.imageId;
  if (params.cropData !== undefined) payload.cropData = params.cropData;
  if (params.color !== undefined) payload.color = params.color;
  if (params.skip_trash !== undefined) payload.skip_trash = params.skip_trash;

  const { data } = await api.post<MediaActionResponse>(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data as MediaActionResponse;
};

// ── Get folder tree ─────────────────────────────────────────
export const getMediaFolderTree = async (): Promise<MediaFolderTreeResponse> => {
  const url: string = `${domainUrl}/folders/tree`;
  const { data } = await api.get<MediaFolderTreeResponse>(url);
  return data as MediaFolderTreeResponse;
};

// ── Get media options ────────────────────────────────────
export const getMediaOptions = async (): Promise<MediaOptionsResponse> => {
  const url: string = `${domainUrl}/options`;
  const { data } = await api.get<MediaOptionsResponse>(url);
  return data as MediaOptionsResponse;
};
