# Historia zmian

## 1.0.1 — 2026-10-17

Wymaganie: [#5](https://github.com/kamilsulkowski-code/DietSupportApp/issues/5).
Implementacja: [PR #6](https://github.com/kamilsulkowski-code/DietSupportApp/pull/6).

- Średnia liczba treningów tygodniowo: 0–14 co 0,5, podgląd kalorii i zapis
  lokalny oraz w `profiles.settings` w Supabase.
- Spójne obliczenia kalorii na stronie i w generatorze, z pierwszeństwem
  ręcznie podanego celu. Starsze profile bez nowego pola oznaczają 0 treningów.
- Jawne założenie orientacyjne: sesja 60 minut, 3,5 MET; dodatkowy wydatek
  ponad spoczynek rozłożony na 7 dni. Nie jest to indywidualny pomiar.
- Ujednolicony dolny próg automatycznego celu: 1500 kcal w UI i Edge
  (wcześniej Edge miał 1200). Ręczny cel nadal omija ten próg.
- Nieudana synchronizacja jest widoczna i blokuje generowanie ze starymi
  ustawieniami. Istniejące plany nie są automatycznie zmieniane.
- 13 nowych testów, łącznie 56; kontrola zgodności UI/Edge w 1305 kombinacjach.
- Brak migracji SQL. Wdrożenie wymaga aktualizacji Edge Function i GitHub Pages.

Szczegóły, ograniczenia i mapowanie na kryteria: [opis wydania](docs/releases/v1.0.1.md).

## 1.0.0 — 2026-10-01

Pierwsze zaakceptowane MVP: ustawienia diety, jadłospis dnia, generator AI,
lista zakupów i zapis w Supabase. Zakres: zadania #1–#4.
[Release v1.0.0](https://github.com/kamilsulkowski-code/DietSupportApp/releases/tag/v1.0.0).
