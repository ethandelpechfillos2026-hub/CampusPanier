"use client";

import { useState } from "react";
import Mascot from "@/components/Mascot";
import PrintableListView from "@/components/PrintableListView";
import { formatPrice } from "@/lib/generateShoppingList";
import { getListHistory, ListHistoryEntry } from "@/lib/stats";

interface HistoryPanelProps {
  onClose: () => void;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const CHART_PADDING = 24;

export default function HistoryPanel({ onClose }: HistoryPanelProps) {
  const history = getListHistory(); // le plus récent en premier
  const [selected, setSelected] = useState<ListHistoryEntry | null>(null);

  // Jusqu'aux 10 dernières listes, remises dans l'ordre chronologique pour
  // le graphique (du plus ancien à gauche au plus récent à droite).
  const chartEntries = history.slice(0, 10).slice().reverse();
  const maxValue = Math.max(
    1,
    ...chartEntries.flatMap((entry) => [entry.budget, entry.total])
  );
  const barGroupWidth =
    chartEntries.length > 0
      ? (CHART_WIDTH - CHART_PADDING * 2) / chartEntries.length
      : 0;

  function scaleHeight(value: number): number {
    return (value / maxValue) * (CHART_HEIGHT - CHART_PADDING * 2);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center print:static print:h-auto print:overflow-visible print:bg-transparent print:p-0">
      <div className="max-h-[85vh] w-full max-w-[420px] overflow-y-auto rounded-3xl bg-campus-surface p-5 shadow-2xl print:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Mascot mood="happy" size={44} />
            <div>
              <h2 className="text-lg font-bold text-campus-ink">
                Historique &amp; évolution
              </h2>
              <p className="text-xs text-campus-muted">
                {history.length} liste{history.length > 1 ? "s" : ""} générée
                {history.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-full bg-campus-sand px-2.5 py-1 text-sm font-bold text-campus-ink"
          >
            ✕
          </button>
        </div>

        {chartEntries.length === 0 ? (
          <p className="mt-4 text-sm text-campus-muted">
            Génère quelques listes pour voir ton évolution ici.
          </p>
        ) : (
          <div className="mt-4 rounded-2xl border border-campus-sand bg-campus-cream/60 p-3">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full"
              role="img"
              aria-label="Évolution du budget dépensé par rapport au budget prévu"
            >
              {chartEntries.map((entry, index) => {
                const x = CHART_PADDING + index * barGroupWidth;
                const budgetHeight = scaleHeight(entry.budget);
                const spentHeight = scaleHeight(entry.total);
                const barWidth = Math.max(4, barGroupWidth * 0.28);
                const baseY = CHART_HEIGHT - CHART_PADDING;
                return (
                  <g key={`${entry.timestamp}-${index}`}>
                    <rect
                      x={x}
                      y={baseY - budgetHeight}
                      width={barWidth}
                      height={budgetHeight}
                      rx={2}
                      fill="#F5E6D3"
                    />
                    <rect
                      x={x + barWidth + 3}
                      y={baseY - spentHeight}
                      width={barWidth}
                      height={spentHeight}
                      rx={2}
                      fill={entry.isOverBudget ? "#E05252" : "#4CAF7D"}
                    />
                  </g>
                );
              })}
              <line
                x1={CHART_PADDING}
                y1={CHART_HEIGHT - CHART_PADDING}
                x2={CHART_WIDTH - CHART_PADDING}
                y2={CHART_HEIGHT - CHART_PADDING}
                stroke="#E5D3BC"
                strokeWidth={2}
              />
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-campus-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-campus-sand" />{" "}
                Budget
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-campus-success" />{" "}
                Sous budget
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-campus-danger" />{" "}
                Dépassé
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-campus-muted">
              Aucune liste générée pour l&apos;instant.
            </p>
          ) : (
            history.map((entry, index) => {
              const dateLabel = new Date(entry.timestamp).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "short", year: "numeric" }
              );
              return (
                <button
                  key={`${entry.timestamp}-${index}`}
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="flex w-full items-center justify-between rounded-2xl border border-campus-sand bg-campus-surface px-3.5 py-3 text-left transition-colors hover:border-campus-terracotta/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-campus-ink">
                      {dateLabel}
                    </p>
                    <p className="text-xs text-campus-muted">
                      {entry.items ? `${entry.items.length} article${entry.items.length > 1 ? "s" : ""}` : "Détail indisponible"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        entry.isOverBudget
                          ? "text-campus-danger"
                          : "text-campus-success"
                      }`}
                    >
                      {formatPrice(entry.total)}
                    </p>
                    <p className="text-xs text-campus-muted">
                      / {formatPrice(entry.budget)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-secondary mt-4"
        >
          Fermer
        </button>
      </div>

      {selected && (
        <PrintableListView
          entry={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
