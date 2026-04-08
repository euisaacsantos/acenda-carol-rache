# Rastreamento URL Params → Hotmart (sck)

## Problema

A Hotmart nao aceita UTMs tradicionais (`utm_source`, `utm_medium`, etc.) nos links de checkout. O unico parametro de tracking aceito eh o `sck` (source key).

## Solucao

Capturar TODOS os parametros da URL da landing page e injetar no link de checkout como `?sck=` com chaves nomeadas.

## Formato do sck

```
sck=chave:valor|chave:valor|chave:valor
```

- Separador entre parametros: `|` (pipe)
- Separador chave/valor: `:` (dois pontos)
- Apenas parametros com valor sao incluidos (sem chaves vazias)
- Caracteres `|` e `:` dentro dos valores sao substituidos por `-`
- O valor final eh URL-encoded via `encodeURIComponent()`

### Exemplos

URL da landing page:
```
https://site.com/oferta?utm_source=MetaAds&utm_campaign=captacao&fbclid=abc123&ab_group=A
```

Valor decodificado do sck:
```
utm_source:MetaAds|utm_campaign:captacao|fbclid:abc123|ab_group:A
```

Se vier apenas `utm_term`:
```
sck=utm_term:Instagram_Reels
```

## Codigo (copiar e colar)

Inserir antes dos event listeners de checkout, dentro da tag `<script>` principal:

```javascript
// ── URL params → sck no checkout Hotmart ──
(function() {
    var params = new URLSearchParams(window.location.search);
    var parts = [];
    params.forEach(function(val, key) {
        if (val) parts.push(key + ':' + val.replace(/[|:]/g, '-'));
    });
    if (parts.length) {
        var sck = encodeURIComponent(parts.join('|'));
        document.querySelectorAll('a[href*="SEU-SELETOR-CHECKOUT"]').forEach(function(link) {
            var href = link.getAttribute('href');
            link.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + 'sck=' + sck);
        });
    }
})();
```

### Adaptacao por projeto

Trocar `SEU-SELETOR-CHECKOUT` pelo trecho do href dos botoes de checkout. Exemplos:

| Projeto | Seletor |
|---------|---------|
| Jornada Protocolo | `checkout-site-protocolo` |
| Imersao Nova Voce | `checkout-imersao` |

## Requisito importante

O link de checkout (ou shortlink) precisa repassar query params para a Hotmart. Testar antes de ir pro ar:

1. Acessar `https://seu-shortlink.com/checkout?sck=teste123`
2. Verificar se o checkout da Hotmart recebe o `sck=teste123`
3. Se nao repassar, usar o link direto da Hotmart no href

## Como ler o sck na Hotmart

No painel da Hotmart, o campo `sck` aparece nos relatorios de vendas. Para decodificar:

```
utm_source:MetaAds|utm_campaign:captacao|fbclid:abc123 → { utm_source: "MetaAds", utm_campaign: "captacao", fbclid: "abc123" }
```

Parsing em JS (se necessario):
```javascript
var sck = "utm_source:MetaAds|utm_campaign:captacao|fbclid:abc123";
var parsed = {};
sck.split('|').forEach(function(part) {
    var kv = part.split(':');
    parsed[kv[0]] = kv[1];
});
// parsed = { utm_source: "MetaAds", utm_campaign: "captacao", fbclid: "abc123" }
```
