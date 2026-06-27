# Finanças do Casal

PWA de controle financeiro compartilhado para casais — lançamentos manuais, sincronização em tempo real via Firebase.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS 4
- Firebase Auth + Firestore (persistência offline)
- Recharts, React Hook Form + Zod
- PWA instalável (`vite-plugin-pwa`)

## Começar

```bash
cp .env.example .env   # preencha com as credenciais do Firebase
npm install
npm run dev
```

## Firebase — configuração inicial

1. No [Firebase Console](https://console.firebase.google.com), ative **Authentication** com E-mail/Senha e Google.
2. Crie um banco **Firestore** (modo produção).
3. Adicione `localhost` em **Authentication → Settings → Authorized domains**.
4. Faça deploy das regras:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npx firebase-tools deploy --only hosting` | Deploy no Firebase Hosting |

## Funcionalidades (Fases 0–4)

- Login com e-mail/senha e Google
- Criação/entrada em lar compartilhado (código de convite)
- Seed automático de categorias da planilha "Meu Bolso em Dia"
- Contas com saldo e transferências entre contas
- Lançamentos de entrada/saída (efetivados ou previstos)
- Cartões de crédito com faturas, parcelamento e pagamento de fatura
- Metas com progresso, reserva de emergência e orçamento por categoria
- Dashboard com saldo, entradas × saídas, pizza por categoria, faturas em aberto
- Filtros por período, categoria, conta, cartão e pessoa
- Painel mensal com "quanto sobra" e gráfico anual
- PWA instalável com cache offline do Firestore

## Próximas fases

Ver `plano-pwa-financas-casal.md` — recorrências, anexos, relatórios e exportação.
