"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@borocean/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextBlockSkeleton } from "@/components/ui/skeleton";
import { ProseText } from "@/components/ui/prose-text";
import { fetchEntitlement } from "@/lib/entitlements-client";
import {
  fetchCombinedAIReport,
  fetchFundamentalAIReport,
  fetchTechnicalAIReport,
  type CombinedAIReport,
  type FundamentalAIReport,
  type TechnicalAIReport,
} from "@/lib/ai-reports-client";
import { ScoreBadge } from "./score-badge";

type ReportState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; report: T };

function CombinedReportCard({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages["aiAnalysis"];
}) {
  const t = messages;
  const [state, setState] = useState<ReportState<CombinedAIReport>>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const data = await fetchCombinedAIReport(symbol, exchange);
      if (data.report) {
        setState({ status: "loaded", report: data.report });
      } else {
        setState({ status: "error", message: data.warnings[0] ?? t.unavailableMessage });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error && err.message ? err.message : t.unavailableMessage,
      });
    }
  }

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {t.combinedTitle}
      </p>
      {state.status === "idle" && (
        <Button type="button" onClick={generate}>
          {t.generateButton}
        </Button>
      )}
      {state.status === "loading" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-tertiary">{t.generating}</p>
          <TextBlockSkeleton />
        </div>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.message}
        </p>
      )}
      {state.status === "loaded" && (
        <>
          <ProseText text={state.report.report} />
          {state.report.cached && (
            <p className="mt-2 text-xs text-text-tertiary">{t.cachedNote}</p>
          )}
          <p className="mt-2 text-xs text-text-tertiary">{t.combinedDisclaimer}</p>
          <Button type="button" variant="secondary" onClick={generate} className="mt-3">
            {t.generateButton}
          </Button>
        </>
      )}
    </Card>
  );
}

function FundamentalReportCard({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages["aiAnalysis"];
}) {
  const t = messages;
  const [state, setState] = useState<ReportState<FundamentalAIReport>>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const data = await fetchFundamentalAIReport(symbol, exchange);
      if (data.report) {
        setState({ status: "loaded", report: data.report });
      } else {
        setState({ status: "error", message: data.warnings[0] ?? t.unavailableMessage });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error && err.message ? err.message : t.unavailableMessage,
      });
    }
  }

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {t.fundamentalTitle}
      </p>
      {state.status === "idle" && (
        <Button type="button" onClick={generate}>
          {t.generateButton}
        </Button>
      )}
      {state.status === "loading" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-tertiary">{t.generating}</p>
          <TextBlockSkeleton />
        </div>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.message}
        </p>
      )}
      {state.status === "loaded" && (
        <>
          <ProseText text={state.report.report} />
          {state.report.cached && (
            <p className="mt-2 text-xs text-text-tertiary">{t.cachedNote}</p>
          )}
          <p className="mt-2 text-xs text-text-tertiary">{t.fundamentalDisclaimer}</p>
          <Button type="button" variant="secondary" onClick={generate} className="mt-3">
            {t.generateButton}
          </Button>
        </>
      )}
    </Card>
  );
}

function TechnicalReportCard({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages["aiAnalysis"];
}) {
  const t = messages;
  const [state, setState] = useState<ReportState<TechnicalAIReport>>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const data = await fetchTechnicalAIReport(symbol, exchange);
      if (data.report) {
        setState({ status: "loaded", report: data.report });
      } else {
        setState({ status: "error", message: data.warnings[0] ?? t.unavailableMessage });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error && err.message ? err.message : t.unavailableMessage,
      });
    }
  }

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {t.technicalTitle}
      </p>
      {state.status === "idle" && (
        <Button type="button" onClick={generate}>
          {t.generateButton}
        </Button>
      )}
      {state.status === "loading" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-tertiary">{t.generating}</p>
          <p className="text-xs text-text-tertiary">{t.technicalGeneratingHint}</p>
          <TextBlockSkeleton />
        </div>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.message}
        </p>
      )}
      {state.status === "loaded" && (
        <>
          <ProseText text={state.report.report} />
          {state.report.cached && (
            <p className="mt-2 text-xs text-text-tertiary">{t.cachedNote}</p>
          )}
          <p className="mt-2 text-xs text-text-tertiary">{t.technicalDisclaimer}</p>
          <Button type="button" variant="secondary" onClick={generate} className="mt-3">
            {t.generateButton}
          </Button>
        </>
      )}
    </Card>
  );
}

export function AIAnalysisPanel({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages;
}) {
  const t = messages.aiAnalysis;
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const entitlement = await fetchEntitlement();
        if (!cancelled) setLocked(!entitlement.ai_reports);
      } catch {
        if (!cancelled) setLocked(true);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (locked === null) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {t.loading}
          </p>
          <TextBlockSkeleton />
        </Card>
      </div>
    );
  }

  if (locked) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">{t.lockedMessage}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CombinedReportCard exchange={exchange} symbol={symbol} messages={t} />
      <TechnicalReportCard exchange={exchange} symbol={symbol} messages={t} />
      <FundamentalReportCard exchange={exchange} symbol={symbol} messages={t} />
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t.deterministicTitle}
        </p>
        <ScoreBadge exchange={exchange} symbol={symbol} messages={messages} />
      </div>
    </div>
  );
}
