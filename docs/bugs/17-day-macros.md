# Diagnostyka makroskładników po zmianie dnia — #17

Zgłoszenie: [#17](https://github.com/kamilsulkowski-code/DietSupportApp/issues/17).
Stan na 2026-10-29: **nie odtworzono jeszcze zgłoszonego błędu na aktualnym kodzie**.
Ten dokument i testy nie są deklaracją naprawy ani wdrożenia.

## Potwierdzone fakty

- Sprawdzona baza: commit `b7b906633d54277777097928fb9f3a8dc568089f`.
- `currentPlan()` i `localPlanFromRemote()` wybierają posiłki wskazanego dnia.
  `renderDay()` sumuje wartości tych posiłków, bez korzystania z `target_*`
  planu ani przechowywanych `day.total_*`.
- Selektor, Poprzedni/Następny, Dzisiaj oraz trasa z datą uruchamiają ponowne
  renderowanie. Dla różnych makroskładników dni wartości zmieniają się poprawnie.
- Starsza próba akceptacyjna miała identyczne wartości we wszystkich dniach.
  Nie mogła wykryć pozostawienia sum z poprzedniego dnia. Test zastąpiono
  scenariuszem trzech dni z różnymi kaloriami, białkiem, tłuszczami i węglowodanami.
- Równe sumy różnych dni mogą pochodzić z równych wartości w zapisanym planie.
  Wspólny cel kalorii/białka nie wymaga sztucznie różnych sum. Nie zmieniamy
  prawidłowych liczb wyłącznie po to, aby po przełączeniu wyglądały inaczej.

## Rozszerzona regresja

Testy używają dni o sumach:

| Dzień testowy | kcal | Białko g | Tłuszcze g | Węglowodany g |
| --- | ---: | ---: | ---: | ---: |
| Pierwszy | 900 | 60 | 29.3 | 85.7 |
| Drugi | 1060 | 75 | 33.7 | 105.7 |
| Trzeci | 890 | 63 | 28.7 | 94.7 |

To fikcyjne dane testowe, nie zalecenia żywieniowe ani dane konta użytkownika.
Cel i zapisane agregaty mają celowo inne wartości, aby wykryć błędne źródło.

`scripts/ux.test.mjs` wykonuje pełny skrypt aplikacji i sprawdza:

- selektor oraz makro przy posiłkach i sumy wybranego dnia;
- Poprzedni/Następny i Dzisiaj;
- datę w adresie, Wstecz/hasz i ponowne załadowanie;
- przejście między dniem pełnym i niepełnym, bez pozostawienia starych sum;
- przejście z planu AI do demonstracji, bez ujawniania poprzedniego makro.

`scripts/task3_acceptance.test.mjs` zawiera zmieniony test wyboru dnia oraz
dodatkowy przypadek brakujących wartości i poprawnych wartości zerowych.

Wynik lokalny: **153/153 testów**, walidator struktury i kontrola fingerprintu
PWA poprawne. Sześć nowych testów przechodzi również na **niezmienionym** kodzie
aplikacji. Nie ma zatem testu czerwonego potwierdzającego zgłoszony defekt.
Brak produkcyjnych zmian HTML, PWA, backendu lub danych.

## Potrzebne do dalszej naprawy

Potwierdzić, czy problem dotyczy sumy u góry, makro przy posiłkach, czy obu.
Następnie odczytać dwa wskazane dni z dotkniętego planu i porównać widoczne
wartości z posiłkami zapisanymi w planie. Można wykorzystać zrzuty dwóch dni
bez danych konta lub sesję użytkownika po jego samodzielnym zalogowaniu.
Nie należy przesyłać haseł, kodów, tokenów ani linków logowania.

Dopiero odtworzony przypadek pozwoli rozstrzygnąć, czy przyczyną jest stan
interfejsu, starsza wersja aplikacji, czy wartości zapisane w konkretnym planie.
Nie zamykać #17 ani nie opisywać tego PR jako naprawy produkcji przed tą kontrolą.
