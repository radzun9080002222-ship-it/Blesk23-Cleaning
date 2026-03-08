declare global {
  interface Window {
    ym?: (
      counterId: number,
      action: "reachGoal",
      target: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

const METRIKA_ID = 107216997;

export type MetrikaGoal = "phone_click" | "messenger_click" | "form_submit";

export const reachGoal = (goal: MetrikaGoal) => {
  if (typeof window !== "undefined" && typeof window.ym === "function") {
    window.ym(METRIKA_ID, "reachGoal", goal);
  }
};
