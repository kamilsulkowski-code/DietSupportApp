# Wymagania produktu — 1.0.1

## Źródło wymagań

Źródłem są [zadania GitHub](https://github.com/kamilsulkowski-code/DietSupportApp/issues).
MVP `v1.0.0` obejmuje zaakceptowane #1–#4; wydanie `v1.0.1` dodaje #5.
Historia: [CHANGELOG](../CHANGELOG.md).

## Zakres

- #1: lista produktów i ilości na cykl zakupowy, pozycje w koszyku,
  oznaczanie zakupów jako zrealizowanych i daty cyklu.
- #2: cel diety, waga, wzrost, opcjonalne kalorie, białko w g/kg, liczba
  posiłków i częstotliwość zakupów.
- #3: jadłospis wybranego dnia, makro, ilustracje kategorii, mierzalne
  składniki i krótkie instrukcje przygotowania.
- #4: wielodniowy generator AI, zakupy wyliczone ze składników, filtrowane
  promocje Biedronki powiązane z posiłkami i zapis wyników w Supabase.
- #5: wybór, zapis i wpływ średniej liczby treningów tygodniowo na kalorie.
- Responsywny interfejs; lokalne dane bez logowania i synchronizacja własnych
  ustawień i zakupów po zalogowaniu. Generowanie AI wymaga zalogowania.

## Kryteria akceptacji zadania #5

1. **#5.1** — użytkownik wybiera średnią liczbę treningów w ustawieniach.
2. **#5.2** — aplikacja zapisuje wybraną liczbę.
3. **#5.3** — liczba treningów wpływa na automatyczną kalkulację kalorii.

Interpretacja: 0–14 co 0,5; starszy profil = 0; ręczne kalorie mają pierwszeństwo.
Jest to rozszerzenie heurystyki MVP, nie indywidualny pomiar TDEE.
Białko nie zmienia się od samej liczby treningów.
[Wzór i ograniczenia](training-settings.md).
[Mapowanie kryteriów na kod i nazwane testy](releases/v1.0.1.md).

## Ograniczenia i poza zakresem

- Brak diagnozowania i zaleceń medycznych; plan i makro są orientacyjne.
- Wiek, płeć, aktywność pozatreningowa i rzeczywisty czas/intensywność sesji
  nie uczestniczą w obliczeniu kalorii. Wzrost jest zapisywany, ale nie używany.
- Nie ma obecnie formularza alergii, preferencji ani wykluczeń; nie deklarujemy
  automatycznego dopasowania do alergii lub nietolerancji.
- Brak kontroli dopuszczalnego odchylenia wyniku AI od celu kalorii i białka.
- Produkcyjne logowanie używa linków e-mail. Przygotowany wariant kodu OTP
  wymaga osobnej konfiguracji; testy nie oznaczają jego aktywacji.
- Zmiana założeń nie przepisuje istniejących jadłospisów; trzeba wygenerować nowe.
- Brak płatności, integracji z urządzeniami treningowymi i edycji receptur.
- Pełny test po rzeczywistym zalogowaniu i płatnym generowaniu jest odłożony
  na osobną sesję zgodnie z decyzją użytkownika, a nie zaliczony.
