import axios from "axios";

/**
 * Silent Symptom Diary - Backend API Integration Client
 * 
 * Configured according to the Backend API Integration Guide:
 * Base URL: https://silent-symptom-diary.onrender.com/api
 * JWT Bearer token authentication with Axios Interceptors
 */

const RAW_URL = import.meta.env.VITE_API_URL || "https://silent-symptom-diary.onrender.com/api";
const cleanBase = RAW_URL.trim().replace(/\/+$/, "");
export const API_BASE_URL = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;

const TOKEN_KEY = "token";
const ROLE_KEY = "userRole";

// 1. Central Axios Instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 20000
});

// Auth token & storage helpers
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

// 2. Request Interceptor: automatically attaches the Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message || error.message;

    if (status === 401) {
      console.error("Session expired or invalid token. Redirecting to login...", backendMessage);
      clearAuth();
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

// ==========================================================
// A. Authentication Endpoints (/api/auth)
// ==========================================================

/**
 * Register a new user (patient or doctor)
 * POST /api/auth/register
 * @param {{ name: string, email: string, password: string, role: 'patient' | 'doctor' }} payload
 */
export async function registerUser({ name, email, password, role = "patient" }) {
  try {
    const response = await apiClient.post("/auth/register", {
      name,
      email,
      password,
      role
    });

    const token = response.data?.token || response.data?.data?.token;
    const user = response.data?.user || response.data?.data?.user;

    if (token) setToken(token);
    if (user?.role || role) setUserRole(user?.role || role);

    return {
      success: true,
      data: response.data?.data || response.data,
      token,
      user,
      message: response.data?.message
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Registration failed";
    console.error("Registration error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

/**
 * Sign in existing user
 * POST /api/auth/login
 * @param {string} email
 * @param {string} password
 */
export async function loginUser(email, password) {
  try {
    const response = await apiClient.post("/auth/login", { email, password });

    const token = response.data?.token || response.data?.data?.token;
    const user = response.data?.user || response.data?.data?.user;

    if (token) setToken(token);
    if (user?.role) setUserRole(user.role);

    console.log("Login successful!");
    return {
      success: true,
      token,
      user,
      data: response.data?.data || response.data,
      message: response.data?.message
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Login failed";
    console.error("Login failed:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

// ==========================================================
// B. Patient Endpoints (/api/patients)
// ==========================================================

/**
 * Give or update patient consent
 * POST /api/patients/consent
 * @param {boolean} consent
 */
export async function giveConsent(consent = true) {
  try {
    const response = await apiClient.post("/patients/consent", { consent });
    return {
      success: true,
      data: response.data?.data || response.data,
      message: response.data?.message
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Consent update error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

/**
 * Get patient dashboard profile and baseline tracking stats
 * GET /api/patients/profile
 */
export async function getPatientProfile() {
  try {
    const response = await apiClient.get("/patients/profile");
    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Profile fetch error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

// ==========================================================
// C. Daily Measurements & ML (/api/measurements)
// ==========================================================

/**
 * Log daily symptoms and trigger Python ML server analysis
 * POST /api/measurements
 * Returns newly saved measurement with `riskScore` and `mlFlag`
 * @param {object} symptomData - Symptom or measurement payload
 */
export async function logDailySymptoms(symptomData) {
  try {
    const response = await apiClient.post("/measurements", symptomData);
    const resultData = response.data?.data || response.data;

    return {
      success: true,
      data: resultData,
      riskScore: resultData?.riskScore,
      mlFlag: resultData?.mlFlag,
      message: response.data?.message
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Daily symptom logging error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

// Alias for existing check-in flow compatibility
export const submitDailyCheckIn = logDailySymptoms;

/**
 * View history of all past measurements for logged-in patient
 * GET /api/measurements
 */
export async function getMeasurementHistory() {
  try {
    const response = await apiClient.get("/measurements");
    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Measurement history error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

// ==========================================================
// D. Doctor Endpoints (/api/doctor)
// ==========================================================

/**
 * View patients assigned to this doctor
 * GET /api/doctor/patients
 */
export async function getDoctorPatients() {
  try {
    const response = await apiClient.get("/doctor/patients");
    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Doctor patients fetch error:", message);
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
}

/**
 * View full measurement history for a specific patient
 * GET /api/doctor/patients/:patientId/trends
 * @param {string|number} patientId
 */
export async function getPatientTrends(patientId) {
  try {
    const response = await apiClient.get(`/doctor/patients/${patientId}/trends`);
    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("Patient trends fetch error:", message);
    return {
      success: false,
      error: message,
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
