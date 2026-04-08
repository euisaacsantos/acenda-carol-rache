# Implementacao da Pagina de Credenciamento

Documentacao completa de design e funcionalidade da pagina `/credenciamento`, para replicar em outros projetos.

---

## Visao Geral

Pagina de credenciamento para eventos ao vivo. O usuario preenche email + telefone, os dados sao enviados para o backend via `sendBeacon` (nao bloqueia), e o usuario eh redirecionado imediatamente para o link do evento.

Se o usuario ja preencheu antes (dados no `localStorage`), eh redirecionado automaticamente sem ver o formulario.

---

## Arquitetura

```
Usuario acessa /credenciamento
  |
  +-- Tem lead_data no localStorage? (TTL 3 dias)
  |     |
  |     SIM --> sendBeacon /api/credenciamento
  |     |       sendToAC (ActiveCampaign)
  |     |       trackEvent('Lead')
  |     |       redirect imediato --> REDIRECT_URL
  |     |
  |     NAO --> Mostra formulario
  |               |
  |               Submit --> sendBeacon /api/credenciamento
  |                          sendToAC (ActiveCampaign)
  |                          trackEvent('Lead')
  |                          salva localStorage
  |                          redirect imediato --> REDIRECT_URL
```

**Importante:** O `sendBeacon` garante que o browser entrega os dados mesmo com redirect imediato. Nao usa `await` nem `Promise.race` — o usuario nunca fica travado.

---

## Design (Tailwind CSS)

### Layout
- Tela cheia com imagem de fundo (mobile e desktop diferentes)
- Overlay escuro com blur: `bg-black/70 backdrop-blur-md`
- Card branco centralizado: `max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl`

### Estrutura visual
```
+-------------------------------------------+
|          (overlay escuro + blur)           |
|                                           |
|              [LOGO branco]                |
|                                           |
|    +-------------------------------+      |
|    |    [icone cadeado dourado]    |      |
|    |                               |      |
|    |    Preencha abaixo para       |      |
|    |    entrar no EVENTO ao vivo   |      |
|    |                               |      |
|    |    [input email]              |      |
|    |    [input telefone com DDI]   |      |
|    |                               |      |
|    |    [BOTAO DESBLOQUEAR AULA]   |      |
|    |                               |      |
|    |    Dados seguros...           |      |
|    +-------------------------------+      |
+-------------------------------------------+
```

### Cores (CSS custom properties)
```css
--color-brand-light: #FCFCF2;   /* fundo da pagina */
--color-brand-dark: #000000;     /* texto principal */
--color-brand-gold: #C09C64;     /* dourado (botoes, destaques) */
--color-brand-accent: #E5E5DA;   /* bordas, separadores */
```

### Tipografia
```css
--font-sans: "Gotham", ui-sans-serif, system-ui, sans-serif;
--font-serif: "Quincy", ui-serif, Georgia, serif;
```
- Titulo: `font-serif text-[22px] lg:text-[26px]`
- Corpo: `font-sans text-sm`

### Botao CTA
```css
.bg-gradient-gold { background: linear-gradient(135deg, #C09C64 0%, #8B6B3D 100%); }
.animate-pulse-gold { animation: pulse-gold 2s ease-in-out infinite; }
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 10px 25px -3px rgba(192, 156, 100, 0.25); }
  50% { box-shadow: 0 10px 40px -3px rgba(192, 156, 100, 0.5); }
}
```
Classes Tailwind do botao:
```
w-full bg-gradient-gold text-white px-6 py-4 rounded-xl font-bold text-base
hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200
shadow-xl shadow-brand-gold/25 animate-pulse-gold
```

### Icones
Usa `lucide-react`: `Lock` (cadeado fechado no header) e `Unlock` (cadeado aberto no botao).

---

## Componente PhoneInput

Input de telefone internacional com:
- Seletor de pais (bandeira + DDI) em dropdown
- Busca por nome do pais ou DDI
- Formatacao automatica para Brasil: `(XX) XXXXX-XXXX`
- Validacao de minimo de digitos por pais
- 200+ paises pre-configurados

