import { signInWithProvider } from "@/features/auth/api/auth.api";

jest.mock("@/shared/api/supabaseClient", () => ({
  supabase: { auth: { signInWithOAuth: jest.fn() } }
}));

jest.mock("@/shared/native/linking", () => ({
  openExternalUrl: jest.fn()
}));

const { supabase } = jest.requireMock("@/shared/api/supabaseClient") as {
  supabase: { auth: { signInWithOAuth: jest.Mock } };
};
const { openExternalUrl } = jest.requireMock("@/shared/native/linking") as {
  openExternalUrl: jest.Mock;
};

beforeEach(() => {
  supabase.auth.signInWithOAuth.mockReset();
  openExternalUrl.mockReset();
});

describe("signInWithProvider", () => {
  it("opens the provider URL returned by Supabase (native OAuth has no auto-redirect)", async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://provider.example/oauth?code=1", provider: "apple" },
      error: null
    });

    await signInWithProvider("apple");

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: { redirectTo: "truespend://verify", skipBrowserRedirect: true }
    });
    expect(openExternalUrl).toHaveBeenCalledWith("https://provider.example/oauth?code=1");
  });

  it("throws and opens nothing when Supabase returns an error", async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("provider disabled")
    });

    await expect(signInWithProvider("google")).rejects.toThrow("provider disabled");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("throws when no URL comes back", async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });

    await expect(signInWithProvider("google")).rejects.toThrow("Unable to start sign-in.");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
