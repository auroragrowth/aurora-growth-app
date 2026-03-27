"use client";

import { createContext, useCallback, useContext, useState } from "react";
import BrokerConnectModal from "@/components/dashboard/BrokerConnectModal";

type BrokerPopupContextType = {
  openTrading212Popup: () => void;
};

const BrokerPopupContext = createContext<BrokerPopupContextType>({
  openTrading212Popup: () => {},
});

export function BrokerPopupProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openTrading212Popup = useCallback(() => setOpen(true), []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <BrokerPopupContext.Provider value={{ openTrading212Popup }}>
      {children}
      {open && <BrokerConnectModal onClose={handleClose} />}
    </BrokerPopupContext.Provider>
  );
}

export function useBrokerPopup() {
  return useContext(BrokerPopupContext);
}
