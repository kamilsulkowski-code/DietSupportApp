# Aktualizacja UX — zadanie #7

Źródło wymagań: [zadanie #7](https://github.com/kamilsulkowski-code/DietSupportApp/issues/7).
Zmiany rozwijają frontend wersji 1.0.1. Ten dokument nie ustanawia nowego
tagu wydania ani nie potwierdza akceptacji użytkownika.

## Zakres i zachowanie

### UX1 — zgodność jadłospisu z ustawieniami

Zapis nowych założeń nie modyfikuje historycznego planu AI. Interfejs ma stale
informować, kiedy plan oparto na innych założeniach, i udostępniać przejście
do wygenerowania nowego. Gdy dla starszego planu nie ma danych pozwalających
porównać założenia, zgodność jest nieznana — nie należy przedstawiać jej jako
potwierdzonej. Ostrzeżenie nie znika po zakończeniu krótkiego powiadomienia.

Po udanym generowaniu profil przechowuje
`settings.planSettingsSnapshot = { planId, signature }`. Podpis obejmuje
założenia użyte do utworzenia konkretnego planu; jest synchronizowany w
istniejącym JSONB `profiles.settings`, więc nie wymaga nowej kolumny.
Sam zbliżony cel kalorii nie wystarcza do potwierdzenia zgodności.
Starszy profil bez migawki powoduje ostrzeżenie o nieznanej zgodności.

### UX2 — generowanie i błędy

W trakcie generowania przycisk jest zablokowany i wyraźnie opisuje trwającą
operację. Błąd jest widoczny w treści strony, nie tylko w znikającym
powiadomieniu. Jeśli pozostaje poprzedni plan, komunikat wskazuje jego datę.
Nieudana próba nie przenosi użytkownika do jadłospisu tak, jak udana operacja.
Ponowienie jest świadomą czynnością użytkownika; nie dodajemy automatycznych
płatnych wywołań AI ani fikcyjnego procentu postępu.

### UX3 — uczciwe podsumowanie kalorii

Pasek przedstawia stosunek kalorii zaplanowanych na dzisiaj do zapisanego
celu. Wartość wynika z posiłków, a nie ze stałej szerokości CSS. Podpis
odróżnia planowanie od rejestrowania zjedzonej żywności. Dzień bez posiłków
nie sugeruje zrealizowanego celu; wizualne wypełnienie nie wykracza poza pasek.

### UX4 — nawigacja i wybrany dzień

Komputer korzysta z jednej nawigacji bocznej, a telefon z dolnego paska:
„Dzisiaj”, „Jadłospis”, „Zakupy”, „Ustawienia”. Aktywny ekran jest oznaczony
wizualnie i semantycznie. Adres z fragmentem (`#…`) zachowuje ekran i datę
jadłospisu, a Wstecz/Dalej oraz odświeżenie odtwarzają ten wybór.
Zmiana ekranu aktualizuje tytuł dokumentu oraz dostępny fokus nagłówka.
Zmiana samego dnia pozostawia fokus na kontrolce daty.
Nie jest to nowy routing serwerowy — aplikacja nadal działa jako statyczna
strona GitHub Pages.

### UX5 — gość i pierwsze uruchomienie

Powitanie gościa jest neutralne, bez wpisanego na stałe imienia. Plan
przykładowy ma jednoznaczne oznaczenie demonstracyjne. Krótkie wskazówki
prowadzą przez ustawienie założeń, logowanie i wygenerowanie planu.
Przycisk gościa wyjaśnia potrzebę logowania i otwiera formularz, zamiast
kończyć ścieżkę samym powiadomieniem. Nie zmieniamy dostawcy uwierzytelniania
ani sposobu wysyłania e-maili w Supabase.
Zdarzenie wylogowania z innej karty również usuwa plan i zakupy z widoku
oraz przywraca demonstrację; nie kasuje zapisanych lokalnie założeń.

### UX6 — formularz, szkic i synchronizacja

Tryb „Oblicz automatycznie” lub „Ustaw samodzielnie” zastępuje konieczność
domyślania się znaczenia pustego pola kalorii. Podgląd uwzględnia szkic
formularza, ale zapisany cel zmienia się dopiero po zapisaniu. Formularz
informuje o niezapisanych zmianach i pozwala jawnie je odrzucić. Status rozróżnia zapis na urządzeniu,
potwierdzony zapis w chmurze i błąd synchronizacji; nie obiecuje synchronizacji
po nieudanym żądaniu. Dotychczasowy model kalorii i pierwszeństwo celu
ręcznego opisano w [założeniach treningowych](training-settings.md).

### UX7 — zakupy

Lista umożliwia filtrowanie produktów do kupienia i kupionych oraz pokazuje
liczbę pozostałych pozycji. Wiersze mają wygodne pola dotykowe. Zaznaczenie
produktu zachowuje pozycję przewijania i użyteczny fokus; jeśli filtr usuwa
pozycję z widoku, fokus nie powinien zniknąć w nieaktywnym elemencie.
Zbiorcze oznaczenie zakupów można cofnąć. Cofanie jest unieważniane po
zmianie konta, cyklu lub późniejszej ręcznej edycji, aby nie odtworzyć koszyka
innego użytkownika lub wcześniejszego cyklu. Są to zmiany obsługi istniejącej
listy, a nie nowy mechanizm cen, promocji ani eksportu.

### UX8 — dostępność

Okno logowania obsługuje Tab/Shift+Tab, Escape i przywraca fokus do elementu,
który je otworzył. Elementy poza otwartym modalem nie są dostępne klawiaturą.
Dotyczy to zarówno głównej zawartości, jak i osobnego przycisku konta.
Cel diety ma semantykę grupy jednokrotnego wyboru, a nie tylko wyróżnienie
kolorem. Widoczny fokus, etykiety i obszary dotykowe są częścią wdrożenia.
Nie deklarujemy pełnej zgodności z WCAG bez odrębnego audytu.

### UX9 — weryfikacja i dokumentacja

Testy izolowane pokrywają ścieżki UX1–UX8 oraz istniejące zachowania
ustawień, planu dnia, logowania i generatora. Kontrola interfejsu obejmuje
telefon i komputer. Wymagania, kod, testy i dowód wdrożenia są powiązane
z zadaniem #7; status wdrożenia nie jest równoznaczny z akceptacją użytkownika.

## Macierz śledzenia

Poniższe miejsca odnoszą się do frontendu `dist/index.html`. Nazwy wskazują
odpowiedzialność kodu; wyniki wykonania testów należy rozpatrywać oddzielnie
od samego istnienia przypadków testowych.

| Wymaganie | Miejsce w interfejsie / kodzie | Weryfikacja |
| --- | --- | --- |
| UX1 | `settingsSignature()`, `planFreshness()`, `renderPlanNotice()` | porównanie zgodnych, zmienionych i nieznanych założeń |
| UX2 | `generatePlan()`, panel błędu, przycisk generowania | błąd z poprzednim planem, sukces, blokada ponownego wywołania |
| UX3 | `renderDashboard()`, podsumowanie i pasek kalorii | brak dnia, częściowy cel, przekroczony cel |
| UX4 | `readRoute()`, `navigate()`, `applyRoute()` i zmiana dnia | fragment adresu, Wstecz/Dalej, odświeżenie, aktywna nawigacja |
| UX5 | `renderDashboard()`, `renderAccount()`, wejście do logowania | neutralny gość, plan demonstracyjny i CTA |
| UX6 | `readSettingsForm()`, `markSettingsDirty()`, `updateCalorieMode()`, `#discardSettings`, zapis i synchronizacja | szkic bez zapisu, odrzucenie, auto/ręcznie, lokalnie/chmura/błąd |
| UX7 | `renderShopping()`, `updateShoppingState()`, filtry i akcja zbiorcza | licznik, filtr, cofnięcie, fokus i pozycja |
| UX8 | `requestLogin()`, `closeLogin()`, `trapLoginFocus()`, wybór celu | Tab/Shift+Tab, Escape, powrót fokusu i stan wyboru |
| UX9 | testy w `scripts/`, ten dokument, README i CHANGELOG | regresja, kontrola mobilna/desktop, ślad zadania #7 |

Testy aktualizacji: `node --test scripts/ux.test.mjs`. Pełna regresja:
`node --test scripts/*.test.mjs`. Kontrola statyczna:
`python3 scripts/validate_site.py`.

## Raport weryfikacji przed wdrożeniem — 2026-10-18

- **79/79 testów zakończonych powodzeniem:** 23 testy aktualizacji UX
  oraz 56 wcześniejszych testów regresji.
- Kontrola struktury strony `scripts/validate_site.py` zakończona powodzeniem.
- W przeglądarce sprawdzono szerokości **320, 390, 768 i 1440 px**.
  Dla każdej szerokość dokumentu i treści odpowiadała szerokości okna —
  w sprawdzonych stanach nie było poziomego przepełnienia. Do 768 px
  widoczny był dolny pasek i ukryta nawigacja boczna; przy 1440 px odwrotnie.

| Scenariusz przeglądarkowy | Wynik |
| --- | --- |
| Ustawienia przy 320 px: zmiana wagi 70 → 72 kg | Widoczny szkic i 144 g białka w podglądzie; zapis gościa potwierdza zapis lokalny |
| Nieaktualny plan przy 390 px | Trwałe porównanie celu planu 2200 kcal z nowym celem 2400 kcal |
| Symulowany błąd AI przy 390 px | Trwały błąd, zachowany ekran „Dzisiaj”, brak samoczynnego ponawiania |
| Zakupy | Pojedyncze zaznaczenie 1/4, zbiorcze 4/4, cofnięcie do 1/4; filtr ukrywa kupione pozycje |
| Zmiana dnia i Wstecz | Przejście 18 → 19 października i powrót zmieniają treść oraz datę w adresie |
| Logowanie otwarte przez przycisk gościa | Modal otwiera się bez wywołania generatora; Shift+Tab/Tab zamykają obieg fokusu, Escape zamyka okno i oddaje fokus przyciskowi generowania |

To kontrola izolowanego frontendu i zachowań z atrapami usług, nie pełny test
produkcyjny. Dodatkowe testy automatyczne pokrywają m.in. wylogowanie z innej
karty, blokowanie przycisku konta poza modalem i utrzymanie fokusu zakupów.
Nie wykonano pomiaru kontrastu ani pełnego audytu WCAG.

## Ograniczenia weryfikacji

- Testy z atrapami Supabase nie potwierdzają rzeczywistego dostarczenia
  wiadomości logowania, polityk RLS ani zapisu produkcyjnego.
- Test po rzeczywistym zalogowaniu i płatne generowanie AI pozostają do
  osobnej sesji, zgodnie z wcześniejszym ustaleniem z użytkownikiem.
- Przegląd ekspercki i test techniczny nie są badaniem użyteczności.
  Zalecana kolejna kontrola to zadania z 3–5 osobami: ustawienie celu,
  znalezienie jutrzejszego jadłospisu i skompletowanie zakupów. Należy mierzyć
  powodzenie, czas i liczbę pomyłek — nie przypisywać niezmierzonych wyników.

## Wdrożenie

Zakres jest frontendowy: nie wymaga migracji bazy ani zastąpienia funkcji
`generate-plan`. Publikacja korzysta z istniejącego workflow GitHub Pages.
Ten raport dokumentuje zakończone testy przed wdrożeniem. Implementacja i CI:
[PR #8](https://github.com/kamilsulkowski-code/DietSupportApp/pull/8).
Potwierdzenie publikacji, identyfikator wdrożonego commitu i odnośniki do
GitHub Actions są zapisywane po kontroli produkcji w
[zadaniu #7](https://github.com/kamilsulkowski-code/DietSupportApp/issues/7).
Sam ten raport nie jest dowodem zakończenia publikacji.

`dist/version.json` zachowuje wersję i historyczny tag 1.0.1, a obiekt
`frontendUpdate` identyfikuje odrębną aktualizację jako `ux-7`, łączy ją
z zadaniem #7 i wskazuje `releaseBaseline: "v1.0.1"`. Tag v1.0.1 nie jest
przesuwany; sam numer bazowy nie oznacza identyczności tego frontendu
z archiwalnym wydaniem. Nie utworzono nowego tagu ani nowego wydania.
