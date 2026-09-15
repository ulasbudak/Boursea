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
  };
  settings: {
    title: string;
    language: string;
    turkish: string;
    english: string;
    backToDashboard: string;
  };
}
