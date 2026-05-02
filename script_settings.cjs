const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /return \(\s*<div className="space-y-8">\s*<header>\s*<h1 className="text-3xl font-bold tracking-tight">Configurações<\/h1>[\s\S]*?<\/div>\s*\);\s*};\s*const CloudManager/g;

const newCode = `  const [isAgreementsOpen, setIsAgreementsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie sua conta, aplicativos e integrações do sistema.</p>
      </header>

      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200">
          <div className="p-6 bg-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* User Profile */}
            <div className="flex-1 flex items-center gap-4">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 text-lg leading-tight">{user?.displayName || 'Administrador'}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setIsEditingProfile(true)}>Editar Perfil</Button>
                </div>
              </div>
            </div>
            
            <div className="w-full sm:w-auto h-px sm:h-auto sm:w-px bg-slate-100 self-stretch my-2 sm:my-0"></div>
            
            {/* Segurança */}
            <div className="flex-1 space-y-4 w-full sm:w-auto">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500"/> Segurança da Conta</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Senha de Confirmação</p>
                    <p className="text-[10px] text-slate-500">Para ações sensíveis.</p>
                  </div>
                  {isChangingPassword ? (
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        className="h-8 w-24 text-xs" 
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                      />
                      <Button size="sm" className="h-8 text-[10px]" onClick={() => {
                        setSecurityPassword(newPasswordInput);
                        setIsChangingPassword(false);
                        toast.success('Senha atualizada!');
                      }}>Salvar</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => setIsChangingPassword(true)}>Alterar</Button>
                  )}
                </div>
                <Button variant="danger" size="sm" onClick={() => auth.signOut()} className="w-full font-bold h-9">Sair do Gerente Imobiliário</Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-6 border border-slate-200 flex flex-col items-start text-left">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-900">
              <MonitorSmartphone className="w-5 h-5 text-indigo-500" /> Aplicativo
            </h3>
            <p className="text-sm text-slate-500 mb-6 flex-1 w-full text-left">Adicione à tela inicial para ter acesso rápido, ícone no celular e navegação otimizada em tela cheia.</p>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10"
              onClick={async () => {
                const { installPWA } = await import('./pwa');
                const success = await installPWA();
                if (success) toast.success('Ação concluída!');
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Instalar / Atualizar
            </Button>
          </Card>

          <Card className="p-6 border border-slate-200 flex flex-col items-start text-left">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-900">
              <Cloud className="w-5 h-5 text-emerald-500" /> Integração Google Drive
            </h3>
            <p className="text-sm text-slate-500 mb-6 flex-1 w-full text-left">
              {isDriveConnected ? 'Status: Conectado. O sistema pode ler e salvar comprovantes e recibos.' : 'Conecte para salvar e visualizar arquivos de forma segura.'}
            </p>
            {!isDriveConnected ? (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10" onClick={onConnectDrive}>
                <Cloud className="w-4 h-4 mr-2" /> Conectar Google Drive
              </Button>
            ) : (
              <Button className="w-full font-bold h-10" variant="outline" onClick={onDisconnectDrive}>
                <CloudOff className="w-4 h-4 mr-2"/> Desconectar Drive
              </Button>
            )}
            {driveError && <p className="text-[10px] text-red-500 mt-2 font-medium bg-red-50 p-2 rounded-lg w-full text-left">{driveError}</p>}
          </Card>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <button 
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            onClick={() => setIsAgreementsOpen(!isAgreementsOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-slate-900">Gerenciar Acordos</h3>
                <p className="text-xs text-slate-500">{agreements.length} contrato(s) registrado(s)</p>
              </div>
            </div>
            <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isAgreementsOpen && "rotate-180")}/>
          </button>
          <AnimatePresence>
            {isAgreementsOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                  <div className="space-y-3 mt-4">
                    {agreements.length > 0 ? (
                      agreements.map(a => {
                        const prop = properties.find(p => p.id === a.propertyId);
                        const tenant = tenants.find(t => t.id === a.tenantId);
                        return (
                          <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{a.description}</h4>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{prop?.name} • {tenant?.name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={cn(
                                  "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
                                  a.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                )}>
                                  {a.status === 'active' ? 'Ativo' : 'Arquivado'}
                                </span>
                                {a.thumbnailLink && (
                                  <img 
                                    src={a.thumbnailLink} 
                                    className="w-6 h-6 rounded object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform" 
                                    alt="Preview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage = (a.evidence || a.evidenceLocation)?.match(/\.(jpeg|jpg|gif|png)$/i) || a.thumbnailLink;
                                      setPreviewReceipt({ url: (a.evidence || a.evidenceLocation)!, name: \`Evidência - \${a.description}\`, isImage: !!isImage });
                                    }}
                                  />
                                )}
                                {a.evidence && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage = a.evidence?.match(/\.(jpeg|jpg|gif|png)$/i) || a.thumbnailLink;
                                      setPreviewReceipt({ url: a.evidence!, name: \`Evidência - \${a.description}\`, isImage: !!isImage });
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                                  >
                                    <ImageIcon className="w-3 h-3" /> Ver Evidência
                                  </button>
                                )}
                                {a.evidenceLocation && (
                                  <div className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                    <MapPin className="w-3 h-3" />
                                    {a.evidenceLocation.startsWith('http') ? (
                                      <a href={a.evidenceLocation} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">Link Externo</a>
                                    ) : <span>{a.evidenceLocation}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9" onClick={() => handleActionClick('edit', a)}><Edit className="w-4 h-4 mx-auto" /></Button>
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleActionClick('archive', a)}><Archive className="w-4 h-4 mx-auto" /></Button>
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleActionClick('delete', a)}><Trash2 className="w-4 h-4 mx-auto" /></Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-6">Nenhum acordo encontrado.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="p-4 border border-destructive/20 bg-red-50 flex items-center justify-between sm:flex-row flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto text-left">
            <div className="p-2 bg-white text-destructive rounded-lg border border-red-100 shrink-0"><Trash2 className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Reset de Dados do Sistema</h3>
              <p className="text-[10px] text-destructive/70 font-medium">Exclui permanentemente todos os registros vinculados à sua conta.</p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setIsResetModalOpen(true)} className="whitespace-nowrap w-full sm:w-auto font-bold shrink-0 shadow-sm h-9">
            <AlertCircle className="w-4 h-4 mr-1.5" /> Limpar Dados
          </Button>
        </Card>
        
        <div className="pt-6 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-10 h-10 flex items-center justify-center mb-2">
            <LogoSVG className="w-8 h-8 opacity-75" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gerente Imobiliário</p>
          <p className="text-[10px] font-medium text-slate-400 mt-1">Versão 4.1.0 <span className="mx-1.5 opacity-50">•</span> 01/05/2026</p>
        </div>

      </div>

      <Modal isOpen={isEditingProfile} onClose={() => setIsEditingProfile(false)} title="Editar Perfil">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome de Exibição</label>
            <Input id="profile-name" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL da Foto de Perfil</label>
            <Input id="profile-photo" value={profilePhoto} onChange={e => setProfilePhoto(e.target.value)} placeholder="https://exemplo.com/foto.jpg" />
            <p className="text-[10px] text-muted-foreground">Insira o link para uma imagem pública para usar como foto de perfil.</p>
          </div>
          <div className="pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditingProfile(false)} disabled={isUpdatingProfile}>Cancelar</Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

const CloudManager`;

const updatedCode = code.replace(regex, newCode);
if (code === updatedCode) {
  console.log('Regex did NOT match');
} else {
  fs.writeFileSync('src/App.tsx', updatedCode);
  console.log('Done replacement');
}
