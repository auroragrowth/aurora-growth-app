"use client";

import { useEffect, useRef } from "react";

type Props = {
  symbol: string;
};

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

export default function TradingViewAdvancedChart({ symbol }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = "tradingview-widget-script";

    function createWidget() {
      if (!window.TradingView || !container.current) return;

      container.current.innerHTML = "";

      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        container_id: container.current.id,
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: true,
      });
    }

    const existing = document.getElementById(scriptId);

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  }, [symbol]);

  return (
    <div className="w-full h-[700px] bg-black rounded-lg border border-gray-700 overflow-hidden">
      <div
        ref={container}
        id="tradingview_chart_container"
        className="w-full h-full"
      />
    </div>
  );
}
