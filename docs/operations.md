# Utrzymanie aplikacji

## Publikacja

1. Zmiana trafia do Pull Requesta.
2. Workflow „Kontrola jakości” uruchamia `python3 scripts/validate_site.py`.
3. Po scaleniu do `main` workflow „Publikacja na GitHub Pages” publikuje katalog `dist`.
4. Adres produkcyjny: `https://kamilsulkowski-code.github.io/DietSupportApp/`.

## Wycofanie zmiany

1. Znajdź ostatni prawidłowy commit na `main`.
2. Utwórz Pull Request odwracający nieprawidłową zmianę.
3. Po jego scaleniu automatyczne wdrożenie opublikuje poprzednią wersję.

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
