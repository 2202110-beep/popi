import { request } from "./auth.js";

export function fetchAdminOverview() {
  return request("/api/auth/admin/overview/", { method: "GET" });
}

export async function decideCollaborator(applicationId, action) {
  try {
    const response = await request("/api/auth/admin/collaborators/" + applicationId + "/decision/", {
      method: "POST",
      body: { action },
    });
    return response;
  } catch (error) {
    console.error('Error al decidir sobre colaborador:', {
      applicationId,
      action,
      error: error.message,
      payload: error.payload
    });
    throw error;
  }
}