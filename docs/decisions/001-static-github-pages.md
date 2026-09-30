# ADR 001: statyczna aplikacja na GitHub Pages

## Decyzja

Aplikację publikujemy jako statyczną stronę przez GitHub Pages i GitHub Actions.

## Powód

Obecna wersja nie wymaga serwera, bazy danych ani logowania. Statyczny hosting ogranicza koszt i złożoność utrzymania.

## Konsekwencje

- wdrożenie następuje po pushu do `main`;
- dane użytkownika nie są zapisywane;
- funkcje wymagające kont, płatności lub trwałych danych będą wymagały backendu w przyszłości.
