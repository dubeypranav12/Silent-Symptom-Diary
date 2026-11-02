import axios from "axios";

/**
 * Silent Symptom Diary - API Client with Axios Interceptors
 * 
 * Manages JWT authentication, automatic token attachment via request interceptors,
 * and centralized 401/403 error handling via response interceptors.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "token";
const ROLE_KEY = "userRole";

// 1. Create a dedicated Axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 15000
});

// Helper auth utilities
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getUserRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function setUserRole(role) {
  if (role) localStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

// 2. Request Interceptor: automatically attaches the JWT VIP pass to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      // Matches backend: req.headers.authorization.startsWith('Bearer')
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: centralized handling for 401 Unauthorized & 403 Forbidden
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message || error.message;

    if (status === 401) {
      console.error("Session expired or invalid token. Redirecting to login...", backendMessage);
      clearAuth();
      // Dispatch an event so React components or router can react cleanly without hard reload
      window.dispatchEvent(
        new CustomEvent("auth:unauthorized", { detail: { message: backendMessage } })
      );
    } else if (status === 403) {
      console.error("Blocked by Consent or Role Guard:", backendMessage);
      window.dispatchEvent(
        new CustomEvent("auth:forbidden", { detail: { message: backendMessage } })
      );
    }

    return Promise.reject(error);
  }
);

// ==========================================
// API Helper Functions
// ==========================================

/**
 * Public route: Authenticate a user and store JWT token + role in localStorage
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, user?: object, error?: string }>}
 */
export async function loginUser(email, password) {
  try {
    const response = await apiClient.post("/auth/login", { email, password });

    // Backend sends { success: true, token: "...", user: { ... } }
    const { token, user } = response.data || {};

    if (token) setToken(token);
    if (user?.role) setUserRole(user.role);

    console.log("Login successful!");
    return {
      success: true,
      token,
      user,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Login failed";
    console.error("Login failed:", errorMessage);
    return {
      success: false,
      error: errorMessage,
      status: error.response?.status
    };
  }
}

/**
 * Protected route: Submit daily check-in measurements.
 * Request interceptor automatically attaches the Authorization Bearer token header.
 * @param {object} measurementData
 * @returns {Promise<{ success: boolean, message?: string, analysis?: object, error?: string }>}
 */
export async function submitDailyCheckIn(measurementData) {
  try {
    const token = getToken();
    if (!token) {
      console.error("No token found. Please log in.");
      return {
        success: false,
        error: "No authentication token found. Please log in."
      };
    }

    // Interceptor automatically attaches headers: { Authorization: `Bearer ${token}` }
    const response = await apiClient.post("/measurements", {
      measurements: measurementData
    });

    console.log("Success:", response.data?.message);
    console.log("ML Result:", response.data?.analysis);

    return {
      success: true,
      message: response.data?.message,
      analysis: response.data?.analysis,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to submit measurements";
    console.error("Error submitting data:", errorMessage);
    return {
      success: false,
      error: errorMessage,
      status: error.response?.status
    };
  }
}

/**
 * Protected route: Fetch patients for clinician view
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function getDoctorPatients() {
  try {
    const response = await apiClient.get("/doctor/patients");
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error("Error fetching doctor patients:", errorMessage);
    return {
      success: false,
      error: errorMessage,
      status: error.response?.status
    };
  }
}

/**
 * Log out user by clearing stored token and role
 */
export function logoutUser() {
  clearAuth();
}

export default apiClient;
