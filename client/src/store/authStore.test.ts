import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./authStore";

const mockMe = vi.fn();
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockSetToken = vi.fn();
const mockClearToken = vi.fn();
const mockGetToken = vi.fn(() => "token");
const mockIsAuthenticated = vi.fn(() => true);

vi.mock("@/lib/api", () => ({
  authApi: {
    login: mockLogin,
    register: mockRegister,
    me: mockMe,
  },
  walletApi: {
    getBalance: vi.fn(),
    deposit: vi.fn(),
    confirmDeposit: vi.fn(),
    withdraw: vi.fn(),
    transfer: vi.fn(),
  },
  tradesApi: {
    buy: vi.fn(),
    sell: vi.fn(),
    history: vi.fn(),
    portfolio: vi.fn(),
  },
  watchlistApi: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
  alertsApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
  setToken: mockSetToken,
  clearToken: mockClearToken,
  getToken: mockGetToken,
  isAuthenticated: mockIsAuthenticated,
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      mode: "demo",
      user: null,
      loading: false,
      walletUSD: 0,
      holdings: [],
      transactions: [],
      watchlist: [],
      alerts: [],
    });
  });

  it("preserves live mode when the profile request fails unexpectedly", async () => {
    const currentUser = {
      id: "user-1",
      name: "Google User",
      email: "google@example.com",
      role: "user" as const,
      emailVerified: true,
    };

    useAuthStore.setState({ mode: "live", user: currentUser });
    mockMe.mockRejectedValueOnce({ status: 500, message: "server unavailable" });

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState().mode).toBe("live");
    expect(useAuthStore.getState().user).toEqual(currentUser);
    expect(mockClearToken).not.toHaveBeenCalled();
  });
});
