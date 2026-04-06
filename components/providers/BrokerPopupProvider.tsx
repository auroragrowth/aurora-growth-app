"use client";

import { createContext, useCallback, useContext, useState } from "react";
type BrokerPopupContextType = {
  openTrading212Popup: () => void;
};

const BrokerPopupContext = createContext<BrokerPopupContextType>({
  openTrading212Popup: () => {},
});

export function BrokerPopupProvider({ children }: { children: React.ReactNode }) {
  const openTrading212Popup = useCallback(() => {
    window.location.href = "/dashboard/connections";
  }, []);

  return (
    <BrokerPopupContext.Provider value={{ openTrading212Popup }}>
      {children}
    </BrokerPopupContext.Provider>
  );
}

export function useBrokerPopup() {
  return useContext(BrokerPopupContext);
}
