import React, { useEffect, useRef } from "react";
import {
  AvailableSaveloadVersions,
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
  IChartingLibraryWidget,
  TradingTerminalWidgetOptions
} from "../../../public/static/charting_library";
import { Datafeed, BONDING_CURVE_BASE_TOKEN } from '@src/services/chart/datafeed';

const Chart = ({ symbol, clubId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef<IChartingLibraryWidget | null>();

  const defaultProps = {
    symbol: `${symbol}/${BONDING_CURVE_BASE_TOKEN}:${clubId}`,
    interval: '15' as ResolutionString,
    libraryPath: '/static/charting_library/',
    chartsStorageApiVersion: '1.1' as AvailableSaveloadVersions,
    clientId: 'tradingview.com',
    userId: 'public_user_id',
    fullscreen: false,
    autosize: true,
    locale: "en"
  };

  useEffect(() => {
    if (chartContainerRef.current) {
      const widgetOptions: ChartingLibraryWidgetOptions | TradingTerminalWidgetOptions = {
        symbol: defaultProps.symbol,
        datafeed: Datafeed,
        interval: defaultProps.interval as ResolutionString,
        container: chartContainerRef.current,
        library_path: defaultProps.libraryPath,
        locale: defaultProps.locale as LanguageCode,
        theme: "dark",
        disabled_features: ["use_localstorage_for_settings", "popup_hints"],
        enabled_features: [],
        charts_storage_api_version: defaultProps.chartsStorageApiVersion,
        client_id: defaultProps.clientId,
        user_id: defaultProps.userId,
        fullscreen: defaultProps.fullscreen,
        autosize: defaultProps.autosize,
        loading_screen: { backgroundColor: "#141414" },
        toolbar_bg: "#000",
        overrides: {
          "paneProperties.background": "#000",
          "paneProperties.backgroundType": "solid",
        } // https://www.tradingview.com/charting-library-docs/latest/customization/overrides/chart-overrides#scalesproperties
      };

      chartRef.current = new widget(widgetOptions);

      // chartRef.current.onChartReady(() => {
      //   chartRef.current!.headerReady().then(() => {
      //     const button = chartRef.current!.createButton();
      //     button.setAttribute('title', 'Click to show a notification popup');
      //     button.classList.add('apply-common-tooltip');
      //     button.addEventListener('click', () => chartRef.current!.showNoticeDialog({
      //       title: 'Notification',
      //       body: 'TradingView Charting Library API works correctly',
      //       callback: () => {
      //         console.log('Noticed!');
      //       },
      //     }));

      //     button.innerHTML = 'Check API';
      //   });
      // });

      // Cleanup function to remove the widget on unmount
      return () => {
        chartRef.current!.remove();
      };
    }
  }, [chartContainerRef]);

  return (
    <div className="rounded-lg shadow-md">
      <div className="h-[50vh] md:h-[60vh] min-h-[200px] md:min-h-[425px] bg-background text-secondary" ref={chartContainerRef}></div>
    </div>
  )
}

export default React.memo(Chart);