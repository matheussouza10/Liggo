# Conta e acesso: especificação

## Problema
Para ter cliente de verdade faltam: recuperar a senha, termos e privacidade, convidar outras pessoas para a organização e uma tela de configurações (perfil, senha, organização, equipe).

## Decisões
| # | Decisão |
|---|---|
| A1 | E-mail por SMTP (nodemailer), configurado por variáveis `SMTP_*`. Sem SMTP em desenvolvimento, a mensagem vai para uma caixa de saída no banco (`outbound_emails`) e para o console. Em produção sem SMTP o envio falha de forma explícita, nunca em silêncio. |
| A2 | Recuperação de senha: link de uso único, válido por 1 hora, só o hash (SHA-256) fica guardado. O pedido responde sempre a mesma mensagem, exista ou não a conta. Limite de 1 pedido por minuto e 3 por hora por e-mail. Redefinir encerra todas as sessões da pessoa. |
| A3 | Termos de uso e política de privacidade em `/terms` e `/privacy`, com versão. O aceite (data e versão) é gravado no cadastro e no convite. O texto é um rascunho para revisão jurídica, não é parecer legal. |
| A4 | Papéis: `OWNER` gerencia equipe, convites e dados da organização; `MEMBER` opera eventos, inscrições e jogos. Sempre existe ao menos um proprietário ativo. |
| A5 | Uma pessoa pertence a uma organização (modelo atual). Convidar um e-mail que já tem conta é recusado com explicação. |
| A6 | Pessoas são desativadas, nunca apagadas: eventos, inscrições e lances referenciam quem os criou. Desativar encerra as sessões e bloqueia o login. |
| A7 | Login com limite: 5 falhas em 15 minutos por e-mail bloqueiam novas tentativas por um tempo. |
| A8 | Política de senha única (8 a 200 caracteres) usada no cadastro, redefinição, convite e troca. |
| A9 | Fora deste bloco: trocar o e-mail da conta, verificação de e-mail, autenticação em dois fatores, login social. |

## Histórias
1. Esqueci a senha: peço o link, recebo por e-mail, crio a nova senha e entro.
2. Leio os termos e a política antes de criar a conta; o aceite fica registrado.
3. Em Configurações edito meu nome, troco a senha (e saio dos outros aparelhos) e, como proprietário, edito o nome da organização.
4. Como proprietário convido pessoas por e-mail, escolho o papel, reenvio ou cancelo convites, mudo papéis e desativo ou reativo pessoas.
5. Quem recebe o convite cria a conta pelo link, já dentro da organização.
