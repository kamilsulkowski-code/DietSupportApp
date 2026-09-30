# Supabase — synchronizacja danych Forma

1. Utwórz projekt w Supabase.
2. W **SQL Editor** uruchom plik [supabase-schema.sql](./supabase-schema.sql).
3. W **Authentication → URL Configuration** dodaj:
   `https://kamilsulkowski-code.github.io/DietSupportApp/`
4. Skopiuj **Project URL** oraz publiczny **publishable/anon key** do `dist/supabase-config.js`.
5. Opublikuj zmieniony plik aplikacji.

Aplikacja używa logowania e-mailem przez jednorazowy link. Klucz `service_role` nie może trafić do plików strony ani do GitHub Pages.

