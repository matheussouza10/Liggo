# Decisões: atletas, times e árbitros

Decisões do usuário (rodada de 2026-11-18):

| Tema | Decisão |
|---|---|
| Identidade do atleta | **CPF único**; ao cadastrar um CPF que já existe, reaproveita o cadastro |
| Escopo do time | **Da organização** (não é global) |
| Dados do atleta | **Básicos**: nome, nascimento, sexo, CPF, e-mail, telefone; menor de idade com responsável |
| Árbitro | **Cadastro separado** do atleta |
| Elenco | **Não fica no time**: é escolhido na INSCRIÇÃO em cada evento (próximo bloco) |

Do enunciado do usuário: o atleta circula entre organizações (ex.: SESI e SESC). Hoje o organizador pode cadastrar atletas (fase de testes); no futuro só o próprio atleta ou quem inscreve o time.

## Suposições minhas (ajustáveis)

- A1 O atleta é global; cada organização tem uma lista própria de atletas vinculados (`OrganizationAthlete`). Uma organização só vê atletas vinculados a ela.
- A2 Reaproveitar um CPF existente NÃO copia nem expõe os dados: o sistema mostra só nome abreviado ("Matheus S.") e oferece vincular. Quem digita o CPF correto prova que conhece a pessoa; mesmo assim é um ponto de atenção de LGPD.
- A3 Só a organização que criou o atleta pode editá-lo, e enquanto ele não tiver conta própria (`userId` vazio). Os outros veem sem editar, para uma organização não alterar dados de uma pessoa que outra cadastrou.
- A4 CPF obrigatório para maiores; menores podem ficar sem CPF, mas precisam de nome e CPF do responsável.
- A5 Árbitro é por organização (pode virar global depois). Funções: árbitro, juiz, auxiliar, mesário. Modalidades em que atua: lista de modalidades do catálogo.
- A6 Time e árbitro são desativados, nunca apagados (a inscrição vai referenciar o time).
- A7 CPF é guardado só com dígitos e mostrado mascarado nas listas.
