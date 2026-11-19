# Jogo ao vivo, página pública, painel e chaveamento: especificação

## Pedido
1. Ver o chaveamento do mata-mata.
2. Preencher a home do sistema (painel), hoje em branco.
3. Registrar lances nos jogos: início, fim, gols, cartões, substituições, lances importantes e outros.
4. Tela pública, sem login, que lista eventos e jogos em andamento e deixa acompanhar o jogo em tempo real conforme o organizador lança os lances.

## Decisões
| # | Decisão |
|---|---|
| L1 | Um jogo está "ao vivo" quando foi iniciado (`startedAt`) e ainda não tem resultado final. O placar ao vivo é guardado no jogo (`liveHome`, `liveAway`) e muda com os lances de gol; o resultado oficial continua sendo o fluxo de resultado já existente. |
| L2 | Lances: início, início e fim de período, fim de jogo, gol (com valor, para modalidades de 1, 2 ou 3 pontos), gol contra, pênalti perdido, cartão amarelo, cartão vermelho, substituição, tempo técnico, lesão e lance importante (texto livre). Cada lance tem minuto, lado, atleta e, quando faz sentido, um segundo atleta (assistência, ou quem entra). |
| L3 | O atleta do lance precisa estar no elenco inscrito daquele lado. Excluir um lance de gol desfaz o placar. Só lances de jogos ao vivo podem ser lançados ou excluídos. |
| L4 | "Encerrar jogo" abre o resultado já existente com o placar ao vivo preenchido; salvar encerra o jogo e registra o "Fim de jogo". |
| L5 | Tempo real por consulta a cada 3 segundos (rota JSON pública, curta em cache), pausada quando a aba fica escondida. Sem WebSocket nesta versão. |
| L6 | Páginas públicas em `/watch`. Cada evento tem a opção "divulgar publicamente" (ligada por padrão). Evento oculto não aparece em lugar nenhum público e responde 404. Só nomes de equipes e de atletas dos lances aparecem; nenhum dado de contato. |
| L7 | O chaveamento junta as rodadas de mata-mata do evento (mesmo em fases separadas: Quartas, Semi e Final) numa árvore com ligações, com colunas ainda sem jogo mostradas como "A definir". |
| L8 | O painel mostra números da organização, jogos ao vivo, próximos jogos, resultados recentes e eventos com o andamento das fases. |

## Fora de escopo agora
Relógio automático de cronômetro, edição de lance (só excluir e lançar de novo), estatísticas por atleta, notificações push, comentários do público.

## Estatísticas (acréscimo)
| # | Decisão |
|---|---|
| L9 | Novo lance "Falta". A posse de bola é um número por jogo (porcentagem do mandante, o visitante é o resto), informado pelo organizador durante ou depois do jogo. |
| L10 | Por jogo: comparação entre os times (gols, faltas, amarelos, vermelhos, substituições), barra de posse e linha do tempo dos lances por minuto. Aparece no organizador e na página pública, e atualiza ao vivo. |
| L11 | Geral por evento e categoria: artilharia, assistências, cartões por time e por atleta, faltas por time e posse média, em `/events/[id]/stats` e `/watch/events/[id]/stats`. Gols sem autor entram no total, não no ranking. |
| L12 | Cores validadas com o script de paleta no fundo escuro: times azul `#3987e5` e laranja `#d95926`; cartões amarelo `#c98500` e vermelho `#c0392b` (o par amarelo e vermelho padrão da paleta falhava no piso de visão normal). Barras finas, valor na ponta, legenda e dica ao passar o mouse ou focar; a lista é a visão em tabela. |

