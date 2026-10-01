# Supabase — synchronizacja danych Forma

1. Utwórz projekt w Supabase.
2. W **SQL Editor** uruchom plik [supabase-schema.sql](./supabase-schema.sql).
3. W **Authentication → URL Configuration** dodaj:
   `https://kamilsulkowski-code.github.io/DietSupportApp/`
4. Skopiuj **Project URL** oraz publiczny **publishable/anon key** do `dist/supabase-config.js`.
5. Opublikuj zmieniony plik aplikacji.

## Logowanie i synchronizacja

Lokalnie przygotowano logowanie jednorazowym kodem z e-maila. Użytkownik wpisuje
adres, a następnie kod w tej samej karcie aplikacji. Klient wywołuje
`signInWithOtp`, a potem `verifyOtp` z `type: "email"`. Samo `signInWithOtp`
nie zmienia maila z linku na kod — wymaga to zmiany szablonu w Supabase.
Kod nie jest zapisywany w localStorage ani logach; po weryfikacji lub anulowaniu
jest usuwany z formularza. Ponowna wysyłka ma lokalną przerwę 60 sekund;
obowiązują też niezależne limity serwera.

Po zalogowaniu aplikacja synchronizuje między urządzeniami ustawienia planu
oraz stan listy zakupów. Adres e-mail jest normalizowany, a wylogowanie usuwa
wyłącznie sesję bieżącej przeglądarki. Nie zmieniamy istniejących kont ani RLS.

### Warunek publikacji logowania kodem

Stan na 1 października 2026: nowy formularz i testy przygotowano z bramką
wdrożeniową: kod jest aktywny wyłącznie po ustawieniu
`emailOtpEnabled: true` w obiekcie `window.FORMA_SUPABASE` w
`dist/supabase-config.js`. Bez flagi aplikacja zachowuje logowanie linkiem,
aby publikacja poprawek jadłospisu nie odcięła użytkowników od logowania.
Panel projektu DietApp blokuje edycję szablonów na obecnym
planie bez własnego SMTP: pokazuje `Set up custom SMTP to edit templates`.
Menu oferuje własne SMTP / Send Email hook albo przejście na Pro. Nie zmieniono
planu, dostawcy poczty ani szablonów; produkcja nadal używa linku.

1. Właściciel konfiguruje własne SMTP w **Authentication → Emails → SMTP Settings**
   albo sam wybiera plan umożliwiający edycję szablonów. Nie zapisuj hasła SMTP
   w repozytorium ani w rozmowie.
2. W **Emails → Magic link or OTP** ustaw temat `Kod logowania do Forma`,
   a treść na [email-otp-template.html](./email-otp-template.html).
3. Ten sam szablon kodu ustaw w **Confirm sign up**, aby nowe konta również
   otrzymywały kod. `shouldCreateUser: true` zachowuje dotychczasową rejestrację.
4. Zachowaj dotychczasowe limity i ważność kodu. Nie wyłączaj potwierdzania
   e-maila i nie obniżaj zabezpieczeń na potrzeby testu.
5. Dopiero po zapisaniu obu szablonów ustaw `emailOtpEnabled: true` i opublikuj
   konfigurację na GitHub Pages. W razie problemu usuń flagę albo ustaw `false`;
   powrót do linków wymaga również przywrócenia szablonów Supabase.
6. Na prośbę użytkownika rzeczywiste testy po zalogowaniu wykonamy przy
   następnym podejściu: wysyłka maila, poprawny/błędny kod, wylogowanie,
   ponowne logowanie oraz odtworzenie planu z bazy. Testy jednostkowe używają
   atrap Supabase i nie potwierdzają dostarczenia maila ani sesji produkcyjnej.

Dokumentacja dostawcy: [logowanie e-mail OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Klucz `service_role` nie może trafić do plików strony ani do GitHub Pages. Klucz `publishable/anon` jest kluczem publicznego klienta i jest chroniony przez reguły RLS zdefiniowane w schemacie.

## Limity e-maili

Wbudowana usługa e-mail Supabase służy wyłącznie do testów. Ma limit 2 wiadomości na godzinę dla całego projektu oraz domyślną przerwę 60 sekund między linkami dla tego samego użytkownika. Po przekroczeniu limitu Supabase zwraca błąd `over_email_send_rate_limit`; aplikacja pokazuje wtedy jasny komunikat, bez ponawiania żądania.

Przed udostępnieniem aplikacji użytkownikom skonfiguruj własne SMTP w **Authentication → Emails → SMTP Settings**. Dopiero własny dostawca, np. Resend, SendGrid lub AWS SES, pozwala kontrolować skalę i dostarczalność wiadomości.
