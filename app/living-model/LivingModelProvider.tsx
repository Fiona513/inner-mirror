"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { createDemoState } from "./demo-data";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer, loadLivingState } from "./store";
import type { LivingAction, LivingModelState } from "./types";

interface LivingModelContextValue {
  state: LivingModelState;
  dispatch: React.Dispatch<LivingAction>;
}

const LivingModelContext = createContext<LivingModelContextValue | null>(null);

export function LivingModelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(livingModelReducer, undefined, createDemoState);
  const skipInitialPersistence = useRef(true);

  useEffect(() => {
    const saved = loadLivingState(window.localStorage.getItem(LIVING_MODEL_STORAGE_KEY));
    dispatch({ type: "HYDRATE", state: saved });
  }, []);

  useEffect(() => {
    if (skipInitialPersistence.current) {
      skipInitialPersistence.current = false;
      return;
    }
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <LivingModelContext.Provider value={value}>{children}</LivingModelContext.Provider>;
}

export function useLivingModel() {
  const value = useContext(LivingModelContext);
  if (!value) throw new Error("useLivingModel must be used within LivingModelProvider");
  return value;
}
