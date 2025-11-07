# E-commerce Preto & Branco (PT-BR)

Repositório inicial com frontend React + backend Node/Express + MongoDB. Implementa autenticação JWT com cookie httpOnly, login via Google OAuth, painel admin e um fluxo de checkout com pagamento via PIX (integração mock Efí Bank) e webhook para confirmação.

## Estrutura
- `/server` - Backend Express, modelos Mongoose, rotas e webhook
- `/client` - Frontend React (Vite)
- `docker-compose.yml` - Mongo + server

## Como rodar (desenvolvimento)
1. Copie `.env.example` para `server/.env` e configure as variáveis (Google, SMTP, secrets).
2. No PowerShell:

```powershell
# Backend
cd .\server
npm install
npm run dev

# Frontend
cd ..\client
npm install
npm run dev
```

O backend roda por padrão na porta 4000 e o frontend em 5173 (Vite).

### Integração Efí Bank (produção)

- Configure `EFI_API_KEY` e `EFI_API_BASE` no `server/.env` com as credenciais fornecidas pela Efí Bank.
- Quando `EFI_API_KEY` estiver presente, o fluxo de `POST /api/checkout/create` tentará criar o pagamento via Efí Bank. O webhook deve apontar para `/api/webhook/efi/pix` e o `EFI_WEBHOOK_SECRET` (se fornecido) deve ser usado para verificar assinaturas no servidor.

Nota: a verificação da assinatura do webhook depende da especificação da Efí Bank. Implemente a verificação dentro de `server/src/services/efiBank.js` quando receber o método/algoritmo de assinatura.

### Upload de imagens (S3 presigned)

- Configure as variáveis `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `S3_BUCKET` no `server/.env`.
- Endpoint disponível: `GET /api/uploads/presign?key=products/filename.jpg&contentType=image/jpeg` — retorna URL presignada para fazer PUT direto no S3.
- A UI/cliente deve enviar o arquivo com PUT para a URL retornada e então salvar a `key`/URL no campo `images` do produto (ex.: `https://{S3_BUCKET}.s3.amazonaws.com/{key}`).

Também é suportado Cloudinary via `CLOUDINARY_URL` (integração cliente-side não incluída neste scaffold). Veja `server/.env.example`.

## Endpoints principais
- `POST /api/auth/register` - registro (email+senha)
- `POST /api/auth/login` - login
- `GET /api/auth/google` - OAuth Google
- `GET /api/products` - lista produtos
- `POST /api/products` - criar produto (admin)
- `POST /api/checkout/create` - criar pedido e gerar PIX
- `POST /api/webhook/efi/pix` - webhook de confirmação PIX
- `GET /api/admin/orders` - lista pedidos (admin)
- `PUT /api/admin/orders/:id/status` - atualizar status (admin)

## Banco de dados (MongoDB)
Banco de dados: Supabase (Postgres)

Modelos principais (tabelas recomendadas para criar no Supabase/Postgres):

-- users
CREATE TABLE public.users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text,
	email text UNIQUE,
	password_hash text,
	google_id text,
	role text DEFAULT 'user',
	created_at timestamptz DEFAULT now()
);

-- products
CREATE TABLE public.products (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	title text NOT NULL,
	description text,
	price_cents integer NOT NULL,
	stock integer DEFAULT 0,
	images jsonb,
	created_at timestamptz DEFAULT now()
);

-- coupons
CREATE TABLE public.coupons (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	code text UNIQUE NOT NULL,
	type text NOT NULL,
	value integer NOT NULL,
	valid_until timestamptz,
	max_uses integer,
	used integer DEFAULT 0
);

-- orders
CREATE TABLE public.orders (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES public.users(id),
	items jsonb,
	address jsonb,
	total_cents integer,
	shipping_cents integer DEFAULT 0,
	coupon_applied jsonb,
	payment jsonb,
	status text DEFAULT 'pedido feito',
	eta timestamptz,
	created_at timestamptz DEFAULT now()
);

As rotas do backend usam o cliente Supabase (`@supabase/supabase-js`). Configure `SUPABASE_URL` e `SUPABASE_KEY` no arquivo `server/.env`.

## Segurança
- JWT assinado com `JWT_SECRET`, enviado em cookie httpOnly e também suportado via Authorization header.
- Google OAuth com `passport-google-oauth20`.

## Emails
Templates em `server/emails`. Envio via SMTP configurado com variáveis de ambiente.

## Docker
`docker-compose.yml` traz Mongo e server. Para rodar:

```powershell
docker-compose up --build
```

## Testes
No backend:

```powershell
cd server
npm test
```
Nota: os testes E2E usam um banco em memória (`mongodb-memory-server`). Para rodar localmente, instale dependências (incl. `mongodb-memory-server`) antes de executar `npm test`.

## Checklist QA (básico)
1. Registro/login (email) — campos obrigatórios, mensagens de erro.
2. Login via Google — redirecionamento e cookie criado.
3. CRUD produtos (admin) — verificar limite de 5 imagens.
4. Carrinho — marcar itens (checkbox) e remover/descontar quantidade.
5. Checkout — apenas itens marcados são enviados; endereço salvo no pedido.
6. Gerar PIX — payload retornado com pixId, qr e valor correto.
7. Webhook — POST para `/api/webhook/efi/pix` atualiza `payment.status` e envia email ao admin.
8. Painel admin — listar pedidos, atualizar status e definir ETA.
9. Segurança — cookies httpOnly; rotas admin protegidas.
10. Acessibilidade — navegação por teclado e contraste (preto/branco).

Fluxo adicional:
- O endpoint `POST /api/checkout/create` agora valida estoque e *reserva* quantidades (decrementa `Product.stock`) no momento da criação do pedido. Se o pagamento for cancelado, o webhook RESTAURA o estoque automaticamente.
- Adição de aplicação de cupons: envie `coupon` no body do `checkout/create` (ex.: { coupon: 'PROMO10' }) para aplicar desconto. Model `Coupon` suporta `percent` e `fixed`.
- Frete: configurável via `SHIPPING_FLAT_CENTS` e `FREE_SHIPPING_OVER_CENTS` no `.env`.
## Próximos passos sugeridos
- Implementar upload de imagens (S3 ou similar)
- Implementar verificação de estoque ao criar pedido
- Implementar aplicação de cupons e cálculo de frete
- Testes E2E e mais validações de input

