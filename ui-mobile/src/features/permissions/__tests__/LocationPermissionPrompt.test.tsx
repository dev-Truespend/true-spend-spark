import { ReactElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { LocationPermissionPrompt } from "@/features/permissions/components/LocationPermissionPrompt";
import { ThemeProvider } from "@/providers/ThemeProvider";

jest.mock("@/shared/native/location", () => ({
  requestLocationPermission: jest.fn()
}));

const { requestLocationPermission } = jest.requireMock("@/shared/native/location") as {
  requestLocationPermission: jest.Mock;
};

const renderThemed = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

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

    fireEvent.press(screen.getByText("Allow while using"));

    await waitFor(() => expect(screen.getByText("Enable Always Allow")).toBeTruthy());
    expect(requestLocationPermission).toHaveBeenCalledWith("foreground");
    expect(onReport).not.toHaveBeenCalled();
  });

  it("reports authorized_always after the user enables Always", async () => {
    requestLocationPermission
      .mockResolvedValueOnce({ state: "authorized_when_in_use", canAskAgain: true })
      .mockResolvedValueOnce({ state: "authorized_always", canAskAgain: false });
    const onReport = jest.fn();
    renderThemed(<LocationPermissionPrompt scope="background" onReport={onReport} />);

    fireEvent.press(screen.getByText("Allow while using"));
    await waitFor(() => screen.getByText("Enable Always Allow"));
    fireEvent.press(screen.getByText("Enable Always Allow"));

    await waitFor(() => expect(onReport).toHaveBeenCalledWith("authorized_always"));
    expect(requestLocationPermission).toHaveBeenLastCalledWith("background");
  });

  it("keeps While-Using when the user skips the Always step", async () => {
    requestLocationPermission.mockResolvedValueOnce({ state: "authorized_when_in_use", canAskAgain: true });
    const onReport = jest.fn();
    renderThemed(<LocationPermissionPrompt scope="background" onReport={onReport} />);

    fireEvent.press(screen.getByText("Allow while using"));
    await waitFor(() => screen.getByText(/Keep/));
    fireEvent.press(screen.getByText(/Keep/));

    expect(onReport).toHaveBeenCalledWith("authorized_when_in_use");
  });
});
