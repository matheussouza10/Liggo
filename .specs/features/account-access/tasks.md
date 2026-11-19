# Conta e acesso: tarefas

| ID | Tarefa |
|---|---|
| C1 | Schema e migração: desativação, aceite dos termos, tokens de senha, convites, caixa de saída, tentativas |
| C2 | Bibliotecas: política de senha, tokens, e-mail (SMTP e caixa de saída), limite de tentativas, com testes |
| C3 | Esqueci a senha e redefinição |
| C4 | Termos e privacidade, aceite no cadastro |
| C5 | Login: conta desativada, limite de tentativas, aviso de senha alterada |
| C6 | Configurações: perfil, segurança, organização |
| C7 | Equipe e convites |
| C8 | Verificação Playwright, lint, build, docs e memória |

Status: C1 a C8 concluídas. Verificação: 10 casos de lógica (política de senha, escolha do envio de e-mail) e 66 checagens Playwright (termos e privacidade públicos, recuperação de senha com e-mail, link de uso único e vencido, limite de pedidos, desconexão dos outros aparelhos, limite de tentativas de login, perfil, troca de senha, sair de todos os aparelhos, organização, convites com aceite, reenvio, cancelamento e vencimento, papéis, proteção do último proprietário, desativar e reativar). Regressão: pessoas 48, inscrições 23, regras 34, fases 45, confrontos 23. Lint e build passam.

Pendências deste bloco: servidor SMTP real (o envio usa a caixa de saída em desenvolvimento), revisão jurídica dos textos de termos e privacidade, troca de e-mail e verificação de e-mail, autenticação em dois fatores.

