# RAVETURE — Bakalářská práce

Webová aplikace pro správu a prodej vstupenek na hudební a kulturní akce.

## Požadavky

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (musí být spuštěný)

## Spuštění

```bash
docker compose up --build
```

Při prvním spuštění se automaticky:
- vytvoří databáze a spustí migrace
- naplní testovacími daty (admin účet, ukázkové akce)

Po dokončení buildu jsou dostupné tyto adresy:

| Služba           | URL                    |
|------------------|------------------------|
| Frontend         | http://localhost:3000  |
| Backend API      | http://localhost:5050  |
| Ticketing API    | http://localhost:5001  |

## Testovací účty

| Role       | Email                   | Heslo         |
|------------|-------------------------|---------------|
| admin      | admin@raveture.cz       | Admin123!     |
| organizer  | organizer@raveture.cz   | Organizer123! |
| user       | user1@raveture.cz       | User123!      |

### Co jednotlivé role umí

- **admin** — správa uživatelů, přehled celé platformy
- **organizer** — vytváření a správa akcí, sledování prodejů
- **user** — procházení akcí, nákup vstupenek, QR kód vstupenky

## Zastavení

```bash
docker compose down
```

Pro smazání databázových dat (čistý start):

```bash
docker compose down -v
```
