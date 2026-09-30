# Forma — plan żywieniowy

Aplikacja do ułożenia przykładowego jadłospisu z obliczeniem kalorii, białka i listą zakupów.

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
