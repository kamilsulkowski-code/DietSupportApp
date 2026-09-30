# Supabase — synchronizacja danych Forma

1. Utwórz projekt w Supabase.
2. W **SQL Editor** uruchom plik [supabase-schema.sql](./supabase-schema.sql).
3. W **Authentication → URL Configuration** dodaj:
   `https://kamilsulkowski-code.github.io/DietSupportApp/`
4. Skopiuj **Project URL** oraz publiczny **publishable/anon key** do `dist/supabase-config.js`.
5. Opublikuj zmieniony plik aplikacji.

## Logowanie i synchronizacja

Aplikacja używa logowania e-mailem przez jednorazowy link. Po zalogowaniu synchronizuje między urządzeniami ustawienia planu oraz stan listy zakupów. Przed wysłaniem linku adres e-mail jest normalizowany, a po wylogowaniu usuwana jest wyłącznie lokalna sesja przeglądarki.

Klucz `service_role` nie może trafić do plików strony ani do GitHub Pages. Klucz `publishable/anon` jest kluczem publicznego klienta i jest chroniony przez reguły RLS zdefiniowane w schemacie.

## Limity e-maili

Wbudowana usługa e-mail Supabase służy wyłącznie do testów. Ma limit 2 wiadomości na godzinę dla całego projektu oraz domyślną przerwę 60 sekund między linkami dla tego samego użytkownika. Po przekroczeniu limitu Supabase zwraca błąd `over_email_send_rate_limit`; aplikacja pokazuje wtedy jasny komunikat, bez ponawiania żądania.

Przed udostępnieniem aplikacji użytkownikom skonfiguruj własne SMTP w **Authentication → Emails → SMTP Settings**. Dopiero własny dostawca, np. Resend, SendGrid lub AWS SES, pozwala kontrolować skalę i dostarczalność wiadomości.
