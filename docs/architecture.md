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
  └── profiles: ustawienia planu i stan zakupów

GitHub Actions
  ├── kontrola jakości
  ├── wdrożenie GitHub Pages
  └── opcjonalny AI review PR-a
```

## Dane i prywatność

- Przed zalogowaniem dane pozostają lokalnie w przeglądarce.
- Po zalogowaniu ustawienia planu i stan listy zakupów są zapisywane w tabeli `profiles` w Supabase.
- RLS ogranicza odczyt i zapis rekordu do zalogowanego właściciela.
- Aplikacja nie zapisuje w bazie haseł ani kluczy API.

## Algorytm

- Kalorie wynikają z masy ciała, liczby treningów oraz korekty celu.
- Białko jest wyliczane jako 1,8 g/kg dla redukcji i utrzymania oraz 2 g/kg dla budowy mięśni.
- Plan posiłków jest przykładowy i wybierany według celu.

## Zależności

Brak zależności budowanych lokalnie. Strona korzysta z fontów Google Fonts w warstwie prezentacji.

## Sekrety

`OPENAI_API_KEY` istnieje wyłącznie jako zaszyfrowany sekret GitHub Actions. Służy tylko do ręcznie uruchamianego workflow AI review i nie może trafić do kodu ani do `dist/index.html`.

Supabase `publishable/anon` key jest używany przez klienta przeglądarkowego. Klucz `service_role` jest administracyjny i nie może trafić do repozytorium, GitHub Pages ani konfiguracji `dist/supabase-config.js`.
