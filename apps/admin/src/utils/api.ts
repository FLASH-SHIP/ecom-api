const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = {
  get: async <T>(url: string, config?: RequestInit): Promise<{ data: T }> => {
    // Map /v1/media to the NestJS endpoint prefix /api/v2/media
    const cleanUrl = url.replace(/^\/v1\/media/, "/api/v2/media");

    const res = await fetch(`${NEXT_PUBLIC_API_URL}${cleanUrl}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(config?.headers as any),
      },
      ...config,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }

    const data = await res.json();
    return { data };
  },

  post: async <T>(url: string, payload?: any, config?: RequestInit): Promise<{ data: T }> => {
    const cleanUrl = url.replace(/^\/v1\/media/, "/api/v2/media");

    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const mergedHeaders = {
      ...headers,
      ...(config?.headers as any),
    };
    if (isFormData) {
      delete mergedHeaders["Content-Type"];
      delete mergedHeaders["content-type"];
    }

    const res = await fetch(`${NEXT_PUBLIC_API_URL}${cleanUrl}`, {
      method: "POST",
      headers: mergedHeaders,
      body: isFormData ? payload : JSON.stringify(payload),
      ...config,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }

    const data = await res.json();
    return { data };
  },
};

export default api;
