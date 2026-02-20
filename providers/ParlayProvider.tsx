"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { ParlayLeg, calculateParlay, type ParlayCalculation } from "@/lib/parlay/calculator";

interface ParlayState {
  legs: ParlayLeg[];
  stake: number;
  isOpen: boolean; // slip visibility on mobile
  isExecuting: boolean;
  calculation: ParlayCalculation;
}

type ParlayAction =
  | { type: "ADD_LEG"; leg: ParlayLeg }
  | { type: "REMOVE_LEG"; id: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_STAKE"; stake: number }
  | { type: "TOGGLE_SLIP" }
  | { type: "SET_OPEN"; open: boolean }
  | { type: "SET_EXECUTING"; executing: boolean };

function parlayReducer(state: ParlayState, action: ParlayAction): ParlayState {
  let newLegs: ParlayLeg[];

  switch (action.type) {
    case "ADD_LEG":
      // Don't add if already exists (same market + same side)
      if (state.legs.some((l) => l.id === action.leg.id)) return state;
      // Remove opposite side from same market if exists
      newLegs = state.legs.filter((l) => l.marketId !== action.leg.marketId);
      newLegs = [...newLegs, action.leg];
      return {
        ...state,
        legs: newLegs,
        isOpen: true,
        calculation: calculateParlay(newLegs, state.stake),
      };

    case "REMOVE_LEG":
      newLegs = state.legs.filter((l) => l.id !== action.id);
      return {
        ...state,
        legs: newLegs,
        isOpen: newLegs.length > 0 ? state.isOpen : false,
        calculation: calculateParlay(newLegs, state.stake),
      };

    case "CLEAR_ALL":
      return {
        ...state,
        legs: [],
        isOpen: false,
        calculation: calculateParlay([], state.stake),
      };

    case "SET_STAKE":
      return {
        ...state,
        stake: action.stake,
        calculation: calculateParlay(state.legs, action.stake),
      };

    case "TOGGLE_SLIP":
      return { ...state, isOpen: !state.isOpen };

    case "SET_OPEN":
      return { ...state, isOpen: action.open };

    case "SET_EXECUTING":
      return { ...state, isExecuting: action.executing };

    default:
      return state;
  }
}

const initialState: ParlayState = {
  legs: [],
  stake: 50,
  isOpen: false,
  isExecuting: false,
  calculation: calculateParlay([], 50),
};

interface ParlayContextType {
  state: ParlayState;
  addLeg: (leg: ParlayLeg) => void;
  removeLeg: (id: string) => void;
  clearAll: () => void;
  setStake: (stake: number) => void;
  toggleSlip: () => void;
  setSlipOpen: (open: boolean) => void;
  isLegAdded: (id: string) => boolean;
  isMarketInParlay: (marketId: string) => boolean;
  getMarketSide: (marketId: string) => "YES" | "NO" | null;
}

const ParlayContext = createContext<ParlayContextType | null>(null);

export function ParlayProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(parlayReducer, initialState);

  const addLeg = useCallback((leg: ParlayLeg) => {
    dispatch({ type: "ADD_LEG", leg });
  }, []);

  const removeLeg = useCallback((id: string) => {
    dispatch({ type: "REMOVE_LEG", id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const setStake = useCallback((stake: number) => {
    dispatch({ type: "SET_STAKE", stake: Math.max(0, stake) });
  }, []);

  const toggleSlip = useCallback(() => {
    dispatch({ type: "TOGGLE_SLIP" });
  }, []);

  const setSlipOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_OPEN", open });
  }, []);

  const isLegAdded = useCallback(
    (id: string) => state.legs.some((l) => l.id === id),
    [state.legs]
  );

  const isMarketInParlay = useCallback(
    (marketId: string) => state.legs.some((l) => l.marketId === marketId),
    [state.legs]
  );

  const getMarketSide = useCallback(
    (marketId: string): "YES" | "NO" | null => {
      const leg = state.legs.find((l) => l.marketId === marketId);
      return leg?.side ?? null;
    },
    [state.legs]
  );

  return (
    <ParlayContext.Provider
      value={{
        state,
        addLeg,
        removeLeg,
        clearAll,
        setStake,
        toggleSlip,
        setSlipOpen,
        isLegAdded,
        isMarketInParlay,
        getMarketSide,
      }}
    >
      {children}
    </ParlayContext.Provider>
  );
}

export function useParlay() {
  const context = useContext(ParlayContext);
  if (!context) throw new Error("useParlay must be used within ParlayProvider");
  return context;
}
