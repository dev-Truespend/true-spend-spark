import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Appearance } from "react-native";
import { StyleSheet } from "react-native";
import {
  colorsByScheme,
  gradientsByScheme,
  palettesByScheme,
  tintsByScheme,
  Scheme
} from "@/shared/theme/colors";
import { spacing, radii } from "@/shared/theme/spacing";
import { fontFamily, typography } from "@/shared/theme/typography";

type ThemeMode = "light" | "dark" | "system";

export type Theme = {
  scheme: Scheme;
  isDark: boolean;
  colors: (typeof colorsByScheme)[Scheme];
  palette: (typeof palettesByScheme)[Scheme];
  tints: (typeof tintsByScheme)[Scheme];
  gradients: (typeof gradientsByScheme)[Scheme];
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
};

type ThemeApi = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | null>(null);
const ThemeApiContext = createContext<ThemeApi | null>(null);

function resolveScheme(mode: ThemeMode, systemScheme: Scheme): Scheme {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<Scheme>(
    (Appearance.getColorScheme() ?? "light") as Scheme
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme ?? "light") as Scheme);
    });
    return () => sub.remove();
  }, []);

  // Push the resolved scheme down to the OS so native controls (status bar,
  // keyboard, system Switch, native Modal chrome) follow the app preference.
  useEffect(() => {
    if (mode === "system") {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
  }, [mode]);

  const scheme = resolveScheme(mode, systemScheme);

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      isDark: scheme === "dark",
      colors: colorsByScheme[scheme],
      palette: palettesByScheme[scheme],
      tints: tintsByScheme[scheme],
      gradients: gradientsByScheme[scheme],
      spacing,
      radii,
      typography,
      fontFamily
    }),
    [scheme]
  );

  const api = useMemo<ThemeApi>(() => ({ mode, setMode }), [mode]);

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeApiContext.Provider value={api}>{children}</ThemeApiContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export function useThemeApi(): ThemeApi {
  const ctx = useContext(ThemeApiContext);
  if (!ctx) throw new Error("useThemeApi must be used inside ThemeProvider");
  return ctx;
}

// Memoize themed stylesheets. Use as:
//
//   const styles = useThemedStyles((t) => StyleSheet.create({
//     row: { backgroundColor: t.colors.background }
//   }));
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
