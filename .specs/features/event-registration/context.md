# Decisões: inscrição no evento

Vem do que o usuário disse: o elenco NÃO fica no time; é escolhido na inscrição de cada evento (o mesmo atleta pode jogar uma competição e não outra). Hoje o organizador inscreve (fase de testes); depois será o próprio atleta ou quem inscreve o time.

Pedido do usuário nesta rodada: "Desenvolva tudo primeiro e commite depois". Sem novas perguntas; as decisões abaixo são padrões adotados e ajustáveis.

## Suposições (ajustáveis)

- B1 **Categorias** são por evento (`EventCategory`): nome, sexo (masculino, feminino, misto), idade mínima e máxima (calculada na data de início do evento), tamanho mínimo e máximo do elenco. Todo evento criado ganha a categoria "Geral" (mista, sem limites); eventos antigos criam as suas.
- B2 **Uma inscrição** liga o evento, uma categoria e, quando a participação é por equipe, um time da organização. Individual = 1 atleta, dupla = 2 atletas, equipe = o time com seu elenco.
- B3 **Unicidade:** um atleta só entra em uma inscrição por categoria; um time só se inscreve uma vez por categoria. Em categorias diferentes o mesmo atleta pode participar.
- B4 **Elegibilidade:** sexo e idade do atleta precisam caber na categoria. O servidor recusa quem não cabe.
- B5 Só atletas vinculados à organização e times ativos dela entram na inscrição.
- B6 **Posições** por modalidade são um cadastro do admin (`SportPosition`), com seed das modalidades mais comuns. Opcional na inscrição.
- B7 **Comissão técnica** é por inscrição (nome, função, contato), não um cadastro global.
- B8 Camisa 0 a 999, única dentro da inscrição; no máximo um capitão.
- B9 Sem status de aprovação nesta versão: a inscrição feita pelo organizador já vale. Remover = excluir a inscrição.
- B10 As regras do evento (pontuação, fases) continuam por evento, não por categoria.
