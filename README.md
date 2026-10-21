# Forma — plan żywieniowy

Responsywna aplikacja do planowania jadłospisu AI, kalorii, białka i zakupów.
Frontend działa na GitHub Pages, a logowanie, dane i generator — w Supabase.

Logowanie w PWA: [e-mail i hasło, pierwsze ustawienie oraz odzyskiwanie](docs/password-login.md).
Samo logowanie hasłem nie wysyła e-maila; ustawienie/odzyskanie nadal podlega
ograniczeniom poczty Supabase. Nie wymaga migracji danych istniejącego konta.

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
[Konto i dyskretne statusy synchronizacji](docs/account-status-ux.md) opisują
zatwierdzony układ nagłówka, sekcję Konto pod założeniami oraz trwałe błędy
przy właściwej czynności, z macierzą wymagań ACCOUNT1–ACCOUNT4.
Weryfikacja przed wdrożeniem: 79/79 testów (23 UX i 56 regresji), kontrola
struktury strony oraz przegląd szerokości 320/390/768/1440 px zakończone
powodzeniem. [Raport i ograniczenia](docs/ux-improvements.md) oddzielają te
wyniki od potwierdzenia wdrożenia produkcyjnego zapisywanego w zadaniu #7.

## PWA — instalacja aplikacji

Forma ma manifest, ikony instalacyjne, obsługę ograniczonego otwierania offline
oraz świadome aktualizacje z ochroną niezapisanego formularza.
W **Ustawieniach → Forma jako aplikacja** są instrukcje dla Safari/iPhone/Maca
i instalacja przez zgodną przeglądarkę. Zapisane plany AI, logowanie i chmura
nadal wymagają internetu. Nie ma kolejki synchronizacji zakupów offline.
[Zakres, instalacja, prywatność i utrzymanie PWA](docs/pwa.md).

Przed publikacją po zmianie plików interfejsu uruchom
`node scripts/build_pwa.mjs`, potem `node --test scripts/*.test.mjs`.
CI i Pages odrzucą nieaktualny fingerprint cache.

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
