import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { translateSector, type Locale, type Messages } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { fetchEntitlement } from "../lib/entitlements-client";
import { fetchBulletins, type Bulletin } from "../lib/bulletins-client";

const COLLAPSED_LINES = 4;

function BulletinCard({
  bulletin,
  locale,
  t,
  styles,
}: {
  bulletin: Bulletin;
  locale: Locale;
  t: Messages["bulletin"];
  styles: ReturnType<typeof makeStyles>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [truncatable, setTruncatable] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sector}>{translateSector(bulletin.sector, locale)}</Text>
        <Text style={styles.date}>{new Date(bulletin.bulletin_date).toLocaleDateString(locale)}</Text>
      </View>
      <Text
        style={styles.content}
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length > COLLAPSED_LINES) setTruncatable(true);
        }}
      >
        {bulletin.content}
      </Text>
      {truncatable && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.readMore}>{expanded ? t.readLessLabel : t.readMoreLabel}</Text>
        </TouchableOpacity>
      )}
      {bulletin.picks.length > 0 && (
        <View style={styles.picksWrap}>
          <Text style={styles.picksLabel}>{t.picksLabel}</Text>
          <View style={styles.picksRow}>
            {bulletin.picks.map((pick) => (
              <View key={pick.symbol} style={styles.pickChip}>
                <Text style={styles.pickChipText}>
                  {pick.symbol} · {pick.score}/100 · {pick.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Text style={styles.disclaimer}>{t.disclaimer}</Text>
    </View>
  );
}

export function BulletinSection() {
  const { locale, messages } = useLocale();
  const t = messages.bulletin;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [locked, setLocked] = useState<boolean | null>(null);
  const [bulletins, setBulletins] = useState<Bulletin[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const entitlement = await fetchEntitlement();
        if (cancelled) return;
        setLocked(!entitlement.ai_reports);
        if (!entitlement.ai_reports) return;
        const data = await fetchBulletins();
        if (!cancelled) setBulletins(data.bulletins);
      } catch {
        if (!cancelled) setBulletins([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (locked === null) return <Text style={styles.emptyText}>{messages.common.loading}</Text>;

  if (locked) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{t.lockedMessage}</Text>
      </View>
    );
  }

  if (bulletins === null) return <Text style={styles.emptyText}>{messages.common.loading}</Text>;

  if (bulletins.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{t.empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {bulletins.map((bulletin) => (
        <BulletinCard key={bulletin.bulletin_date} bulletin={bulletin} locale={locale} t={t} styles={styles} />
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: spacing[3],
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing[2],
    },
    sector: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.accent,
    },
    date: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    content: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    readMore: {
      marginTop: spacing[1] + 2,
      fontSize: 12,
      fontWeight: "600",
      color: colors.accent,
    },
    picksWrap: {
      marginTop: spacing[3],
      paddingTop: spacing[3],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    picksLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      marginBottom: spacing[1] + 2,
    },
    picksRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[1] + 2,
    },
    pickChip: {
      backgroundColor: colors.surfaceHover,
      borderRadius: radius.full,
      paddingHorizontal: spacing[2] + 2,
      paddingVertical: spacing[1],
    },
    pickChipText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    disclaimer: {
      marginTop: spacing[3],
      fontSize: 11,
      color: colors.textTertiary,
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
