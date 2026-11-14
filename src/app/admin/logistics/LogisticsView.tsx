"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NIGERIA_STATES } from "@/lib/nigeria-lga-complete";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bulkUpsertStateRates } from "@/app/actions/admin-logistics";
import { cn } from "@/lib/utils";

export function LogisticsView({ initialRates }: { initialRates: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<string | null>(null);

  // Map: "State|LGA" -> fee
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialRates.forEach((r) => {
      map[`${r.state}|${r.lga}`] = Number(r.fee);
    });
    return map;
  });

  async function handleSave(state: string) {
    setBusyState(state);
    const lgas = NIGERIA_STATES[state] || [];
    const payload = lgas.map((lga) => ({
      lga,
      fee: rates[`${state}|${lga}`] || 0,
    }));

    const res = await bulkUpsertStateRates(state, payload);
    setBusyState(null);

    if (res.ok) toast.success(`${state} rates saved`);
    else toast.error(res.error);
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Logistics & Delivery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure delivery fees per LGA for each state.
        </p>
      </div>

      <div className="space-y-2">
        {Object.keys(NIGERIA_STATES).map((state) => {
          const lgas = NIGERIA_STATES[state];
          const configuredCount = lgas.filter(
            (l) => rates[`${state}|${l}`] !== undefined,
          ).length;
          const isExpanded = expanded === state;

          return (
            <div
              key={state}
              className="rounded-lg border bg-card overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : state)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div>
                  <div className="font-semibold">{state}</div>
                  <div className="text-xs text-muted-foreground">
                    {configuredCount} of {lgas.length} LGAs configured
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t p-4 bg-muted/10 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lgas.map((lga) => (
                      <div
                        key={lga}
                        className="flex items-center gap-3 bg-background p-2 rounded border"
                      >
                        <span className="text-sm flex-1 truncate">{lga}</span>
                        <Input
                          type="number"
                          min="0"
                          value={rates[`${state}|${lga}`] || ""}
                          onChange={(e) =>
                            setRates({
                              ...rates,
                              [`${state}|${lga}`]: Number(e.target.value),
                            })
                          }
                          placeholder="₦0"
                          className="w-24 h-8 text-right"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleSave(state)}
                    disabled={busyState === state}
                    className="w-full sm:w-auto"
                  >
                    {busyState === state ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save All LGAs
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
