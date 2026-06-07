# AB Concurso Quiz Funnel

Protótipo de quiz funnel conversacional para vender a apostila de **Informática para Concursos** via Instagram.

## Objetivo

Conduzir o lead que chega pelo comentário/palavra-chave `CONCURSO` por uma conversa guiada:

1. identifica situação do candidato;
2. pergunta banca;
3. pergunta dificuldade principal;
4. identifica nível;
5. identifica urgência;
6. gera diagnóstico curto;
7. envia link rastreado de checkout.

A regra do projeto é: **responder curto, voltar para o funil e conduzir para o checkout**.

## Stack

- Node.js
- Express
- PostgreSQL no Railway
- Deploy no Railway
- Checkout externo, inicialmente Kiwify
- Integração futura com Instagram e webhook de compra

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Teste:

```bash
curl http://localhost:3000/health
```

## Rotas principais

### Saúde

```http
GET /health
```

### Iniciar funil

```http
POST /funnel/start
Content-Type: application/json

{
  "instagramUserId": "123456",
  "username": "lead_teste",
  "keyword": "CONCURSO",
  "source": "instagram_comment"
}
```

### Enviar resposta do lead

```http
POST /funnel/message
Content-Type: application/json

{
  "instagramUserId": "123456",
  "username": "lead_teste",
  "text": "FGV"
}
```

### Link rastreado de checkout

```http
GET /c/concurso/:leadToken
```

Registra o clique e redireciona para `CHECKOUT_CONCURSO_URL`.

## Deploy no Railway

1. Criar novo projeto no Railway.
2. Conectar este repositório GitHub.
3. Adicionar PostgreSQL.
4. Configurar variáveis de ambiente.
5. Executar `npm run db:migrate` uma vez para criar as tabelas.
6. Validar `/health`.

## Variáveis de ambiente

Veja `.env.example`.

## Próximas fases

- integração com projeto atual do Instagram;
- webhook de venda aprovada;
- prova social dinâmica;
- painel administrativo;
- recuperação de checkout não pago;
- funis para novos produtos.
