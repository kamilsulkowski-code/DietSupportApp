# Architektura

## Obecny układ

Forma jest statyczną aplikacją jednostronicową.

```text
Przeglądarka
  └── dist/index.html
      ├── HTML: formularz i widoki wyników
      ├── CSS: responsywny interfejs
      └── JavaScript: kalkulacje, plan i lista zakupów

GitHub Actions
  ├── kontrola jakości
  ├── wdrożenie GitHub Pages
  └── opcjonalny AI review PR-a
```

## Dane i prywatność

- Dane wpisane w formularzu są przetwarzane wyłącznie w przeglądarce.
- Aplikacja nie ma bazy danych ani backendu.
- Nie przechowujemy danych zdrowotnych ani danych osobowych użytkowników.

## Algorytm

- Kalorie wynikają z masy ciała, liczby treningów oraz korekty celu.
- Białko jest wyliczane jako 1,8 g/kg dla redukcji i utrzymania oraz 2 g/kg dla budowy mięśni.
- Plan posiłków jest przykładowy i wybierany według celu.

## Zależności

Brak zależności budowanych lokalnie. Strona korzysta z fontów Google Fonts w warstwie prezentacji.

## Sekrety

`OPENAI_API_KEY` istnieje wyłącznie jako zaszyfrowany sekret GitHub Actions. Służy tylko do ręcznie uruchamianego workflow AI review i nie może trafić do kodu ani do `dist/index.html`.
