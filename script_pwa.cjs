const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Settings - add install PWA button
const settingsPattern = /<h3 className="text-lg font-bold mb-4 flex items-center gap-2">\s*<Settings className="w-5 h-5 text-primary"\s*\/>\s*Sistema\s*<\/h3>/;
const pwaBlock = `<h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Sistema
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900">Instalar Aplicativo (PWA)</h4>
                  <p className="text-sm text-slate-500 max-w-sm">Adicione o Gerente Imobiliário à tela inicial do seu dispositivo para acesso rápido, experiência em tela cheia e offline.</p>
                </div>
                <Button 
                  onClick={async () => {
                    const { installPWA } = await import('./pwa');
                    await installPWA();
                  }}
                  className="w-full md:w-auto bg-slate-900 text-white"
                >
                  Instalar App
                </Button>
              </div>
            </div>`;

code = code.replace(settingsPattern, pwaBlock);
fs.writeFileSync('src/App.tsx', code);
console.log("Replaced settings pwa block");
