import { createContext, useContext, useState, ReactNode } from "react";

type GoalContextType = {
  monthlyGoal: number | null;
  setMonthlyGoal: (v: number | null) => void;
};

const GoalContext = createContext<GoalContextType>({
  monthlyGoal: null,
  setMonthlyGoal: () => {},
});

export function GoalProvider({ children }: { children: ReactNode }) {
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  return (
    <GoalContext.Provider value={{ monthlyGoal, setMonthlyGoal }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoal() {
  return useContext(GoalContext);
}
