import React, { useState } from "react";
import { Scale, FileText, ChevronRight, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const LegalDocsView = () => {
  const [openDoc, setOpenDoc] = useState<"terms" | "privacy" | null>(null);

  const docs = [
    {
      id: "terms",
      title: "Termos de Responsabilidade e Uso",
      icon: <Scale className="w-5 h-5 text-indigo-500" />
    },
    {
      id: "privacy",
      title: "Políticas de Privacidade",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />
    }
  ] as const;

  return (
    <div className="pt-6 flex justify-center w-full">
      <div className="w-full max-w-sm border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-4">
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos Legais
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => setOpenDoc(doc.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {doc.icon}
                <span className="text-sm font-bold text-slate-800">{doc.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openDoc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden relative"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    {openDoc === "terms" ? <Scale className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {openDoc === "terms" ? "Termos de Uso" : "Políticas de Privacidade"}
                    </h2>
                    <p className="text-xs text-slate-500">Versão Play Store - Atualizada</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenDoc(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white text-sm text-slate-700 leading-relaxed font-medium">
                {openDoc === "terms" ? (
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">1. Aceitação dos Termos</h3>
                      <p>Ao acessar e instalar o aplicativo "Gerente Imobiliário", você concorda em cumprir e estar vinculado a estes Termos de Responsabilidade e Uso. O uso do serviço indica sua aceitação incondicional de todos os termos, necessários para operação em lojas de aplicativos como a Google Play Store.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">2. Responsabilidade pelos Dados</h3>
                      <p>O usuário é o único responsável por todas as informações e dados cadastrados no aplicativo, incluindo, mas não se limitando a: dados de inquilinos, contratos, informações de pagamentos e notas fiscais/comprovantes. O aplicativo funciona como uma ferramenta de gestão e automação imobiliária e não se responsabiliza pela veracidade, conformidade legal ou exatidão das informações fornecidas diretamente pelo usuário.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">3. Funcionalidades e Serviços</h3>
                      <p>O aplicativo oferece funcionalidades para o gerenciamento de recebíveis, painel de controle financeiro, gestão de propriedades e acordos. Tais serviços são prestados "no estado em que se encontram", isentando-se de garantias expressas ou implícitas de adequação para finalidades específicas que vão além da organização documental e financeira primária projetadas.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">4. Assinaturas e Integração com Terceiros</h3>
                      <p>O gerenciamento dos contratos e recibos gerados dentro do sistema que possam ser interligados a serviços e APIs de terceiros (como Google Drive ou Calendar) estão sujeitos aos termos operacionais destes parceiros diretos. O aplicativo não garante a disponibilidade ininterrupta dos servidores externos ou mudanças em suas permissões padrão.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">5. Isenção de Ganhos Fiscais/Jurídicos</h3>
                      <p>Lembramos que a plataforma e o "Hub Estratégico AI" não oferecem planejamento contábil, consultoria legal ou serviço jurídico validado. As dicas, gerações de textos e auditorias providas têm propósitos puramente informativos de triagem, cabendo ao usuário revisar documentos localmente de acordo com a Lei do Inquilinato aplicável de sua jurisdição antes de validá-los comercialmente.</p>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">1. Coleta de Informações</h3>
                      <p>Coletamos as informações fornecidas por você durante o cadastro e o uso do aplicativo de gestão imobiliária, o que engloba dados de autenticação (Nome, Email do provedor) e informações ativamente inseridas no espaço de dados: valores de imóveis, perfis de locatários e histórico de contas.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">2. Uso e Segurança dos Dados (Cloud)</h3>
                      <p>Seus dados são armazenados de forma criptografada nos servidores em nuvem, garantindo acessibilidade entre seus dispositivos autênticos (Web, Android, iOS). O acesso ao respectivo banco de dados subjacente requer autenticação restrita via token verificado. Esses serviços servem integralmente para compor seus painéis financeiros, relatórios e cópias de segurança.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">3. Uso de APIs e Compartilhamento com Terceiros</h3>
                      <p>De forma imperativa, <strong>não vendemos ou alugamos as informações operacionais ou de locatários a empresas terceiras de marketing</strong>. A transferência de conteúdos é permitida apenas em operações de exportações diretas escolhidas por você (como Upload a nuvens externas integradas) e tráfego HTTPS criptografado com nossos provedores de IA generativa essenciais para a utilidade nativa.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">4. Exclusão de Retenção de Dados</h3>
                      <p>Na aba "Gerenciar Acordos" e em todas as tabelas (Inquilinos/Imóveis) e configurações do perfil, você detém livre controle sobre modificações lógicas e exclusão permanente de certas faturas financeiras submetidas. Na área de Configurações está disponível a opção "Excluir Minha Conta", que descarta seus identificadores e acessos integralmente dos bancos autênticos primários para encerramento completo.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base text-slate-900 mb-2">5. Permissões de Dispositivo</h3>
                      <p>Conforme os padrões operacionais regulamentares (Android Play Store), quando exigido por ações originadas por você — como realizar o upload de documentos de vistoria em Câmera ou envio de recibos no formato PDF —, o sistema poderá requisitar acesso nativo explícito à sua Câmera e Armazenamento/Arquivos Locais. Esse acesso é processado em tempo de execução focal não constituindo captura oculta nem transferências ininterruptas latentes.</p>
                    </section>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button
                  onClick={() => setOpenDoc(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
