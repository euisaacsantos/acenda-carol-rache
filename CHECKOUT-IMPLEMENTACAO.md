# Implementacao da Pagina de Pre-Checkout

Documentacao completa de design e funcionalidade da pagina `/checkout`, para replicar em outros projetos.

---

## Visao Geral

Pagina intermediaria antes do checkout Hotmart. Coleta nome + email + telefone, salva no Supabase via `sendBeacon` (nao bloqueia), e redireciona para a Hotmart com dados pre-preenchidos + UTMs no parametro `sck`.

Se o usuario ja preencheu antes (dados no `localStorage`), eh redirecionado automaticamente para a Hotmart sem ver o formulario.

---

## Arquitetura

```
Usuario acessa /checkout
  |
  +-- Tem lead_data no localStorage? (TTL 3 dias)
  |     |
  |     SIM --> sendBeacon /api/cpl-checkout (source: 'localStorage')
  |     |       trackEvent('AddToCart')
  |     |       redirect imediato --> Hotmart (com email + phone + sck)
  |     |
  |     NAO --> Mostra formulario (nome + email + telefone)
  |               |
  |               Submit --> sendBeacon /api/cpl-checkout (source: 'form')
  |                          trackEvent('AddToCart')
  |                          salva localStorage
  |                          redirect imediato --> Hotmart
```

---

## Design (Tailwind CSS)

### Layout
Identico ao credenciamento — tela cheia, overlay escuro com blur, card branco centralizado.

### Diferencas visuais do credenciamento
| Elemento | Credenciamento | Checkout |
|----------|---------------|----------|
| Icone | Lock (cadeado) | ShoppingCart (carrinho) |
| Titulo | "entrar no EVENTO ao vivo" | "garantir sua vaga" |
| Subtitulo | "redirecionada para a aula" | "pagina de pagamento segura" |
| Campos | email + telefone | **nome** + email + telefone |
| Botao icone | Unlock (cadeado aberto) | ArrowRight (seta) |
| Botao texto | "DESBLOQUEAR AULA" | "IR PARA PAGAMENTO" |
| Pixel event | Lead | **AddToCart** |

### Estrutura visual
```
+-------------------------------------------+
|          (overlay escuro + blur)           |
|                                           |
|              [LOGO branco]                |
|                                           |
|    +-------------------------------+      |
|    |    [icone carrinho dourado]   |      |
|    |                               |      |
|    |    Preencha seus dados para   |      |
|    |    garantir sua vaga          |      |
|    |                               |      |
|    |    [input nome]               |      |
|    |    [input email]              |      |
|    |    [input telefone com DDI]   |      |
|    |                               |      |
|    |    [BOTAO IR PARA PAGAMENTO]  |      |
|    |                               |      |
|    |    Dados seguros...           |      |
|    +-------------------------------+      |
+-------------------------------------------+
```

### CSS (mesmo do credenciamento)
```css
--color-brand-light: #FCFCF2;
--color-brand-dark: #000000;
--color-brand-gold: #C09C64;
--color-brand-accent: #E5E5DA;

.bg-gradient-gold { background: linear-gradient(135deg, #C09C64 0%, #8B6B3D 100%); }
.animate-pulse-gold { animation: pulse-gold 2s ease-in-out infinite; }
```

---

## Integracao com Hotmart

### buildHotmartUrl()

Constroi a URL de checkout da Hotmart com dados pre-preenchidos:

```
https://pay.hotmart.com/PRODUCT_ID?off=OFFER_ID&checkoutMode=10
  &email=user@email.com
  &phoneac=11              (DDD, so Brasil)
  &phonenumber=999990001   (numero sem DDI/DDD)
  &name=Nome
  &sck=utm_source|utm_medium|utm_campaign|utm_content|utm_term
```

### Parsing do telefone para Hotmart
```javascript
// Numero brasileiro: +5511999990001
const national = phoneDigits.slice(2);  // remove '55'
phoneac = national.slice(0, 2);         // '11' (DDD)
phonenumber = national.slice(2);        // '999990001'

// Internacional: passa tudo como phonenumber
phonenumber = phoneDigits;
```

### UTMs no sck
UTMs da URL sao concatenados com `|` e passados como `sck`:
```javascript
const sckParts = [utm_source, utm_medium, utm_campaign, utm_content, utm_term]
  .filter(Boolean)
  .join('|');
url.searchParams.set('sck', sckParts);
```

**Resultado:** `sck=MetaAds|audience-name|campaign-name|creative-name|keyword`

---

## API Serverless (`api/cpl-checkout.js`)

### Endpoint
`POST /api/cpl-checkout`

### Body (JSON)
```json
{
  "email": "user@email.com",
  "phone": "+5511999990001",
  "name": "Nome da Pessoa",
  "source": "form",
  "utm_source": "MetaAds",
  "utm_medium": "audience",
  "utm_campaign": "campaign",
  "utm_content": "creative",
  "utm_term": "keyword",
  "fbclid": "abc123",
  "gclid": "xyz789"
}
```

### Campo `source`
- `"form"` — usuario preencheu o formulario manualmente
- `"localStorage"` — auto-redirect (dados ja existiam)

Util pra diferenciar no banco quem realmente interagiu com a pagina vs quem foi redirecionado automaticamente.

### O que faz
1. Calcula o `evento` server-side usando `viradas_credenciamento` do config.json
2. Insere no Supabase (tabela `asl0226_cpl_checkout`)
3. Retorna `200 { success: true }`

### Env vars necessarias (Vercel)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Frontend (`src/PreCheckout.tsx`)

### Constantes a configurar
```typescript
const HOTMART_BASE_URL = 'https://pay.hotmart.com/PRODUCT_ID?off=OFFER_ID&checkoutMode=10';
const LEAD_TTL_MS = 3 * 24 * 60 * 60 * 1000;  // 3 dias
```

### Funcoes principais

#### `sendToAPI(data, source)`
Envia dados + UTMs pra `/api/cpl-checkout` via `sendBeacon`. Fallback: `fetch` com `keepalive: true`.

#### `buildHotmartUrl(data)`
Constroi URL da Hotmart com email, telefone (separado em DDD + numero), nome e UTMs no sck.

#### `getLeadData()` / `saveLeadData()`
Mesma logica do credenciamento — localStorage com TTL de 3 dias.

---

## Checklist para replicar em outro projeto

1. **Copiar arquivos:**
   - `src/PreCheckout.tsx`
   - `src/components/PhoneInput.tsx` (se nao tiver do credenciamento)
   - `api/cpl-checkout.js`

2. **CSS:** Mesmo do credenciamento (cores, gradient, animacao)

3. **Instalar dependencia:**
   ```bash
   npm install lucide-react
   ```

4. **Configurar:**
   - `HOTMART_BASE_URL` — link do produto + oferta na Hotmart com `checkoutMode=10`
   - Tabela do Supabase no `api/cpl-checkout.js` (ex: `asl0226_cpl_checkout`)
   - `config.json` com ciclos e viradas
   - Env vars no Vercel

5. **Rota:**
   ```tsx
   <Route path="/checkout" element={<PreCheckout />} />
   ```

6. **Imagens:** Mesmos backgrounds do credenciamento + logo

7. **Facebook Pixel:** Evento disparado eh `AddToCart` (nao `Lead`)

