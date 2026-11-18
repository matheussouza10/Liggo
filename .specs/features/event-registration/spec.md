# Inscrição no evento: especificação

## Problema
O evento existe, as regras também, e há atletas e times. Falta inscrever participantes: que time joga, com qual elenco, em qual categoria, com qual comissão técnica.

## Fora de escopo
Aprovação de inscrições, pagamento e taxas, documentos do atleta, login do atleta e auto-inscrição, sorteio e chaveamento (calendário e partidas), regras por categoria.

## Histórias

### P1: Categorias do evento ⭐
1. WHEN um evento é criado THEN o sistema SHALL criar a categoria "Geral" (mista, sem limites).
2. WHEN o organizador abre as categorias do evento THEN o sistema SHALL listar, criar, editar e excluir categorias com nome, sexo, idade mínima e máxima e tamanho do elenco.
3. WHEN o nome repete (ignorando caixa e acento) THEN o sistema SHALL recusar.
4. WHEN a idade mínima passa da máxima, ou o elenco mínimo passa do máximo THEN o sistema SHALL recusar.
5. WHEN a categoria tem inscrições THEN o sistema SHALL impedir a exclusão.

### P1: Posições por modalidade ⭐
1. WHEN o admin abre Posições THEN o sistema SHALL listar as posições da modalidade escolhida, com criar, editar e desativar.
2. WHEN o seed roda THEN o sistema SHALL criar posições para futebol, futsal, basquete, vôlei e handebol sem duplicar.

### P1: Inscrever participantes ⭐
1. WHEN o organizador abre Inscrições THEN o sistema SHALL listar as inscrições agrupadas por categoria, com time ou nome, tamanho do elenco e comissão.
2. WHEN a participação do evento é por equipe THEN o sistema SHALL exigir um time ativo da organização; individual exige 1 atleta e dupla exige 2.
3. WHEN o organizador adiciona atletas THEN o sistema SHALL oferecer só os vinculados à organização, indicando quem está fora da categoria (sexo ou idade) ou já inscrito nela.
4. WHEN envia THEN o sistema SHALL validar no servidor: elegibilidade, unicidade por categoria, tamanho do elenco, camisa única, no máximo um capitão, posição da modalidade do evento.
5. WHEN salva THEN o sistema SHALL gravar a inscrição, o elenco e a comissão técnica numa transação.
6. WHEN edita ou exclui uma inscrição THEN o sistema SHALL aplicar as mesmas validações e, ao excluir, liberar os atletas e o time.
7. WHEN o evento é de outra organização THEN o sistema SHALL responder 404.

### P2: Resumo no evento
WHEN o organizador abre o evento THEN o sistema SHALL mostrar quantas categorias e inscrições existem, com atalhos.

## Rastreabilidade
| ID | Requisito | Status |
|---|---|---|
| REG-01 | Modelo: categoria, inscrição, elenco, comissão, posição | Pendente |
| REG-02 | Categoria padrão ao criar evento | Pendente |
| REG-03 | CRUD de categorias com validações | Pendente |
| REG-04 | Posições: seed e admin | Pendente |
| REG-05 | Regras de inscrição por tipo de participação | Pendente |
| REG-06 | Elegibilidade (sexo e idade) | Pendente |
| REG-07 | Unicidade por categoria | Pendente |
| REG-08 | Elenco: camisa, capitão, posição | Pendente |
| REG-09 | Comissão técnica | Pendente |
| REG-10 | Editar e excluir inscrição | Pendente |
| REG-11 | Isolamento entre organizações | Pendente |
| REG-12 | Resumo no evento | Pendente |
