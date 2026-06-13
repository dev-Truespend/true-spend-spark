import { signInWithProvider } from "@/features/auth/api/auth.api";

jest.mock("@/shared/api/supabaseClient", () => ({
  supabase: { auth: { signOut: jest.fn(), signInWithIdToken: jest.fn() } }
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
  statusCodes: { SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED" }
}));

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 }
}));

jest.mock("expo-crypto", () => ({
  randomUUID: () => "raw-nonce",
  digestStringAsync: jest.fn(async () => "hashed-nonce"),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" }
}));

const { supabase } = jest.requireMock("@/shared/api/supabaseClient") as {
  supabase: { auth: { signOut: jest.Mock; signInWithIdToken: jest.Mock } };
};
const { GoogleSignin } = jest.requireMock("@react-native-google-signin/google-signin") as {
  GoogleSignin: { configure: jest.Mock; hasPlayServices: jest.Mock; signIn: jest.Mock };
};
const apple = jest.requireMock("expo-apple-authentication") as { signInAsync: jest.Mock };

const SESSION = { access_token: "a", refresh_token: "r" };
const RAW_NONCE = "raw-nonceraw-nonce";

beforeEach(() => {
  supabase.auth.signOut.mockReset().mockResolvedValue({ error: null });
  supabase.auth.signInWithIdToken.mockReset().mockResolvedValue({ data: { session: SESSION }, error: null });
  GoogleSignin.hasPlayServices.mockReset().mockResolvedValue(true);
  GoogleSignin.signIn.mockReset();
  apple.signInAsync.mockReset();
});

describe("signInWithProvider", () => {
  it("Google: passes hashed nonce to the native sheet and raw nonce to Supabase", async () => {
    GoogleSignin.signIn.mockResolvedValue({ data: { idToken: "g-token" } });

    const session = await signInWithProvider("google");

    expect(supabase.auth.signOut).toHaveBeenCalled(); // clears stale account first
    expect(GoogleSignin.signIn).toHaveBeenCalledWith({ nonce: "hashed-nonce" });
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "g-token",
      nonce: RAW_NONCE
    });
    expect(session).toBe(SESSION);
  });

  it("Apple: passes the identity token + raw nonce to Supabase", async () => {
    apple.signInAsync.mockResolvedValue({ identityToken: "a-token" });

    const session = await signInWithProvider("apple");

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "a-token",
      nonce: RAW_NONCE
    });
    expect(session).toBe(SESSION);
  });

  it("returns null when the user cancels the native Google sheet", async () => {
    GoogleSignin.signIn.mockResolvedValue({ type: "cancelled", data: null });

    const session = await signInWithProvider("google");

    expect(session).toBeNull();
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("throws when Supabase rejects the Google token", async () => {
    GoogleSignin.signIn.mockResolvedValue({ data: { idToken: "g-token" } });
    supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: null }, error: new Error("bad token") });

    await expect(signInWithProvider("google")).rejects.toThrow("bad token");
  });
});
