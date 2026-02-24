import React, { useEffect, useMemo, useState } from "react";

const DashboardTabSwitcher = ({
  activeTab,
  tabs,
  onTabChange,
  isBusy = false,
  dialogLabel = "Switch dashboard tab",
  sheetTitle = "Switch View",
  changeButtonLabel = "Change Tab",
}) => {
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);

  const normalizedTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        disabled: Boolean(tab.disabled || isBusy),
      })),
    [tabs, isBusy]
  );

  const activeTabLabel =
    normalizedTabs.find((tab) => tab.key === activeTab)?.label || "Dashboard";

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setMobileTabMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileTabMenuOpen(false);
  }, [activeTab, isBusy]);

  useEffect(() => {
    if (!mobileTabMenuOpen) return;

    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        setMobileTabMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [mobileTabMenuOpen]);

  const handleTabSelection = (tab) => {
    if (tab.disabled) return;
    onTabChange(tab.key);
    setMobileTabMenuOpen(false);
  };

  return (
    <>
      <div className="tab-nav dashboard-desktop-tab-nav">
        {normalizedTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabSelection(tab)}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isMobileView && (
        <div className="dashboard-mobile-tab-trigger-bar">
          <span className="dashboard-mobile-tab-pill">{activeTabLabel}</span>
          <button
            type="button"
            className="dashboard-mobile-tab-open"
            onClick={() => setMobileTabMenuOpen(true)}
            disabled={isBusy}
          >
            {changeButtonLabel}
          </button>
        </div>
      )}

      {isMobileView && mobileTabMenuOpen && (
        <div
          className="dashboard-mobile-tab-popup"
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          onClick={() => setMobileTabMenuOpen(false)}
        >
          <div
            className="dashboard-mobile-tab-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-mobile-tab-sheet-header">
              <h3>{sheetTitle}</h3>
              <button
                type="button"
                className="dashboard-mobile-tab-close"
                onClick={() => setMobileTabMenuOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="dashboard-mobile-tab-grid">
              {normalizedTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`dashboard-mobile-tab-option ${
                    activeTab === tab.key ? "active" : ""
                  }`}
                  onClick={() => handleTabSelection(tab)}
                  disabled={tab.disabled}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardTabSwitcher;
