# Forma — plan żywieniowy

Responsywna aplikacja do planowania jadłospisu AI, kalorii, białka i zakupów.
Frontend działa na GitHub Pages, a logowanie, dane i generator — w Supabase.

## Wersja 1.0.1

- [Wydanie v1.0.1](https://github.com/kamilsulkowski-code/DietSupportApp/releases/tag/v1.0.1)
  rozszerza MVP v1.0.0 o średnią liczbę treningów tygodniowo.
- Wymagania: [zadanie #5](https://github.com/kamilsulkowski-code/DietSupportApp/issues/5).
  Implementacja i przegląd: [PR #6](https://github.com/kamilsulkowski-code/DietSupportApp/pull/6).
- [Mapowanie kryteriów na kod i testy](docs/releases/v1.0.1.md),
  [wzór i ograniczenia kalkulatora](docs/training-settings.md),
  [wdrożenie i cofnięcie wersji](docs/operations.md).
- Informacja o wersji frontendu: `dist/version.json`, publikowana pod
  `/DietSupportApp/version.json`. Tag wydania wskazuje dokładny commit;
  backend wymaga oddzielnego wdrożenia źródła z tego samego tagu.

Ręcznie podane kalorie mają pierwszeństwo przed oszacowaniem z treningów.
Plany i wartości odżywcze są orientacyjne. Zmiana założeń nie przepisuje
historycznych jadłospisów — trzeba wygenerować nowy plan.

## Aktualizacja UX — zadanie #7

[Wymagania i macierz śledzenia](docs/ux-improvements.md) opisują usprawnienia
stanu jadłospisu i błędów, podsumowania kalorii, nawigacji responsywnej,
obsługi gościa, formularza ustawień, zakupów oraz dostępności.
Źródło: [zadanie #7](https://github.com/kamilsulkowski-code/DietSupportApp/issues/7).
Zmiany są rozwinięciem 1.0.1, nie nowym opublikowanym tagiem wydania.
Manifest `dist/version.json` rozróżnia aktualizację przez
`frontendUpdate.id: "ux-7"` i bazę `releaseBaseline: "v1.0.1"`.
Nie wymagają migracji SQL ani zmiany funkcji Edge. Testy izolowane nie
zastępują testu z rzeczywistym logowaniem i płatnym AI ani badania użyteczności.
Weryfikacja przed wdrożeniem: 77/77 testów (21 UX i 56 regresji), kontrola
struktury strony oraz przegląd szerokości 320/390/768/1440 px zakończone
powodzeniem. [Raport i ograniczenia](docs/ux-improvements.md) oddzielają te
wyniki od oczekującego potwierdzenia wdrożenia produkcyjnego.

## CI/CD

- Każdy pull request i push do `main` uruchamia kontrolę jakości.
- Push do `main` publikuje stronę na GitHub Pages.
- Workflow **AI review pull requestu** można uruchomić ręcznie z numerem PR-a. Wymaga sekretu repozytorium `OPENAI_API_KEY`.

### Jednorazowe ustawienie w GitHubie

1. Utwórz repozytorium i wypchnij ten projekt na gałąź `main`.
2. W **Settings → Pages** ustaw źródło na **GitHub Actions**.
3. W **Settings → Secrets and variables → Actions** dodaj sekret `OPENAI_API_KEY`.
4. Po utworzeniu PR-a uruchom workflow **AI review pull requestu** z zakładki **Actions**.

AI review przesyła do API OpenAI maksymalnie 50 KB diffu danego PR-a. Nie uruchamia się automatycznie, dzięki czemu kod nie jest wysyłany na zewnątrz bez świadomego działania osoby z dostępem do repozytorium.
