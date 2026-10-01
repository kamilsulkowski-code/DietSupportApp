# Architektura

## Obecny układ

Forma jest statyczną aplikacją jednostronicową z zewnętrzną usługą danych Supabase.

```text
Przeglądarka
  └── dist/index.html
      ├── HTML: formularz i widoki wyników
      ├── CSS: responsywny interfejs
      └── JavaScript: kalkulacje, plan, zakupy i klient Supabase

Supabase
  ├── Auth: jednorazowe linki e-mail
  ├── profiles: ustawienia planu i stan zakupów
  ├── meal_plans: zapisane cykle jadłospisu AI
  ├── shopping_cycles: zakupy i snapshot promocji dla cyklu
  └── Edge Function generate-plan: bezpieczne wywołanie API OpenAI

GitHub Actions
  ├── kontrola jakości
  ├── wdrożenie GitHub Pages
  └── opcjonalny AI review PR-a
```

## Dane i prywatność

- Przed zalogowaniem dane pozostają lokalnie w przeglądarce.
- Po zalogowaniu ustawienia planu i stan listy zakupów są zapisywane w tabeli `profiles` w Supabase.
- Wygenerowane przez AI jadłospisy i odpowiadające im cykle zakupowe są zapisywane osobno, aby plan można było odtworzyć dla konkretnego dnia.
- RLS ogranicza odczyt i zapis rekordu do zalogowanego właściciela.
- Aplikacja nie zapisuje w bazie haseł ani kluczy API.

## Generator AI

- Kalkulator oblicza cel kalorii i białka na podstawie ustawień użytkownika.
- Funkcja `generate-plan` przekazuje te cele do API OpenAI, wymusza odpowiedź w schemacie JSON i zapisuje wynik po zweryfikowaniu sesji użytkownika.
- Generator sprawdza oficjalną stronę promocji Biedronki i zapisuje snapshot wyłącznie zweryfikowanych ofert wraz z cyklem zakupowym.
- Szczegóły wdrożenia są w `docs/ai-generator-setup.md`.

## Zależności

Brak zależności budowanych lokalnie. Strona korzysta z fontów Google Fonts w warstwie prezentacji.

## Sekrety

`OPENAI_API_KEY` istnieje wyłącznie jako zaszyfrowany sekret GitHub Actions. Służy tylko do ręcznie uruchamianego workflow AI review i nie może trafić do kodu ani do `dist/index.html`.

Supabase `publishable/anon` key jest używany przez klienta przeglądarkowego. Klucz `service_role` jest administracyjny i nie może trafić do repozytorium, GitHub Pages ani konfiguracji `dist/supabase-config.js`.
