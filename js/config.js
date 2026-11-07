/*
 * App settings. Change DASHBOARD_URL after you publish the Before vs After dashboard.
 * If both repos live on the same GitHub account and are named
 * "ghost-kitchen-app" and "ghost-kitchen-dashboard", the default relative link already works.
 */
window.GK_CONFIG = {
  DASHBOARD_URL: '../ghost-kitchen-dashboard/',
  STAFFING_ALERT_THRESHOLD: 2,   // orders waiting per staff member
  KPI_TARGETS: {
    accuracy: 90,                // % of orders correct (industry benchmark 85 to 98%)
    profit_after_refunds: 8.5,   // $ per order
    peak_staffing_ratio: 2,      // orders waiting per staff member at peak
    prep_variance: 5,            // minutes past quoted prep time
    rating: 4.2,                 // out of 5
    refund_rate: 4               // % of orders refunded
  }
};
