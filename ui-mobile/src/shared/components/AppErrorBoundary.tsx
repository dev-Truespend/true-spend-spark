import { Component, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Top-level boundary for unexpected client-side render errors. Shows a friendly
// fallback instead of a redbox / raw error text (requirement: never surface raw
// errors). Recoverable via "Try again", which re-mounts the subtree.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Hook for the mobile monitoring tool (TBD). Keep raw detail out of the UI.
    if (__DEV__) console.error("Unhandled UI error:", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10, backgroundColor: t.colors.background },
      glyph: { fontSize: scaleFont(40) },
      title: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(18), color: t.colors.text, marginTop: 8 },
      body: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.mutedFg, textAlign: "center", lineHeight: 19 },
      action: { marginTop: 12, alignSelf: "stretch" }
    })
  );
  return (
    <View style={styles.wrap}>
      <Text style={styles.glyph}>🙈</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>An unexpected error occurred. You can try again — your data is safe.</Text>
      <View style={styles.action}>
        <Button label="Try again" onPress={onReset} />
      </View>
    </View>
  );
}
