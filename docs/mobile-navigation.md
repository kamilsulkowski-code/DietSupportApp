# Ikony w menu mobilnym — zadanie #15

Wymaganie: [zadanie #15](https://github.com/kamilsulkowski-code/DietSupportApp/issues/15).
Użytkownik obejrzał dwa interaktywne warianty i zatwierdził wdrożenie
rekomendowanego wariantu **Pełne wyróżnienie**. Zmiana rozwija frontend oparty
na 1.0.1; nie tworzy nowego tagu ani nie przesuwa istniejącego wydania.

## Zachowanie interfejsu

Dolne menu na telefonie zachowuje dotychczasowe cztery pozycje. Nad każdym
podpisem jest ikona o rozmiarze 22 px:

| Widok | Ikona | Działanie |
| --- | --- | --- |
| Dzisiaj | Pulpit / dashboard | Podsumowanie bieżącego dnia |
| Jadłospis | Sztućce | Jadłospis wybranego dnia |
| Zakupy | Koszyk | Lista zakupów |
| Ustawienia | Koło zębate | Założenia, konto i ustawienia aplikacji |

Aktywna pozycja ma pełne ciemnozielone, zaokrąglone tło, jasny podpis i ikonę
o mocniejszym konturze. Podpisy są stale widoczne, również dla nieaktywnych
pozycji; znaczenia nie trzeba odgadywać z samego symbolu. Widoczny fokus
klawiatury jest osobnym stanem, a nie zamiennikiem oznaczenia aktywnego widoku.

Każdy przycisk ma co najmniej 44 × 44 px obszaru dotykowego; projektowane
minimum wysokości to 68 px. Ikony są lokalnym inline SVG bez nowej biblioteki
i zewnętrznego CDN. Mają `aria-hidden="true"` oraz `focusable="false"`, aby
czytnik ekranu odczytywał podpis przycisku, nie powtarzał nazwy symbolu.
Wybrany widok jest nadal oznaczany programowo przez `aria-current`.

W układzie komputerowym nawigacja pozostaje bez zmian. Na telefonie tylko
jedna nawigacja jest widoczna i dostępna dla klawiatury. Menu nie zmienia
adresów widoków, zaznaczonego dnia ani zachowania Wstecz/Dalej i odświeżenia.

## Dolna krawędź i PWA

Strona używa `viewport-fit=cover`, a dolny pasek uwzględnia
`env(safe-area-inset-bottom)` urządzenia. Rezerwa pod treścią wynika
z mierzonej rzeczywistej wysokości menu, zamiast stałej wartości zakładającej
jeden rozmiar tekstu. Zmiana szerokości, powiększenie tekstu i ponowne
pokazanie menu aktualizują tę rezerwę.

Ostatni element strony da się przewinąć ponad menu. Komunikat chwilowy
(toast) jest umieszczany nad zmierzoną wysokością paska. Istniejące komunikaty
aktualizacji/offline PWA pozostają w normalnym układzie strony, nad treścią;
nie wymagają zmian `pwa.css` ani `pwa.js`. Zwiększenie odstępu nie powinno
przebudowywać przycisków ani zabierać fokusu.

## Śledzenie wymagań

Kod interfejsu: [`dist/index.html`](../dist/index.html). Testy:
[`scripts/ux.test.mjs`](../scripts/ux.test.mjs). Cache powłoki przebudowuje
[`scripts/build_pwa.mjs`](../scripts/build_pwa.mjs). Manifest
[`dist/version.json`](../dist/version.json) identyfikuje tę zmianę przez
`mobileNavigationUpdate.id: "mobile-menu-icons"`, wskazuje #15, ten dokument
i historyczną bazę `releaseBaseline: "v1.0.1"`.

| ID | Kryterium | Dowód w kodzie i weryfikacji |
| --- | --- | --- |
| NAV1 | Makieta i akceptacja przed zmianą kodu | Dwa pokazane warianty oraz zgoda użytkownika na wdrożenie rekomendowanego „Pełne wyróżnienie”; zapis w #15 i PR |
| NAV2 | Cztery ikony nad stale widocznymi podpisami | Lokalne SVG i podpisy mobilnego menu; testy MOBILE15 dotyczące czterech pozycji i dekoracyjnych SVG |
| NAV3 | Aktywna pozycja rozpoznawalna nie tylko po kolorze | Pełne tło, mocniejszy kontur ikony i `aria-current`; testy MOBILE15 kliknięć oraz odtwarzania aktywnej pozycji |
| NAV4 | Dostępność: 44 px, fokus, kontrast i dekoracyjne ikony | Przyciski min. 68 px wysokości, widoczna obwódka, jasny tekst na ciemnym tle, `aria-hidden`/`focusable`; testy MOBILE15 SVG i CSS |
| NAV5 | Szerokości 320/390/430 px, safe-area i brak zasłaniania treści | Pomiar wysokości menu, rezerwa pod treścią i nad toastem; trzy testy MOBILE15 odstępów/fontów/CSS oraz ręczna lista regresji |
| NAV6 | Zachowane trasy, historia, odświeżenie i desktop | Testy MOBILE15 kliknięć i Wstecz/hasza, UX4 odtwarzania daty oraz lista regresji desktopu; fizyczny Safari/PWA nadal do potwierdzenia |
| NAV7 | Aktualizacja jest odtwarzalna i sprawdzalna | Dokumentacja, testy, manifest frontendu, przebudowany cache, PR powiązany z #15 i osobne potwierdzenie CI/Pages |

## Automatyczna weryfikacja

Pełna regresja `node --test scripts/*.test.mjs` przed publikacją: **147/147**
testów zaliczonych. Siedem nowych testów w `scripts/ux.test.mjs`:

- `MOBILE15: cztery pozycje menu zachowują stałe widoczne podpisy i istniejące trasy`
- `MOBILE15: ikony są dekoracyjnymi lokalnymi SVG bez dodatkowych punktów fokusu ani zależności sieciowych`
- `MOBILE15: kliknięcie ikony, podpisu i przycisku wybiera jeden ekran bez podwójnego wpisu historii`
- `MOBILE15: Wstecz i zmiana hasha odtwarzają aktywną ikonę oraz wybrany dzień zalogowanego użytkownika`
- `MOBILE15: odstęp od menu reaguje na rzeczywistą wysokość, powiększenie tekstu i powrót na desktop`
- `MOBILE15: załadowanie fontów aktualizuje odstęp także bez ResizeObserver`
- `MOBILE15: CSS zachowuje kontrast, duże pola dotyku, safe area i widoczny fokus bez ukrywania podpisów`

Testy wykonują kod aplikacji w izolowanym środowisku i kontrolują strukturę
oraz reguły CSS. Nie potwierdzają fizycznych wymiarów ani zachowania Safari
na urządzeniu i nie oznaczają jeszcze publikacji na produkcji.

## Kontrola przeglądarkowa przed publikacją

- W izolowanej rzeczywistej przeglądarce sprawdzono wszystkie cztery widoki
  przy 320, 390 i 430 px. Szerokość dokumentu odpowiadała szerokości ekranu,
  a oznaczenie aktywnej zakładki odpowiadało widokowi. Każdy przycisk miał
  68 px wysokości, ikona 22 px; wysokość całego menu wynosiła 85 px,
  rezerwa pod treścią 105 px (bez sprzętowego insetu iPhone).
- Przy 768 px widoczne było menu mobilne; przy 1440 px tylko desktopowe,
  bez mobilnej rezerwy pod treścią. Kontrola obejmowała obsługę Enter.
- Przy 320 px i tekście 200% podpisy menu pozostawały dostępne i zawijały
  się, pasek wzrósł do 150 px, a rezerwa do 170 px. To kontrola menu,
  nie pełna deklaracja reflow całej aplikacji: istniejące karty dashboardu
  i pole daty wychodziły poza 320 px przy tym skrajnym powiększeniu.
  Ich przebudowa nie należy do zakresu dodania ikon w #15.
- Użyto atrap zalogowanego profilu; bez rzeczywistego logowania, zapisu
  w bazie, wiadomości e-mail i wywołań AI. Nie zastępuje to Safari/PWA
  na fizycznym iPhonie ani testu VoiceOver.

## Ręczna lista regresji

- Przy 320, 390, 430 i 768 px sprawdź wszystkie cztery zakładki: podpisy,
  widoczne ikony, aktywne tło, brak poziomego przewijania i brak nakładania.
- Przy 1440 px sprawdź, że nawigacja komputerowa pozostała bez zmian,
  a niewidoczne menu mobilne nie otrzymuje fokusu.
- Powiększ tekst do 200%: podpisy nadal są dostępne, pasek ma właściwą
  rezerwę, ostatnia kontrolka ekranu i komunikaty pozostają osiągalne.
- Użyj Tab/Shift+Tab oraz Enter/Spacja; aktywuj każdą zakładkę i sprawdź
  widoczny fokus bez jego nieoczekiwanej utraty przy aktualizacji odstępów.
- W Jadłospisie wybierz inny dzień, przejdź do Zakupów i wróć. Sprawdź datę,
  Wstecz/Dalej, adres widoku oraz odświeżenie.
- Przewiń do końca Ustawień i Zakupów. Sprawdź dolne kontrolki, toast,
  komunikat offline i aktualizację PWA, również w orientacji poziomej.
- Na fizycznym iPhonie wykonaj te same próby w Safari i zainstalowanym PWA,
  uwzględniając wskaźnik gestu Home i zmianę orientacji.

Testy izolowane i podgląd responsywny nie zastępują ostatniego punktu.
Test na fizycznym iPhonie/Safari/PWA pozostaje do potwierdzenia przez
użytkownika; nie jest oznaczany jako zaliczony na podstawie samej emulacji.
Wyniki automatycznej regresji i publikacji należy zapisać w PR oraz w #15,
oddzielnie od tej listy kryteriów. Ten dokument sam nie potwierdza wdrożenia.

## Publikacja i cofnięcie

Przed publikacją uruchom `node scripts/build_pwa.mjs`, kontrolę struktury
strony i `node --test scripts/*.test.mjs`. Zapisz aktualny `dist/sw.js`
razem ze zmianą. Po scaleniu zweryfikuj oddzielnie CI i Pages oraz pobrane
pliki produkcyjne. Użytkownik istniejącej instalacji PWA może potrzebować
zaakceptować komunikat aktualizacji aplikacji.

Nie ma zmian Auth, bazy danych, generatora AI, Edge ani sekretów.
Wycofanie to nowy PR odwracający tę zmianę frontendu, ponowna generacja
cache i publikacja; nie wymaga cofania danych lub backendu. Ogólna procedura:
[utrzymanie i wycofanie](operations.md).
