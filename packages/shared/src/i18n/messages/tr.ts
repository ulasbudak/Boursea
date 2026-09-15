import type { Messages } from "../types";

export const tr: Messages = {
  common: {
    appName: "Trendus",
    disclaimer: "Bu sayfadaki bilgiler yatırım tavsiyesi değildir.",
    dataUnavailable: "Veri şu an güncellenemiyor.",
    noData: "Veri yok",
    loading: "Yükleniyor...",
  },
  home: {
    goToDashboard: "Panele git",
    loginOrSignup: "Giriş Yap / Kayıt Ol",
  },
  auth: {
    title: "Giriş Yap / Kayıt Ol",
    email: "E-posta",
    password: "Şifre",
    login: "Giriş Yap",
    loggingIn: "Giriş yapılıyor...",
    signup: "Kayıt Ol",
    signingUp: "Kayıt olunuyor...",
    continueWithGoogle: "Google ile devam et",
    continueWithApple: "Apple ile devam et",
    redirecting: "Yönlendiriliyor...",
  },
  error: {
    title: "Bir şeyler yanlış gitti",
    message: "Giriş/kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin.",
    backToLogin: "Giriş sayfasına dön",
  },
  dashboard: {
    title: "Panel",
    loggedInAs: "Giriş yapıldı",
    signOut: "Çıkış Yap",
    settingsLink: "Ayarlar",
  },
  search: {
    label: "Hisse ara",
    placeholder: "Sembol veya şirket adı ara (örn. GARAN, Apple)",
    searching: "Aranıyor...",
    searchError: "Arama sırasında bir hata oluştu.",
    noResults: "Sonuç bulunamadı.",
  },
  stock: {
    backToDashboard: "← Panele dön",
    backToSearch: "← Aramaya dön",
    price: "Güncel Fiyat",
    change: "Günlük Değişim",
    marketCap: "Piyasa Değeri",
    sector: "Sektör",
    industry: "Endüstri",
  },
  settings: {
    title: "Ayarlar",
    language: "Dil",
    turkish: "Türkçe",
    english: "English",
    backToDashboard: "← Panele dön",
  },
};
