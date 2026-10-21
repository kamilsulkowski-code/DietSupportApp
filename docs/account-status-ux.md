# Konto i dyskretne statusy synchronizacji

Zakres zatwierdzony przez użytkownika: przycisk konta w normalnym nagłówku,
sekcja **Konto pod Twoje założenia** na telefonie i komputerze oraz mniej
wyeksponowane komunikaty. Ten dokument opisuje wymagania i sposób weryfikacji;
sam w sobie nie potwierdza publikacji ani zaliczenia testów na urządzeniach.

Zmiana rozwija UX z [zadania #7](https://github.com/kamilsulkowski-code/DietSupportApp/issues/7).
Zachowuje obsługę [PWA — #12](https://github.com/kamilsulkowski-code/DietSupportApp/issues/12)
i [logowania hasłem — #13](https://github.com/kamilsulkowski-code/DietSupportApp/issues/13).
Nie zmienia statusu akceptacji ani zamknięcia tych zadań i nie ustanawia
nowego tagu wydania.

## ACCOUNT1 — konto nie zasłania treści

Przycisk **Zaloguj się** / **Konto** jest częścią przewijanej strony, a nie
elementem `fixed` nad zawartością. Na telefonie znajduje się obok logo Forma,
a na komputerze po prawej stronie nagłówka. Dolna nawigacja nie zmienia się.

U niezalogowanej osoby przycisk otwiera istniejący formularz logowania.
U zalogowanej otwiera mały panel konta: adres e-mail, przejście do ustawień
konta i osobne **Wyloguj**. Samo otwarcie panelu nie wylogowuje.
Panel obsługuje klawiaturę, kliknięcie poza nim oraz Escape. Escape
przywraca fokus do przycisku Konto; kliknięcie poza panelem lub przejście
Tab zachowuje naturalny fokus wskazanego elementu.

## ACCOUNT2 — Konto pod założeniami

W widoku **Ustawienia** sekcja **Konto** znajduje się za sekcją
**Twoje założenia**, również w układzie komputerowym. Nie jest drugą kolumną
umieszczoną obok formularza.

Zalogowana osoba znajdzie tam adres e-mail, ustawienie lub zmianę hasła,
jawne wylogowanie oraz stan synchronizacji i czas ostatniej udanej
synchronizacji. Niezalogowana osoba ma wejście do logowania i informację,
że pracuje lokalnie. Mechanizm i ograniczenia ustawiania/odzyskiwania hasła
pozostają opisane w [instrukcji logowania](password-login.md).

Czas ostatniego sukcesu nie oznacza bieżącej zgodności po błędzie. Jeśli
synchronizacja się nie powiodła, interfejs pokazuje błąd i może zachować
poprzedni czas jako informację historyczną; nie przedstawia go jako dowodu
zapisania ostatniej zmiany.

## ACCOUNT3 — komunikaty przy właściwej czynności

- Rutynowe sukcesy, np. „Dane pobrane z chmury”, nie tworzą szerokiego banera
  zajmującego górę aplikacji. Stan i czas synchronizacji są w sekcji Konto.
- Wynik zapisu założeń jest przy przycisku zapisu. Rozróżnia zapis lokalny,
  potwierdzony zapis w chmurze oraz nieudaną synchronizację.
- Błąd pozostaje przy operacji, której dotyczy, i udostępnia ponowienie.
  Przycisk Konto zawiera zwięzły sygnał problemu, prowadzący do szczegółów.
- Sukces innej operacji ani późniejszy odczyt nie przykrywają błędu
  niezapisanego ustawienia. Ponowienie odbywa się świadomie; nie ma nowej
  automatycznej kolejki synchronizacji offline.

Nie są usuwane istotne ostrzeżenia: błąd logowania, generowania, brak sieci
czy niezgodność planu nadal wymagają czytelnej informacji w swoim kontekście.
Zmniejszenie ekspozycji rutynowych komunikatów nie może ukrywać utraty zapisu.

## ACCOUNT4 — zachowanie danych i PWA

Zakres obejmuje frontend. Konta, identyfikatory, hasła, zapisane plany,
zakupy i schemat danych pozostają bez zmian. Nie wymaga migracji SQL,
zmian RLS, funkcji Edge, SMTP, sekretów ani nowych kont dostawców.

Obowiązują istniejące zasady zapisu lokalnego/chmurowego, ochrony szkicu
i usuwania prywatnych danych z widoku po wylogowaniu. PWA nadal buforuje
tylko publiczny interfejs, nie odpowiedzi API ani sesje użytkownika.
Po zmianie plików interfejsu trzeba przebudować `dist/sw.js`; dokumentacja
[PWA](pwa.md) określa sposób świadomej aktualizacji i ograniczenia offline.

## Macierz śledzenia i weryfikacji

Kod interfejsu znajduje się w `dist/index.html`. Poniższa macierz określa
wymagane scenariusze, a nie wynik ich wykonania. Nazwy konkretnych testów
i raport z przebiegu należy powiązać z PR-em implementacji.

| Wymaganie | Miejsce w interfejsie | Weryfikacja |
| --- | --- | --- |
| ACCOUNT1 | Nagłówek, przycisk Konto i jego panel | gość otwiera logowanie; zalogowany otwiera panel bez wylogowania; jawne wylogowanie; klawiatura, Escape, kliknięcie poza panelem i powrót fokusu; przycisk przewija się z treścią |
| ACCOUNT2 | Ustawienia → Twoje założenia → Konto | kolejność DOM i układu na telefonie/komputerze; e-mail, hasło i wylogowanie; stan lokalny/chmura/błąd i poprawny czas ostatniego sukcesu |
| ACCOUNT3 | Potwierdzenie przy zapisie, stan Konto i lokalne błędy | brak górnego banera rutynowego sukcesu; błąd trwały; ponowienie; odczyt/sukces innej operacji nie kasuje błędu zapisu |
| ACCOUNT4 | Istniejące logowanie, ustawienia, zakupy, PWA | regresja Auth/UX/PWA; zachowanie szkicu i wylogowania; zgodny fingerprint cache; brak zmian SQL/Edge/SMTP |

Uruchomienie kontroli przed publikacją:

```sh
node scripts/build_pwa.mjs
node scripts/build_pwa.mjs --check
node --test scripts/*.test.mjs
python3 scripts/validate_site.py
```

Testy regresji znajdują się m.in. w `scripts/ux.test.mjs`,
`scripts/auth_password.test.mjs`, `scripts/auth_otp.test.mjs` oraz
`scripts/pwa.test.mjs`. Testy nowego zakresu powinny pokrywać scenariusze
z macierzy ACCOUNT1–ACCOUNT4, w tym symulowane awarie zapisu i ponowienie.
Atrapy usług nie potwierdzają rzeczywistego zapisu w Supabase ani działania
logowania na fizycznym urządzeniu.

Kontrola przeglądarkowa powinna obejmować co najmniej szerokości 320, 390,
768 i 1440 px, przewijanie długiej strony, obsługę wyłącznie klawiaturą
oraz widoczność błędu po przejściu między ekranami. Test produkcyjny
zalogowanej sesji należy odnotować osobno, bez przypisywania mu wyniku
na podstawie testów izolowanych.

## Publikacja i wycofanie

Kontrola przed publikacją (2026-10-21): **140/140 testów** zaliczonych,
w tym 15 testów ACCOUNT1–ACCOUNT4 w `scripts/ux.test.mjs`; walidacja strony
i aktualny fingerprint workera również poprawne. Regresje obejmują kolejkę
zapisów online, rozróżnienie ponowienia odczytu/zapisu, edycję podczas odczytu,
odwrotną kolejność odpowiedzi oraz spóźnione wyniki poprzedniego konta.

Izolowana kontrola przeglądarkowa: przy szerokościach 320, 390, 768 i 1440 px
nie wystąpiło poziome przepełnienie, przycisk mieścił się w nagłówku, a Konto
znajdowało się poniżej formularza. Po przewinięciu przycisk opuszczał ekran
(`position: static`). Potwierdzono otwieranie panelu, Escape i błąd zapisu
przy zakupach; udane jawne ponowienie usuwało błąd bez banera sukcesu u góry.
Były to fikcyjne dane i atrapa chmury, bez logowania/zmiany haseł użytkownika,
maili, rzeczywistych zapisów w bazie i wywołań AI. Nie oznacza to testu na
fizycznym iPhonie. Końcowy raport publikacji zostanie zapisany w PR.

Publikacja korzysta z istniejącego PR, CI i GitHub Pages. Przed uznaniem
wdrożenia za zakończone należy potwierdzić przejście kontroli jakości,
zakończenie Pages, zgodność plików produkcyjnych oraz aktualizację PWA.
Identyfikator commitu i dowody kontroli należy zapisać w PR/zgłoszeniu.

Wycofanie przez nowy PR przywraca poprzedni frontend i przebudowany worker.
Nie usuwa kont, haseł ani danych. Nie przesuwa historycznych tagów i nie
wymaga wdrażania poprzedniej funkcji Edge dla tej frontendowej zmiany.
