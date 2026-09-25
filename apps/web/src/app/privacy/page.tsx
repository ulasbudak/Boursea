import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Gizlilik Politikası — Boursea",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        backHref="/"
        backLabel="Ana sayfaya dön"
        title="Gizlilik Politikası"
        meta={
          <p className="mt-1 text-xs text-text-tertiary">
            Son güncelleme: 21 Eylül 2026
          </p>
        }
      />
      <Card>
        <div className="prose prose-sm max-w-none">
          <p>
            Boursea (&quot;biz&quot;), hisse senedi ve portföy analiz hizmeti
            sunan bir web ve mobil uygulamasıdır. Bu sayfa, hizmeti kullanırken
            hangi verileri topladığımızı, neden topladığımızı ve nasıl
            kullandığımızı açıklar.
          </p>

          <h2>Topladığımız veriler</h2>
          <ul>
            <li>
              Hesap bilgileri: e-posta adresi ve şifre (Supabase Auth üzerinden
              güvenli şekilde saklanır, biz düz metin şifreyi hiçbir zaman
              görmeyiz)
            </li>
            <li>
              Google veya Apple ile giriş yapıldığında: bu sağlayıcıların
              paylaştığı ad ve e-posta bilgisi
            </li>
            <li>
              Uygulama içi tercihler: takip listeleri (watchlist), portföy
              pozisyonları, fiyat/sinyal alert ayarları, kayıtlı ekranlar, dil
              ve ilgi sektörü tercihleri
            </li>
            <li>
              Kullanım verileri: oturum yönetimi için gerekli teknik
              çerezler/local storage kayıtları (örn. tema tercihi)
            </li>
          </ul>

          <h2>Verileri nasıl kullanıyoruz</h2>
          <p>
            Topladığımız veriler yalnızca Boursea hizmetini sağlamak için
            kullanılır: hesabınıza giriş yapmanızı sağlamak, takip listelerinizi
            ve portföyünüzü göstermek, fiyat/sinyal uyarıları göndermek ve talep
            ettiğiniz AI destekli analiz raporlarını oluşturmak. Verileriniz
            reklam amacıyla satılmaz veya üçüncü taraflarla paylaşılmaz.
          </p>

          <h2>Kullandığımız üçüncü taraf servisler</h2>
          <ul>
            <li>
              <strong>Supabase</strong> — kimlik doğrulama ve veritabanı
              altyapısı
            </li>
            <li>
              <strong>Google Gemini</strong> — talep edilen hisse senedi için AI
              destekli temel/teknik analiz raporu oluşturma (kişisel verileriniz
              değil, halka açık piyasa verisi kullanılır)
            </li>
            <li>
              <strong>Finnhub, TwelveData</strong> — piyasa/fiyat verisi
              sağlayıcıları
            </li>
            <li>
              <strong>Resend</strong> — e-posta bildirimleri (fiyat/sinyal
              alert&apos;leri) gönderimi
            </li>
            <li>
              <strong>Google, Apple</strong> — sosyal medya hesabıyla giriş
              (OAuth) seçeneği
            </li>
          </ul>

          <h2>Veri saklama ve silme</h2>
          <p>
            Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızın ve
            ilişkili tüm verilerinizin silinmesini talep etmek için aşağıdaki
            e-posta adresinden bize ulaşabilirsiniz.
          </p>

          <h2>İletişim</h2>
          <p>
            Gizlilikle ilgili sorularınız için:{" "}
            <a href="mailto:serdarulasbudak@gmail.com">
              serdarulasbudak@gmail.com
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
