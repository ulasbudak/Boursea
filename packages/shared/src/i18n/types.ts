export interface Messages {
  common: {
    appName: string;
    disclaimer: string;
    dataUnavailable: string;
    noData: string;
    loading: string;
  };
  home: {
    goToDashboard: string;
    loginOrSignup: string;
  };
  auth: {
    title: string;
    email: string;
    password: string;
    login: string;
    loggingIn: string;
    signup: string;
    signingUp: string;
    continueWithGoogle: string;
    continueWithApple: string;
    redirecting: string;
  };
  error: {
    title: string;
    message: string;
    backToLogin: string;
  };
  dashboard: {
    title: string;
    loggedInAs: string;
    signOut: string;
    settingsLink: string;
  };
  search: {
    label: string;
    placeholder: string;
    searching: string;
    searchError: string;
    noResults: string;
  };
  stock: {
    backToDashboard: string;
    backToSearch: string;
    price: string;
    change: string;
    marketCap: string;
    sector: string;
    industry: string;
    tabsLabel: string;
    overviewTab: string;
    fundamentalsTab: string;
    technicalTab: string;
  };
  chart: {
    candlestick: string;
    line: string;
    bar: string;
    intraday: string;
    daily: string;
    weekly: string;
    monthly: string;
    chartTypeLabel: string;
    timeframeLabel: string;
  };
  fundamentals: {
    peRatio: string;
    pbRatio: string;
    roe: string;
    roa: string;
    eps: string;
    epsGrowth: string;
    dividendYield: string;
    debtToEquity: string;
    grossMargin: string;
    netMargin: string;
    ebitdaMargin: string;
    freeCashFlow: string;
    marketCap: string;
    sectorAverage: string;
    noSectorData: string;
  };
  history: {
    title: string;
    annual: string;
    quarterly: string;
    revenuePerShare: string;
    netIncomePerShare: string;
    eps: string;
  };
  settings: {
    title: string;
    language: string;
    turkish: string;
    english: string;
    backToDashboard: string;
  };
}
