# Contas do Newfire (Vercel)

O cadastro usa somente nome de usuário e senha. A API está nas Vercel Functions em `api/auth/`; os dados ficam no Postgres Neon conectado ao projeto Newfire (`newfire-ten.vercel.app`).

## Configuração necessária

1. No Vercel Marketplace, instale a integração Neon **Vercel-Managed** e selecione o time do projeto.
2. Escolha o plano desejado, conecte o recurso ao projeto Newfire e inclua o ambiente Production. Não ative um plano pago sem autorização.
3. A integração deve fornecer `DATABASE_URL` ao deployment. Nunca copie esse valor para o repositório, HTML, logs ou conversa.
4. Implante o código no Vercel. As tabelas `newfire_users`, `newfire_sessions` e `newfire_saves` são criadas de forma idempotente pela API quando ela recebe a primeira chamada.

A opção de Auth do Neon não é necessária: o jogo mantém o fluxo próprio solicitado, com nome de usuário e senha. A API lê `DATABASE_URL`. Não é preciso rodar comandos SQL manualmente.

## Segurança e comportamento

- As senhas são armazenadas como hash `scrypt` com salt individual; nenhuma senha em texto puro é gravada.
- A sessão usa cookie `HttpOnly` e `SameSite=None; Secure` em HTTPS (compatível com Preview incorporado), ou `SameSite=Lax` em HTTP local e token aleatório com validade de 30 dias. O banco guarda apenas o hash do token.
- O progresso do jogo fica associado ao ID da conta no servidor e é sincronizado após alterações.
- O progresso legado de `localStorage` só é importado após uma confirmação explícita no aparelho.
- Como o cadastro não solicita e-mail, não há recuperação automática de senha. Se a pessoa esquecer a senha, será necessário um processo administrativo de redefinição.
