# Inscrição pública com aprovação: especificação

## Problema
Hoje só o organizador inscreve times e atletas. Falta um link público para o time ou o atleta pedir a inscrição sem conta, e uma fila para o organizador conferir, ajustar, aprovar ou recusar.

## Decisões
| # | Decisão |
|---|---|
| R1 | Cada evento tem "inscrições abertas" (liga e desliga), prazo opcional e instruções. O link é `/register/[id]`. Funciona mesmo com o evento oculto ao público, porque quem recebe o link foi escolhido pelo organizador; mostra só nome, modalidade, datas, local e categorias. |
| R2 | A pessoa não tem conta. Informa contato, categoria e os dados do time e dos atletas (conforme o tipo de participação do evento: equipe, dupla ou individual), com as mesmas regras do cadastro de atletas (adulto com CPF, menor com responsável). Marca a declaração de autorização e a ciência da política de privacidade. |
| R3 | Nada entra no evento sozinho: a solicitação fica PENDENTE. Aprovar cria time, atletas (ou vincula pelo CPF) e a inscrição, seguindo as regras de elegibilidade (sexo, idade na data de início, elenco mínimo e máximo, um atleta e um time por categoria). |
| R4 | O organizador vê os problemas antes de aprovar e pode trocar a categoria ou remover um atleta da solicitação. Recusar pede o motivo. |
| R5 | CPF já cadastrado no sistema vincula o atleta existente sem copiar dados; se a data de nascimento informada não bate, a aprovação é bloqueada para o organizador conferir. |
| R6 | Quem solicita recebe e-mails (recebida, aprovada, recusada) e uma página de acompanhamento por link com chave secreta, onde também pode cancelar enquanto pendente. Os proprietários recebem aviso de nova solicitação. |
| R7 | Proteção do formulário aberto: campo isca, limite de envios por origem e por e-mail, limites de tamanho e de quantidade, e uma solicitação pendente por e-mail e categoria. |
| R8 | Privacidade: ao recusar ou cancelar, CPFs, e-mails e telefones dos atletas da solicitação são apagados. Os dados só viram cadastro de atleta se a solicitação for aprovada. |
| R9 | Fora desta versão: taxa e pagamento, documentos do atleta, edição da solicitação pelo solicitante, confirmação do e-mail do solicitante, CAPTCHA. |

## Histórias
1. Como organizador abro as inscrições, defino prazo e instruções e copio o link.
2. Como time ou atleta preencho o formulário público e acompanho o andamento.
3. Como organizador reviso a fila, ajusto, aprovo ou recuso, e o resultado vira inscrição normal do evento.
