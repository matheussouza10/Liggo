# Regras da competição: especificação

## Problema
Um evento já tem tipo, formato e modalidade, mas não define COMO a competição funciona: pontos, desempate, W.O., confrontos e fases. Cada modalidade tem convenções próprias.

## Metas
- [ ] O organizador configura as regras do evento a partir de uma predefinição da modalidade e ajusta o que quiser.
- [ ] Regras são validadas no servidor e ficam guardadas de forma estruturada, prontas para o cálculo de classificação (feature 5).

## Fora de escopo
| Item | Motivo |
|---|---|
| Registrar partidas e placares, calcular classificação | Feature 5 |
| Inscrição de participantes | Feature 4 |
| Travamento automático após o 1º jogo | Depende das partidas |
| Administração de predefinições no admin | Predefinições ficam no código nesta versão |
| Fair play (cartões) como critério operacional | Exige ocorrências por jogo |

## Histórias

### P1: Configurar regras do evento ⭐
Como organizador, quero definir as regras do meu evento para que a competição siga o regulamento certo.

1. WHEN o organizador abre `Configurar regras` num evento THEN o sistema SHALL sugerir a predefinição da modalidade do evento e mostrar as regras atuais (ou as da predefinição, se ainda não houver).
2. WHEN escolhe outra predefinição THEN o sistema SHALL pedir confirmação e substituir os campos pelos valores dela.
3. WHEN edita pontuação THEN o sistema SHALL aceitar pontos de vitória, empate e derrota (inteiros de -10 a 100), se há empate, e a tabela de pontos por placar quando a predefinição tiver uma.
4. WHEN edita desempate THEN o sistema SHALL permitir adicionar, remover e reordenar critérios de um catálogo fechado, com escopo geral ou confronto direto, sem repetir o mesmo critério e escopo (máximo 12).
5. WHEN edita W.O. THEN o sistema SHALL aceitar o placar atribuído, os pontos de quem ganha e de quem dá W.O., o limite de W.O. que elimina (opcional) e se anula os resultados.
6. WHEN edita confrontos THEN o sistema SHALL aceitar jogo único, melhor de N (N ímpar de 3 a 9) ou ida e volta, e as opções de prorrogação, pênaltis e gol fora.
7. WHEN salva THEN o sistema SHALL validar tudo no servidor, mostrar erros junto aos campos e gravar as regras e as fases numa única transação.
8. WHEN o evento é de outra organização THEN o sistema SHALL responder 404.

### P1: Fases do evento ⭐
1. WHEN o organizador adiciona uma fase THEN o sistema SHALL pedir o tipo (pontos corridos, grupos, mata-mata, dupla eliminação, suíço, desempenho) e os parâmetros daquele tipo.
2. WHEN há mais de uma fase THEN o sistema SHALL permitir reordenar e remover, mantendo de 1 a 4 fases.
3. WHEN o tipo é grupos THEN o sistema SHALL exigir quantidade e tamanho dos grupos e quantos classificam por grupo, que não pode passar do tamanho.

### P2: Modalidades por sets e por desempenho
1. WHEN o modelo de placar é sets THEN o sistema SHALL pedir sets para vencer, pontos por set, pontos do set decisivo e diferença de 2.
2. WHEN é desempenho THEN o sistema SHALL pedir métrica, se vence o maior ou o menor valor, tentativas e a agregação, e opcionalmente pontos por posição e descarte do pior resultado.

### P2: Resumo no evento
1. WHEN o organizador abre o evento THEN o sistema SHALL mostrar um resumo das regras e das fases, ou um convite para configurá-las.

## Casos de borda
- Evento sem regras: o formulário abre com a predefinição sugerida, sem gravar nada até salvar.
- Modalidade sem predefinição específica: usar "Genérico (pontos)".
- Restrição de participação do formato do evento não muda; regras não alteram o evento.
- Valores fora de faixa, JSON adulterado ou critério fora do catálogo: recusar no servidor.

## Rastreabilidade
| ID | Requisito | Status |
|---|---|---|
| RUL-01 | Modelo de dados de regras e fases | Verificado |
| RUL-02 | Predefinições por modalidade (com fonte) | Verificado |
| RUL-03 | Validação no servidor (zod) | Verificado |
| RUL-04 | Salvar regras e fases em transação, isolado por organização | Verificado |
| RUL-05 | Editor: pontuação | Verificado |
| RUL-06 | Editor: desempate ordenável | Verificado |
| RUL-07 | Editor: W.O. | Verificado |
| RUL-08 | Editor: confrontos | Verificado |
| RUL-09 | Editor: fases | Verificado |
| RUL-10 | Sets e desempenho | Verificado |
| RUL-11 | Resumo no detalhe do evento | Verificado |
