# Utrzymanie aplikacji

## Publikacja

1. Zmiana trafia do Pull Requesta.
2. Workflow „Kontrola jakości” uruchamia walidację strony oraz testy generatora,
   formularza logowania, jadłospisu dnia i ustawień treningów (Node.js 24).
3. Po scaleniu do `main` workflow „Publikacja na GitHub Pages” publikuje katalog `dist`.
4. Adres produkcyjny: `https://kamilsulkowski-code.github.io/DietSupportApp/`.

### PWA i aktualność cache

- Po zmianie HTML, JS/CSS PWA, manifestu lub ikon: `node scripts/build_pwa.mjs`.
- CI/Pages sprawdzają `node scripts/build_pwa.mjs --check`; workflow Pages
  uruchamia całą regresję przed publikacją. Zapisz wygenerowany `dist/sw.js`
  razem ze zmianami, nie zmieniaj jego nazwy przy wydaniu.
- Worker ma scope tylko aplikacji, network-first i allowlistę publicznych
  plików; nie buforuje API, tokenów ani linków logowania. Aktualizację
  aktywuje użytkownik, bez automatycznego tracenia szkicu formularza.
- **Wycofanie PWA wymaga osobnego workera wyrejestrowującego się.** Samo
  cofnięcie HTML/usunięcie pliku nie usuwa istniejących rejestracji z urządzeń.
- [Pełny zakres offline, instalacja i procedury PWA](pwa.md).

## Wydanie 1.0.1 i śledzenie wymagań

- Wymaganie #5 → PR #6 → finalny commit/tag `v1.0.1` → Release i milestone `1.0.1`.
- Mapowanie każdego kryterium na kod i testy: [opis wydania](releases/v1.0.1.md).
- `VERSION` jest wersją repozytorium; frontend publikuje `dist/version.json`.
  Sprawdzaj na produkcji `/DietSupportApp/version.json`, nie tylko etykietę Release.
- Edge nie wdraża się przez workflow Pages. Najpierw wdrażamy `generate-plan`
  z zatwierdzonego PR do projektu DietApp i po przeładowaniu porównujemy kod.
  Następnie scalamy PR i sprawdzamy osobno CI oraz zakończenie publikacji Pages.
- Brak migracji SQL w 1.0.1. Nie zmieniamy danych użytkowników ani sekretów.
- Tag obejmuje pliki, nie konfigurację Auth, sekretów i danych Supabase.
  Potwierdzenia wdrożenia oraz odnośniki do przebiegów są zapisywane w Release
  i komentarzu zadania #5. Pełny test zalogowanej sesji nie jest tym samym,
  co sprawdzenie wdrożonego kodu; odłożonego testu nie oznaczamy jako zaliczony.

## Wycofanie zmiany

1. Znajdź ostatni prawidłowy commit na `main`.
2. Utwórz Pull Request odwracający nieprawidłową zmianę.
3. Po jego scaleniu automatyczne wdrożenie opublikuje poprzednią wersję.
4. Przy cofnięciu całej wersji wdróż również
   `supabase/functions/generate-plan/index.ts` z docelowego tagu do Supabase.
   Cofnięcie samego frontendu nie cofa Edge, schematu ani danych.
5. Zweryfikuj CI/Pages, zgodność kodu Edge i działanie interfejsu. Zachowaj
   historię przez nowy commit/PR; nie używaj force-push ani nie przesuwaj tagów.

## Reakcja na błąd CI

- Otwórz zakładkę Actions i odczytaj nieudany krok.
- Dla błędu walidacji uruchom lokalnie `python3 scripts/validate_site.py`.
- Popraw zmianę w osobnym PR i zaczekaj na zielony wynik kontroli jakości.

## AI review

- Workflow uruchamia się ręcznie dla wskazanego Pull Requesta.
- Wysyła do API OpenAI maksymalnie 50 KB diffu PR-a.
- Nie uruchamiaj go dla zmian zawierających tajne dane.
- Klucz API przechowuj tylko w sekretach repozytorium; w razie podejrzenia ujawnienia odwołaj go i podmień sekret.

## Kontrola okresowa

Raz w miesiącu sprawdź:

- czy workflowy GitHub Actions kończą się sukcesem;
- czy link produkcyjny jest dostępny;
- czy klucz API i użycie API są zgodne z oczekiwaniami;
- czy zgłoszenia `bug` i `maintenance` mają właściciela oraz priorytet.

## Utrzymanie Supabase

Raz w miesiącu sprawdź:

- czy tabela `profiles` ma włączone RLS i trzy polityki ograniczające dostęp do właściciela rekordu;
- czy adres produkcyjny jest nadal na liście **Authentication → URL Configuration → Redirect URLs**;
- liczbę błędów `over_email_send_rate_limit` w logach Auth;
- konfigurację SMTP i reputację domeny nadawczej, gdy logowanie jest dostępne dla użytkowników.

Wbudowany dostawca e-mail Supabase ma limit 2 wiadomości na godzinę dla całego projektu. To limit dostawcy, a nie błąd aplikacji. W środowisku produkcyjnym należy użyć własnego SMTP.
