import { ReactElement } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { LocationPermissionPrompt } from "@/features/permissions/components/LocationPermissionPrompt";
import { ThemeProvider } from "@/providers/ThemeProvider";

jest.mock("@/shared/native/location", () => ({
  requestLocationPermission: jest.fn()
}));

const { requestLocationPermission } = jest.requireMock("@/shared/native/location") as {
  requestLocationPermission: jest.Mock;
};

const renderThemed = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// The press handler is async (awaits the permission request). act(async) flushes those microtasks and
// the resulting state updates deterministically — avoiding timer-based waitFor, which is flaky under a
// loaded jest worker.
const press = (label: string | RegExp) =>
  act(async () => {
    fireEvent.press(screen.getByText(label));
  });

beforeEach(() => {
  requestLocationPermission.mockReset();
});

describe("LocationPermissionPrompt (background scope)", () => {
  // Regression: reporting the When-In-Use grant immediately advanced onboarding, so the user never
  // reached the "Always" escalation. The intermediate grant must NOT report.
  it("does not report after the While-Using grant — it escalates to Always instead", async () => {
    requestLocationPermission.mockResolvedValueOnce({ state: "authorized_when_in_use", canAskAgain: true });
    const onReport = jest.fn();
    renderThemed(<LocationPermissionPrompt scope="background" onReport={onReport} />);

    await press("Allow while using");

    expect(requestLocationPermission).toHaveBeenCalledWith("foreground");
    expect(screen.getByText("Enable Always Allow")).toBeTruthy();
    expect(onReport).not.toHaveBeenCalled();
  });

  it("reports authorized_always after the user enables Always", async () => {
    requestLocationPermission
      .mockResolvedValueOnce({ state: "authorized_when_in_use", canAskAgain: true })
      .mockResolvedValueOnce({ state: "authorized_always", canAskAgain: false });
    const onReport = jest.fn();
    renderThemed(<LocationPermissionPrompt scope="background" onReport={onReport} />);

    await press("Allow while using");
    await press("Enable Always Allow");

    expect(requestLocationPermission).toHaveBeenLastCalledWith("background");
    expect(onReport).toHaveBeenCalledWith("authorized_always");
  });

  it("keeps While-Using when the user skips the Always step", async () => {
    requestLocationPermission.mockResolvedValueOnce({ state: "authorized_when_in_use", canAskAgain: true });
    const onReport = jest.fn();
    renderThemed(<LocationPermissionPrompt scope="background" onReport={onReport} />);

    await press("Allow while using");
    await press(/Keep/);

    expect(onReport).toHaveBeenCalledWith("authorized_when_in_use");
  });
});
