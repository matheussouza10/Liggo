import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, TERMS_VERSION } from "@/lib/legal/version";

export const metadata: Metadata = {
  title: "Termos de uso | Liggo",
  description: "Condições para usar o Liggo.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="text-sm text-muted-foreground">
        Versão {TERMS_VERSION}. Atualizado em {LEGAL_UPDATED}.
      </p>
      <p>
        Estes termos valem para quem cria conta no Liggo, plataforma para
        organizar e acompanhar competições esportivas. Ao criar a conta ou
        aceitar um convite, você declara que leu e concorda com eles e com a{" "}
        <Link href="/privacy">política de privacidade</Link>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Liggo permite cadastrar eventos, regras, atletas, times e árbitros,
        receber inscrições, sortear fases, lançar resultados e lances, e
        divulgar a classificação e os jogos em páginas públicas.
      </p>

      <h2>2. Conta e organização</h2>
      <ul>
        <li>
          Quem cria a conta é o proprietário da organização e responde por ela.
          Ele pode convidar outras pessoas e definir seus papéis.
        </li>
        <li>
          Você deve informar dados verdadeiros e manter a senha em segredo. Tudo
          o que for feito com a sua conta é de sua responsabilidade.
        </li>
        <li>
          Avise-nos se suspeitar de uso indevido da conta. Podemos desativar
          contas para proteger o serviço e outras pessoas.
        </li>
      </ul>

      <h2>3. Dados que você cadastra</h2>
      <ul>
        <li>
          Você é responsável pelos dados de atletas, árbitros e demais pessoas
          que cadastrar, inclusive pela autorização para usá-los. No caso de
          menores de idade, é necessário o consentimento de um dos responsáveis.
        </li>
        <li>
          Ao divulgar um evento na página pública, nomes de equipes e de atletas
          citados nos lances ficam visíveis a qualquer pessoa. Você pode ocultar
          o evento a qualquer momento.
        </li>
        <li>
          Você não pode cadastrar conteúdo ilegal, ofensivo ou que viole
          direitos de terceiros.
        </li>
      </ul>

      <h2>4. Uso aceitável</h2>
      <p>
        É proibido tentar acessar dados de outras organizações, sobrecarregar o
        serviço, burlar limites e proteções, ou usar o Liggo para enviar
        mensagens indesejadas.
      </p>

      <h2>5. Planos e pagamento</h2>
      <p>
        As condições de planos, limites e eventual cobrança serão informadas
        antes de qualquer contratação paga. Nenhuma cobrança é feita sem o seu
        aceite.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas ele pode ficar indisponível
        por manutenção ou por falhas fora do nosso controle. Recomendamos
        exportar os dados importantes do seu evento.
      </p>

      <h2>7. Responsabilidade</h2>
      <p>
        O Liggo é uma ferramenta de organização. Os resultados, as regras
        aplicadas e as decisões de cada competição são de responsabilidade do
        organizador. Na medida permitida pela lei, não respondemos por danos
        indiretos decorrentes do uso do serviço.
      </p>

      <h2>8. Propriedade intelectual</h2>
      <p>
        A marca, o software e o conteúdo do Liggo pertencem a nós. Os dados que
        você cadastra continuam sendo seus.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Você pode parar de usar o serviço quando quiser e pedir a exclusão dos
        dados da sua organização. Podemos encerrar contas que violem estes
        termos.
      </p>

      <h2>10. Mudanças</h2>
      <p>
        Se estes termos mudarem de forma relevante, avisaremos pelo serviço ou
        por e-mail. Usar o Liggo depois do aviso significa concordar com a nova
        versão.
      </p>

      <h2>11. Contato e foro</h2>
      <p>
        Dúvidas ou pedidos: <strong>[e-mail de contato a definir]</strong>.
        Estes termos seguem a lei brasileira; o foro será definido na versão
        final.
      </p>
    </>
  );
}
