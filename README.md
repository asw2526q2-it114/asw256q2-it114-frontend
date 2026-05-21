# IssueHub Frontend

Client web responsive d'IssueHub desenvolupat amb **Next.js**, **React** i **TypeScript** per al **Tercer Lliurament** de l'assignatura.

Aquest repositori conté el frontend que consumeix l'API REST implementada al backend dels lliuraments 1 i 2. L'aplicació reprodueix les funcionalitats principals de la webapp inicial, adaptades a una arquitectura frontend + backend separada.

## Equip

- Pol Giralt
- Pol Montanera
- Noel Freire
- Sergi Galán
- Fernando Joel Alcívar

## Enllaços del projecte

- Frontend: https://asw256q2-it114-frontend.vercel.app/issues
- Taiga: https://tree.taiga.io/project/polmontanera-asw/timeline
- Backend https://asw256q2-it114-issues-tracker-68a6595cdaa6.herokuapp.com/api


## Stack tecnològic

- **Next.js 16**
- **React 19**
- **TypeScript**
- **ESLint**
- **pnpm**

## Funcionalitats implementades

### 1. Accés i selecció de perfil

- Pantalla de `login` amb selector de perfil.
- Validació del perfil contra el backend mitjançant `X-API-Key`.
- Emmagatzematge de la sessió al navegador.

Els perfils disponibles per a la demo estan definits a [lib/users.ts](/Users/polmontanera/Desktop/Q6%202526/ASW/Projecte/asw256q2-it114-frontend/lib/users.ts).

### 2. Gestió d'issues

- Llistat d'issues.
- Cerca per text.
- Filtres per estat, tipus, severitat, prioritat, etiqueta i assignació.
- Ordenació de resultats.
- Creació d'issues noves.
- Edició i eliminació d'issues.
- Inserció massiva d'issues.
- Navegació cap al detall de cada issue.

### 3. Detall d'una issue

- Visualització de la descripció.
- Gestió de l'assignat.
- Gestió de watchers.
- Gestió de deadline.
- Gestió de comentaris.
- Pujada i eliminació d'adjunts.
- Visualització de l'activitat associada a la issue.

### 4. Configuració de catàlegs

Des del mòdul de `settings` es poden administrar els catàlegs que utilitza el sistema:

- Statuses
- Priorities
- Types
- Severities
- Tags
- Due dates

Per a cada catàleg es poden fer operacions de creació, edició i eliminació a través de l'API.

### 5. Perfil d'usuari

- Consulta del perfil propi i del d'altres usuaris.
- Edició del perfil propi.
- Actualització de la bio.
- Pujada o eliminació de l'avatar.
- Consulta d'issues assignades, seguides i comentaris associats.
- Visualització de l'API key del perfil autenticat.

### 6. Disseny responsive

La interfície està preparada per funcionar tant en escriptori com en dispositius mòbils:

- Barra lateral en pantalles grans.
- Navegació mòbil inferior.
- Components i taules adaptats a diferents amplades.

## Estructura principal del projecte

```text
app/           Rutes de l'aplicació Next.js
components/    Components d'interfície
lib/           API client, auth, hooks i utilitats
```

## Execució en local

### Requisits previs

- Node.js instal.lat
- `pnpm` disponible al sistema
- Backend d'IssueHub en funcionament

### Instal·lació

```bash
pnpm install
```

### Variables d'entorn

Crea un fitxer `.env.local` si vols apuntar a un backend diferent del valor per defecte:

```bash
NEXT_PUBLIC_API_BASE_URL=https://asw256q2-it114-issues-tracker-68a6595cdaa6.herokuapp.com/api
```

Si `NEXT_PUBLIC_API_BASE_URL` no es defineix, el frontend utilitza `http://localhost:8000/api`.

### Arrencada en desenvolupament

```bash
pnpm dev
```

L'aplicació quedarà disponible habitualment a:

```text
http://localhost:3000
```