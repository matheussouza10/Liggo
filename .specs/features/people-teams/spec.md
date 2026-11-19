# Atletas, times e árbitros: especificação

## Problema
Para inscrever participantes em eventos, o organizador precisa de cadastros de pessoas e times. O atleta pertence a todas as organizações (a mesma pessoa joga no SESI e no SESC), o time pertence a uma organização e o árbitro é um cadastro à parte.

## Fora de escopo
| Item | Motivo |
|---|---|
| Inscrição em evento e elenco por evento | Próximo bloco (depende de categorias) |
| Posições por modalidade, número de camisa | Fazem parte do elenco da inscrição |
| Login do atleta e auto-cadastro | Depois da fase de testes |
| Documentos (atestado, autorização de menores) | Mais adiante |
| Foto do atleta, endereço | Escolheu dados básicos |
| Categorias e divisões do evento | Bloco seguinte |

## Histórias

### P1: Cadastro global de atletas ⭐
1. WHEN o organizador abre Atletas THEN o sistema SHALL listar só os atletas vinculados à sua organização, com busca por nome, CPF mascarado, idade e sexo.
2. WHEN cadastra um atleta com dados válidos THEN o sistema SHALL criar o atleta e vinculá-lo à organização.
3. WHEN o CPF informado já existe e ainda não está vinculado THEN o sistema SHALL mostrar só o nome abreviado e perguntar se quer usar esse cadastro; ao confirmar, vincula sem copiar nem alterar dados.
4. WHEN o CPF já está vinculado à organização THEN o sistema SHALL avisar e levar ao cadastro existente.
5. WHEN o CPF é inválido (dígitos verificadores) THEN o sistema SHALL recusar no campo.
6. WHEN o atleta tem menos de 18 anos THEN o sistema SHALL exigir nome e CPF do responsável e aceitar atleta sem CPF.
7. WHEN a organização criadora edita THEN o sistema SHALL atualizar; WHEN outra organização abre THEN o sistema SHALL mostrar somente leitura.
8. WHEN pede o atleta de uma organização à qual não está vinculado THEN o sistema SHALL responder 404.

### P1: Times da organização ⭐
1. WHEN abre Times THEN o sistema SHALL listar os times da organização, com busca e estado ativo.
2. WHEN cria ou edita um time THEN o sistema SHALL exigir nome (único na organização, sem diferenciar caixa) e aceitar sigla, cidade, UF e cor.
3. WHEN desativa um time THEN o sistema SHALL mantê-lo no cadastro, fora das escolhas futuras.
4. WHEN pede o time de outra organização THEN o sistema SHALL responder 404.

### P1: Árbitros e juízes ⭐
1. WHEN abre Árbitros THEN o sistema SHALL listar os da organização com função, modalidades e estado.
2. WHEN cria ou edita THEN o sistema SHALL exigir nome e função, e aceitar CPF (válido, opcional), e-mail, telefone, licença e entidade, e uma ou mais modalidades.
3. WHEN desativa THEN o sistema SHALL mantê-lo no cadastro.
4. WHEN pede o árbitro de outra organização THEN o sistema SHALL responder 404.

### P2: Navegação
WHEN o organizador vê a sidebar THEN o sistema SHALL mostrar Atletas, Times e Árbitros no lugar de "Participantes".

## Casos de borda
- CPF com máscara, pontos ou espaços: aceitar e normalizar para dígitos.
- Nascimento no futuro ou há mais de 120 anos: recusar.
- Mesmo CPF digitado por duas organizações ao mesmo tempo: a segunda vincula (corrida resolvida pela unicidade do banco).
- Time com nome repetido só difere em caixa ou espaços: recusar.

## Rastreabilidade
| ID | Requisito | Status |
|---|---|---|
| PER-01 | Modelo: Athlete, OrganizationAthlete, Team, Referee, RefereeSport | Verificado |
| PER-02 | CPF: validação, normalização e máscara | Verificado |
| PER-03 | Listar atletas da organização | Verificado |
| PER-04 | Criar atleta, vínculo por CPF existente sem expor dados | Verificado |
| PER-05 | Menores com responsável | Verificado |
| PER-06 | Edição só pela organização criadora | Verificado |
| PER-07 | Isolamento entre organizações | Verificado |
| PER-08 | Times: criar, editar, desativar | Verificado |
| PER-09 | Árbitros: criar, editar, desativar, modalidades | Verificado |
| PER-10 | Navegação | Verificado |

## Histórico do atleta (acréscimo)
- Página `/athletes/[id]/history`, ligada à página do atleta por "Dados" e "Histórico".
- Mostra só os eventos da organização de quem olha (o atleta é compartilhado entre organizações, o histórico não vaza).
- Por participação: evento, modalidade, categoria, time, camisa, posição, capitão, como o time terminou (campeão, vice, 3º, eliminado em tal fase, em andamento), a campanha do time e o desempenho do atleta (gols ou pontos, assistências, amarelos, vermelhos, faltas, jogos com lance).
- Resumo geral, gráfico de gols por evento e aviso de que os números vêm dos lances lançados pelo organizador (a escalação por jogo não é registrada, então não se afirma quantos jogos o atleta disputou).

