import { ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { CategoryChips } from "@/features/cards/components/CategoryChips";
import { ThemeProvider } from "@/providers/ThemeProvider";

const renderThemed = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// `icon` is a raw icon NAME from the API (e.g. "shopping-cart"), not a glyph. Regression: it was
// concatenated into the chip label, leaking "shopping-cart Groceries" into the UI.
const categories = [
  { code: "groceries", displayName: "Groceries", icon: "shopping-cart" },
  { code: "electronics", displayName: "Electronics", icon: "tv" }
];

describe("CategoryChips", () => {
  it("renders the display name without leaking the raw icon name", () => {
    renderThemed(<CategoryChips categories={categories} activeCode="groceries" onChange={jest.fn()} ambiguous />);

    expect(screen.getByText("Groceries")).toBeTruthy();
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.queryByText(/shopping-cart/)).toBeNull();
    expect(screen.queryByText(/tv/)).toBeNull();
  });

  it("invokes onChange with the tapped category code", () => {
    const onChange = jest.fn();
    renderThemed(<CategoryChips categories={categories} activeCode="groceries" onChange={onChange} ambiguous />);

    fireEvent.press(screen.getByText("Electronics"));

    expect(onChange).toHaveBeenCalledWith("electronics");
  });

  it("renders nothing when there are no categories", () => {
    const { toJSON } = renderThemed(<CategoryChips categories={[]} activeCode="" onChange={jest.fn()} ambiguous />);

    expect(toJSON()).toBeNull();
  });
});
