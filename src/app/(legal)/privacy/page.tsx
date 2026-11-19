import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, TERMS_VERSION } from "@/lib/legal/version";

export const metadata: Metadata = {
  title: "Política de privacidade | Liggo",
  description: "Como o Liggo trata dados pessoais.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted-foreground">
        Versão {TERMS_VERSION}. Atualizado em {LEGAL_UPDATED}.
      </p>
      <p>
        Explicamos aqui quais dados pessoais o Liggo trata, para quê, com quem
        compartilha e quais são os seus direitos, conforme a Lei Geral de
        Proteção de Dados (LGPD, Lei 13.709/2018). Veja também os{" "}
        <Link href="/terms">termos de uso</Link>.
      </p>

      <h2>1. Quem é quem</h2>
      <ul>
        <li>
          <strong>Dados da conta</strong> (quem usa o Liggo): o Liggo é o
          controlador.
        </li>
        <li>
          <strong>Dados de atletas, árbitros e inscrições</strong> cadastrados
          por uma organização: a organização é a controladora e o Liggo trata
          esses dados em nome dela, como operador.
        </li>
      </ul>

      <h2>2. Dados que tratamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome, e-mail, senha (guardada apenas de forma
          criptografada), papel na organização e a data do aceite dos termos.
        </li>
        <li>
          <strong>Atletas:</strong> nome, data de nascimento, sexo, CPF (quando
          houver), e-mail e telefone (opcionais) e, para menores, o nome e o CPF
          do responsável.
        </li>
        <li>
          <strong>Competição:</strong> inscrições, elenco, resultados, lances
          (gols, cartões, faltas, substituições) e estatísticas.
        </li>
        <li>
          <strong>Segurança:</strong> sessões de acesso, tentativas de entrada e
          pedidos de recuperação de senha, para proteger as contas.
        </li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>
          Operar o serviço: autenticar, organizar competições e calcular
          classificações e estatísticas.
        </li>
        <li>
          Enviar e-mails do serviço, como recuperação de senha e convites.
        </li>
        <li>Proteger contas e prevenir abusos.</li>
        <li>Cumprir obrigações legais.</li>
      </ul>

      <h2>4. Páginas públicas</h2>
      <p>
        Quando a organização divulga um evento, qualquer pessoa pode ver os
        jogos, resultados, classificação, estatísticas e os nomes de equipes e
        de atletas que aparecem nos lances. Não exibimos CPF, e-mail, telefone
        nem data de nascimento. A organização pode ocultar o evento quando
        quiser.
      </p>

      <h2>5. Compartilhamento</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos apenas com prestadores que
        nos ajudam a operar o serviço (hospedagem e envio de e-mail), sob
        contrato, ou quando a lei exigir.
      </p>

      <h2>6. Menores de idade</h2>
      <p>
        Atletas menores só devem ser cadastrados com o consentimento específico
        de um dos pais ou responsáveis, de responsabilidade da organização.
        Pedimos o responsável no cadastro do menor.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta ou o evento existirem e pelo tempo
        exigido por lei. Ao pedir a exclusão, apagamos ou anonimizamos o que não
        precisarmos guardar.
      </p>

      <h2>8. Seus direitos</h2>
      <p>
        Você pode pedir confirmação do tratamento, acesso, correção,
        anonimização, portabilidade, informação sobre compartilhamento e a
        eliminação dos seus dados, além de revogar consentimentos. Quem é atleta
        deve falar primeiro com a organização do evento.
      </p>

      <h2>9. Segurança</h2>
      <p>
        Senhas são guardadas com criptografia, os links de recuperação e convite
        são de uso único e expiram, e há limite de tentativas de entrada. Nenhum
        sistema é totalmente imune; avise-nos se notar algo estranho.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Usamos apenas um cookie essencial para manter você conectado. Não usamos
        cookies de publicidade.
      </p>

      <h2>11. Contato</h2>
      <p>
        Encarregado pelo tratamento de dados e pedidos:{" "}
        <strong>[e-mail do encarregado a definir]</strong>.
      </p>
    </>
  );
}
