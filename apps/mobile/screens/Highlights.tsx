import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatPrice, formatSignedPercent, signColor } from "@boursea/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { fetchHighlights, type Highlight } from "../lib/highlights-client";

type SymbolResult = { symbol: string; name: string; exchange: string };

export function Highlights({ onSelectResult }: { onSelectResult: (result: SymbolResult) => void }) {
  const { locale, messages } = useLocale();
  const t = messages.highlights;
  const { colors, mode } = useTheme();
  const styles = makeStyles(colors);

  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchHighlights();
        if (!cancelled) {
          setHighlights(data.highlights);
          setWarnings(data.warnings);
        }
      } catch {
        if (!cancelled) setHighlights([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (highlights === null) return <Text style={styles.emptyText}>{messages.common.loading}</Text>;

  if (highlights.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{warnings[0] ?? t.empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {highlights.map((h) => (
        <TouchableOpacity
          key={`${h.exchange}-${h.symbol}`}
          style={styles.row}
          onPress={() => onSelectResult({ symbol: h.symbol, name: h.name, exchange: h.exchange })}
        >
          <Text style={styles.symbol}>{h.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {h.name}
          </Text>
          {h.price !== null && (
            <Text style={styles.price}>{formatPrice(h.price, "USD", locale)}</Text>
          )}
          {h.change_pct !== null && (
            <Text style={{ color: signColor(h.change_abs, mode), fontSize: 12, fontWeight: "600" }}>
              {formatSignedPercent(h.change_pct, locale)}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: spacing[2],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[3],
    },
    symbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    name: {
      flex: 1,
      fontSize: 12,
      color: colors.textTertiary,
    },
    price: {
      fontSize: 12,
      color: colors.textPrimary,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
}