### Props
```typescript
interface PhoneInputProps {
  value: string;           // formato: +5511999990001
  onChange: (fullPhone: string) => void;
  className?: string;      // override das classes do input
}
```

### Funcoes exportadas
```typescript
getPhoneDigits(fullPhone: string): string  // retorna so digitos
getMinDigits(fullPhone: string): number    // minimo de digitos pro pais
```

### Arquivo: `src/components/PhoneInput.tsx`
O componente eh auto-contido — basta copiar o arquivo inteiro.

---

## API Serverless (`api/credenciamento.js`)

### Endpoint
`POST /api/credenciamento`

### Body (JSON)
```json
{
  "email": "user@email.com",
  "phone": "+5511999990001",
  "utm_source": "MetaAds",
  "utm_medium": "audience-name",
  "utm_campaign": "campaign-name",
  "utm_content": "creative-name",
  "utm_term": "keyword",
  "fbclid": "abc123",
  "gclid": "xyz789"
}
```

### O que faz
1. Calcula o `evento` (semana atual) server-side usando `config.json`
2. Insere no Supabase (tabela configuravel)
3. Retorna `200 { success: true }`

### Calculo do evento
Usa array `viradas_credenciamento` (ou fallback `viradas`) do config.json:
```json
{
  "ciclos": [{
    "workshop": "0426",
    "inicio": "2026-03-09",
    "viradas": ["2026-03-17T20:00:00Z", ...],
    "viradas_credenciamento": ["2026-03-23T03:00:00Z", ...]
  }]
}
```
- `viradas`: quando a captacao muda de semana (terca 17h BRT)
- `viradas_credenciamento`: quando o credenciamento muda (segunda 00h BRT)

### Env vars necessarias (Vercel)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Frontend (`src/Credenciamento.tsx`)

### Constantes a configurar
```typescript
const REDIRECT_URL = 'https://youtu.be/...';  // link do evento ao vivo
const AC_FORM_URL = 'https://xxx.activehosted.com/proc.php?jsonp=true';  // ActiveCampaign
const LEAD_TTL_MS = 3 * 24 * 60 * 60 * 1000;  // 3 dias
```

### Funcoes principais

#### `getLeadData()`
Le `lead_data` do localStorage. Retorna `{ email, phone }` ou null se expirado/inexistente.

#### `saveLeadData(email, phone)`
Salva no localStorage com timestamp pra TTL.

#### `getUtmParams()`
Captura UTMs + fbclid + gclid da URL.

#### `sendToAC(email, phone)`
Envia pra ActiveCampaign via form POST (mode: no-cors). Campos UTM mapeados:
- field[2] = utm_source
- field[3] = utm_medium
- field[4] = utm_campaign
- field[5] = utm_term
- field[6] = utm_content

#### `sendToAPI(email, phone)`
Envia pra `/api/credenciamento` via `navigator.sendBeacon`. Fallback pra `fetch` com `keepalive: true`.

---

## Checklist para replicar em outro projeto

1. **Copiar arquivos:**
   - `src/Credenciamento.tsx`
   - `src/components/PhoneInput.tsx`
   - `api/credenciamento.js`

2. **CSS:** Adicionar no `index.css`:
   - Custom properties de cor (`--color-brand-*`)
   - Font faces (Quincy + Gotham, ou substituir)
   - Classes `.bg-gradient-gold`, `.animate-pulse-gold`

3. **Instalar dependencia:**
   ```bash
   npm install lucide-react
   ```

4. **Configurar:**
   - `REDIRECT_URL` — link do evento ao vivo
   - `AC_FORM_URL` — endpoint do ActiveCampaign (ou remover se nao usar)
   - Tabela do Supabase no `api/credenciamento.js`
   - `config.json` com ciclos e viradas
   - Env vars no Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

5. **Rota:** Adicionar `/credenciamento` no router (ex: `src/main.tsx`):
   ```tsx
   <Route path="/credenciamento" element={<Credenciamento />} />
   ```

6. **Imagens:** Background mobile e desktop + logo branco

7. **Facebook Pixel:** Importar `initPixel` e `trackEvent` do seu lib de tracking
